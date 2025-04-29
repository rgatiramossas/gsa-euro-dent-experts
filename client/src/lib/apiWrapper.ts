import offlineDb from './offlineDb';
import { checkNetworkStatus } from './pwaManager';

// Tipos de método HTTP
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Objeto de configuração para requisições
interface ApiRequestConfig {
  url: string;
  method: HttpMethod;
  data?: any;
  headers?: Record<string, string>;
  enableOffline?: boolean; // Ativar suporte offline
  offlineTableName?: string; // Nome da tabela no banco offline
}

// Função para mapear URL da API para tabela local
function mapApiUrlToTable(url: string): string | null {
  // Extrair o caminho de API sem parâmetros ou IDs específicos
  const apiPath = url.split('/').filter(Boolean);
  
  if (apiPath.length === 0 || apiPath[0] !== 'api') {
    return null;
  }
  
  // Obter o segundo segmento (após 'api/')
  const resourceName = apiPath[1];
  
  // Mapear nome do recurso para nome da tabela
  const tableMappings: Record<string, string | null> = {
    'clients': 'clients',
    'vehicles': 'vehicles',
    'services': 'services',
    'budgets': 'budgets',
    'users': 'technicians',
    'technicians': 'technicians',
    'service_types': 'service_types',
    'auth': null, // Não suporta offline
    // Adicionar mais mapeamentos conforme necessário
  };
  
  return tableMappings[resourceName] || null;
}

// Função para extrair ID do recurso da URL
function extractResourceId(url: string): number | null {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Verificar se o último segmento é um número
  if (/^\d+$/.test(lastPart)) {
    return parseInt(lastPart, 10);
  }
  
  return null;
}

// Função principal para fazer requisições API com suporte offline
export async function apiRequest<T>({
  url,
  method,
  data,
  headers = {},
  enableOffline = true,
  offlineTableName
}: ApiRequestConfig): Promise<T> {
  // Determinar se estamos online
  const isOnline = checkNetworkStatus();
  
  // Algumas operações não devem ser processadas offline
  const isAuthOperation = url.includes('/api/auth/');
  const offlineDisabled = !enableOffline || isAuthOperation;
  
  // Identificar a tabela local correspondente para operações offline
  const tableName = offlineTableName || mapApiUrlToTable(url);
  const resourceId = extractResourceId(url);
  
  // Se offline e o suporte offline está habilitado para esta operação
  if (!isOnline && !offlineDisabled && tableName) {
    try {
      console.log(`Operação offline: ${method} ${url}`);
      
      // Operações baseadas no método HTTP
      if (method === 'GET') {
        if (resourceId !== null) {
          // GET de um item específico
          return await offlineDb.getItem(tableName, resourceId, url) as unknown as T;
        } else {
          // GET de uma coleção (com possíveis filtros)
          const urlObj = new URL(window.location.origin + url);
          const params = Object.fromEntries(urlObj.searchParams.entries());
          const page = params.page ? parseInt(params.page as string, 10) : 1;
          const limit = params.limit ? parseInt(params.limit as string, 10) : 50;
          
          // Remover parâmetros de paginação dos filtros
          const { page: _, limit: __, ...filters } = params;
          
          return await offlineDb.listItems(tableName, url, page, limit, filters) as unknown as T;
        }
      } 
      else if (method === 'POST') {
        // Criar novo item
        const id = await offlineDb.addItem(tableName, data, url);
        return { id, ...data } as unknown as T;
      } 
      else if (method === 'PUT') {
        // Atualizar item existente
        if (resourceId === null) {
          throw new Error(`Não foi possível extrair ID da URL para atualização: ${url}`);
        }
        
        await offlineDb.updateItem(tableName, resourceId, data, url);
        return { id: resourceId, ...data } as unknown as T;
      } 
      else if (method === 'DELETE') {
        // Excluir item
        if (resourceId === null) {
          throw new Error(`Não foi possível extrair ID da URL para exclusão: ${url}`);
        }
        
        await offlineDb.deleteItem(tableName, resourceId, url);
        return { success: true } as unknown as T;
      }
      
      throw new Error(`Método não suportado offline: ${method}`);
    } catch (error) {
      console.error("Erro durante operação offline:", error);
      throw error;
    }
  }
  
  // Online ou operação não suportada offline
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Sincronizar com o banco de dados offline quando online, para operações GET
    if (isOnline && method === 'GET' && tableName && enableOffline) {
      try {
        const responseData = await response.json();
        
        // Para GET de item único
        if (resourceId !== null) {
          // Atualizar o item no banco local
          await offlineDb.getTableByName(tableName).put({
            ...responseData,
            last_sync: Date.now()
          });
        } 
        // Para GET de coleções
        else if (responseData && responseData.data && Array.isArray(responseData.data)) {
          // Batch update dos itens no banco local
          await Promise.all(
            responseData.data.map((item: any) => 
              offlineDb.getTableByName(tableName).put({
                ...item,
                last_sync: Date.now()
              })
            )
          );
        }
        
        return responseData as T;
      } catch (error) {
        console.error("Erro ao sincronizar dados online com cache local:", error);
        // Continuar e retornar o resultado da API mesmo se a sincronização falhar
      }
    }
    
    // Para DELETE, pode retornar vazio
    if (method === 'DELETE' && response.status === 204) {
      return { success: true } as unknown as T;
    }
    
    try {
      return await response.json();
    } catch (e) {
      // Se não puder parsear como JSON, retornar objeto vazio
      return {} as T;
    }
  } catch (error) {
    // Se falhou online, mas temos suporte offline e não é uma operação de autenticação
    if (enableOffline && tableName && !isAuthOperation) {
      // Tenta buscar do cache local
      if (method === 'GET' && resourceId !== null) {
        try {
          const cachedItem = await offlineDb.getTableByName(tableName).get(resourceId);
          if (cachedItem) {
            console.log(`Usando dados em cache para ${url}`);
            return cachedItem as unknown as T;
          }
        } catch (e) {
          console.error("Erro ao buscar do cache local:", e);
        }
      }
      
      // Se não for GET, registra a operação para execução posterior
      if (method !== 'GET') {
        try {
          if (method === 'POST') {
            const id = await offlineDb.addItem(tableName, data, url);
            return { id, ...data, _offline: true } as unknown as T;
          } 
          else if (method === 'PUT' && resourceId !== null) {
            await offlineDb.updateItem(tableName, resourceId, data, url);
            return { id: resourceId, ...data, _offline: true } as unknown as T;
          } 
          else if (method === 'DELETE' && resourceId !== null) {
            await offlineDb.deleteItem(tableName, resourceId, url);
            return { success: true, _offline: true } as unknown as T;
          }
        } catch (e) {
          console.error("Erro ao processar operação para modo offline:", e);
        }
      }
    }
    
    // Se chegamos aqui, não foi possível recuperar de nenhuma forma
    throw error;
  }
}

// Funções auxiliares para facilitar o uso

export function getApi<T>(url: string, config: Omit<ApiRequestConfig, 'url' | 'method'> = {}): Promise<T> {
  return apiRequest<T>({ ...config, url, method: 'GET' });
}

export function postApi<T>(url: string, data: any, config: Omit<ApiRequestConfig, 'url' | 'method' | 'data'> = {}): Promise<T> {
  return apiRequest<T>({ ...config, url, method: 'POST', data });
}

export function putApi<T>(url: string, data: any, config: Omit<ApiRequestConfig, 'url' | 'method' | 'data'> = {}): Promise<T> {
  return apiRequest<T>({ ...config, url, method: 'PUT', data });
}

export function deleteApi<T>(url: string, config: Omit<ApiRequestConfig, 'url' | 'method'> = {}): Promise<T> {
  return apiRequest<T>({ ...config, url, method: 'DELETE' });
}
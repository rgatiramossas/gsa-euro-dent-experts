import { offlineDb, addItemOffline, updateItemOffline, deleteItemOffline } from './offlineDb';

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
  const tableMappings: Record<string, string> = {
    'clients': 'clients',
    'vehicles': 'vehicles',
    'services': 'services',
    'budgets': 'budgets',
    'users': 'technicians',
    'events': 'events',
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
  const isOnline = navigator.onLine;
  
  // Se offline e habilitado para suporte offline
  if (!isOnline && enableOffline) {
    // Identificar a tabela local correspondente
    const tableName = offlineTableName || mapApiUrlToTable(url);
    
    if (!tableName) {
      throw new Error(`Não foi possível determinar a tabela offline para a URL: ${url}`);
    }
    
    // Obter referência para a tabela no Dexie
    const table = (offlineDb as any)[tableName];
    
    if (!table) {
      throw new Error(`Tabela offline não encontrada: ${tableName}`);
    }
    
    // Operações baseadas no método HTTP
    if (method === 'GET') {
      // Para GET em coleções
      if (!url.includes('/api/') || url.endsWith('/')) {
        return table.toArray() as Promise<T>;
      }
      
      // Para GET em item específico
      const id = extractResourceId(url);
      if (id !== null) {
        const item = await table.get(id);
        if (!item) {
          throw new Error(`Item com ID ${id} não encontrado offline`);
        }
        return item as unknown as T;
      }
    } 
    else if (method === 'POST') {
      // Criar novo item
      return addItemOffline(table, data, tableName) as unknown as Promise<T>;
    } 
    else if (method === 'PUT') {
      // Atualizar item existente
      const id = extractResourceId(url);
      if (id === null) {
        throw new Error(`Não foi possível extrair ID da URL para atualização: ${url}`);
      }
      await updateItemOffline(table, id, data, tableName);
      return data as T;
    } 
    else if (method === 'DELETE') {
      // Excluir item
      const id = extractResourceId(url);
      if (id === null) {
        throw new Error(`Não foi possível extrair ID da URL para exclusão: ${url}`);
      }
      await deleteItemOffline(table, id, tableName);
      return { success: true } as unknown as T;
    }
    
    throw new Error(`Método não suportado offline: ${method}`);
  }
  
  // Caso esteja online, proceder com a requisição normal
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
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
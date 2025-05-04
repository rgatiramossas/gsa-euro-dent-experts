// Versão online-only - PWA removido

// Tipos de método HTTP
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Objeto de configuração para requisições
interface ApiRequestConfig {
  url: string;
  method: HttpMethod;
  data?: any;
  headers?: Record<string, string>;
  // Parâmetros de offline removidos mas mantidos para compatibilidade
  enableOffline?: boolean; 
  offlineTableName?: string;
}

// Extrair ID do recurso da URL (mantido para compatibilidade)
function extractResourceId(url: string): number | null {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Verificar se o último segmento é um número
  if (/^\d+$/.test(lastPart)) {
    return parseInt(lastPart, 10);
  }
  
  return null;
}

// Armazenar uma função de atualização de sessão que será definida pelo AuthContext
let sessionRefreshFunction: (() => Promise<void>) | null = null;
let isRefreshingSession = false;

// Função para definir a função de atualização de sessão
export function setSessionRefreshFunction(refreshFn: () => Promise<void>) {
  sessionRefreshFunction = refreshFn;
}

// Função para tentar renovar a sessão
async function tryRefreshSession() {
  if (sessionRefreshFunction && !isRefreshingSession) {
    isRefreshingSession = true;
    try {
      await sessionRefreshFunction();
    } catch (error) {
      console.error("Falha ao renovar sessão:", error);
    } finally {
      isRefreshingSession = false;
    }
  }
}

// Função principal para fazer requisições API - versão apenas online
export async function apiRequest<T>({
  url,
  method,
  data,
  headers = {},
  // Estes parâmetros são ignorados mas mantidos para compatibilidade
  enableOffline = false, 
  offlineTableName
}: ApiRequestConfig): Promise<T> {
  // Verificação simplificada de conexão
  const isOnline = navigator.onLine;
  console.log(`[apiRequest] Status da rede para ${method} ${url}: ${isOnline ? 'Online' : 'Offline'}`);
  
  if (!isOnline) {
    console.error(`[apiRequest] Operação ${method} ${url} rejeitada: aplicação requer conexão com a internet`);
    throw new Error('Esta operação requer conexão com a internet.');
  }
  
  const isAuthOperation = url.includes('/api/auth/');
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });
    
    // Verificar se é erro de autenticação
    if (response.status === 401 && !isAuthOperation) {
      // Tentar renovar a sessão e tentar novamente
      await tryRefreshSession();
      
      // Tentar novamente a requisição após renovar a sessão
      const retryResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (!retryResponse.ok) {
        throw new Error(`API error: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      
      if (method === 'DELETE' && retryResponse.status === 204) {
        return { success: true } as unknown as T;
      }
      
      try {
        return await retryResponse.json();
      } catch (e) {
        return {} as T;
      }
    }
    
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
  } catch (error) {
    // Se chegamos aqui, não foi possível recuperar de nenhuma forma
    console.error(`[apiRequest] Erro ao processar requisição ${method} ${url}:`, error);
    throw error;
  }
}

// Funções auxiliares para facilitar o uso

export function getApi<T>(url: string, config: Omit<ApiRequestConfig, 'url' | 'method'> = {}): Promise<T> {
  // Parâmetros de offline ignorados mas mantidos para compatibilidade
  return apiRequest<T>({ ...config, url, method: 'GET' });
}

export function postApi<T>(url: string, data: any, config: Omit<ApiRequestConfig, 'url' | 'method' | 'data'> = {}): Promise<T> {
  // Parâmetros de offline ignorados mas mantidos para compatibilidade
  return apiRequest<T>({ ...config, url, method: 'POST', data });
}

export function putApi<T>(url: string, data: any, config: Omit<ApiRequestConfig, 'url' | 'method' | 'data'> = {}): Promise<T> {
  // Parâmetros de offline ignorados mas mantidos para compatibilidade
  return apiRequest<T>({ ...config, url, method: 'PUT', data });
}

export function deleteApi<T>(url: string, config: Omit<ApiRequestConfig, 'url' | 'method'> = {}): Promise<T> {
  // Parâmetros de offline ignorados mas mantidos para compatibilidade
  return apiRequest<T>({ ...config, url, method: 'DELETE' });
}
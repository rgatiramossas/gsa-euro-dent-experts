import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as offlineApiRequest, getApi, postApi, putApi, deleteApi, patchApi } from "./apiWrapper";

// Classe de erro customizada que inclui detalhes da resposta
export class ApiError extends Error {
  status: number;
  response: Response;
  data: any;

  constructor(status: number, message: string, response: Response, data: any = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
    this.data = data;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData = null;
    let errorMessage = res.statusText;
    
    try {
      // Tentar analisar o corpo da resposta como JSON
      if (res.headers.get("content-type")?.includes("application/json")) {
        errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
      } else {
        errorMessage = await res.text() || errorMessage;
      }
    } catch (e) {
      // Se falhar ao analisar JSON, usar o texto bruto
      try {
        errorMessage = await res.text() || errorMessage;
      } catch {
        // Usar o statusText se não conseguir ler o corpo
        errorMessage = res.statusText;
      }
    }
    
    throw new ApiError(res.status, errorMessage, res, errorData);
  }
}

// Re-export de funções do apiWrapper para uso conveniente
export { getApi, postApi, putApi, deleteApi, patchApi };

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
  options?: { params?: Record<string, string>; enableOffline?: boolean; offlineTableName?: string }
): Promise<any> {
  let finalUrl = url;
  
  // Adiciona parâmetros de consulta, se houver
  if (options?.params) {
    const queryParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      finalUrl = `${url}?${queryString}`;
    }
  }
  
  // Usar o wrapper de API com suporte offline
  try {
    // Opções para offline
    const offlineOptions = {
      enableOffline: options?.enableOffline !== false, // Padrão é true
      offlineTableName: options?.offlineTableName
    };
    
    // Usar a função apropriada do wrapper de API de acordo com o método
    switch (method.toUpperCase()) {
      case 'GET':
        return await getApi(finalUrl, offlineOptions);
      case 'POST':
        return await postApi(finalUrl, data, offlineOptions);
      case 'PUT':
        return await putApi(finalUrl, data, offlineOptions);
      case 'DELETE':
        return await deleteApi(finalUrl, offlineOptions);
      case 'PATCH':
        return await patchApi(finalUrl, data, offlineOptions);
      default:
        // Para métodos não suportados, usar a implementação padrão
        const res = await fetch(finalUrl, {
          method,
          headers: data ? { "Content-Type": "application/json" } : {},
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        await throwIfResNotOk(res);
        
        return method === 'DELETE' && res.status === 204 ? true : await res.json();
    }
  } catch (error) {
    // Se for erro da nossa API offline, lançar como ApiError
    if (error instanceof Error) {
      const status = (error as any).status || 500;
      const message = error.message || 'Erro na requisição';
      throw new ApiError(status, message, null as any, null);
    }
    throw error;
  }
}

// Função para requisições GET com suporte offline
export function getQueryFn<TQueryFnData = unknown>({ on401 }: { on401: "returnNull" | "throw" }) {
  return async ({ queryKey }: any): Promise<TQueryFnData> => {
    try {
      // O primeiro elemento é a URL, os outros podem ser parâmetros de configuração
      const url = queryKey[0];
      
      // Verificar se o segundo elemento é um objeto de configuração para suporte offline
      const config = queryKey.length > 1 && typeof queryKey[1] === 'object' 
        ? queryKey[1] as { enableOffline?: boolean; offlineTableName?: string }
        : {};
      
      // Usar o wrapper offline para GET
      const result = await getApi<TQueryFnData>(url, config);
      return result;
    } catch (error) {
      // Verificar erro de autenticação
      if (error instanceof ApiError && error.status === 401) {
        if (on401 === "returnNull") {
          // Usar o tipo assertivo para resolver o problema de tipo
          return null as unknown as TQueryFnData;
        }
      }
      
      // Propagar outros erros
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não definir queryFn padrão devido a problemas de tipagem
      // Use getApi diretamente nas consultas quando necessário
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

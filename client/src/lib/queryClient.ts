import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as offlineApiRequest, getApi, postApi, putApi, deleteApi } from "./apiWrapper";

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

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
  options?: { params?: Record<string, string> }
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
  
  const res = await fetch(finalUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Para o caso de DELETE, que pode não retornar JSON
  if (method === 'DELETE') {
    if (res.status === 204) {
      return true; // No content
    }
    return res.status < 400; // Success if status is < 400
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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

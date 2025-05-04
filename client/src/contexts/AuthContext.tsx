import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postApi, getApi, setSessionRefreshFunction } from "@/lib/apiWrapper";

// Simple function to check if we're online
const checkNetworkStatus = () => navigator.onLine;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUser: (user: AuthUser) => void;
  refreshSession: () => Promise<void>; // Nova função para renovar a sessão
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Check if user is already logged in
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const result = await getApi('/api/auth/me');
        return result;
      } catch (error: any) {
        if (error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos, em vez de Infinity para verificar a sessão periodicamente
    refetchOnWindowFocus: true // Verificar a sessão quando a janela recebe foco
  });

  // Set user data when it loads
  useEffect(() => {
    if (data && typeof data === 'object' && 'id' in data && 'username' in data) {
      const authUser = data as AuthUser;
      setUser(authUser);
      
      // Quando os dados são carregados com sucesso, salvar no localStorage 
      // para manter autenticação offline
      localStorage.setItem('user', JSON.stringify(authUser));
    } else if (!isLoading && !error && data === null) {
      // Se a API retornou explicitamente null, o usuário não está autenticado
      setUser(null);
      localStorage.removeItem('user');
    }
  }, [data, isLoading, error]);

  // Verificar localStorage ao inicializar (usado apenas para re-hidratar estado, não para login offline)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && !user) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Não definimos o usuário diretamente, apenas usamos para refetch
        queryClient.setQueryData(['/api/auth/me'], parsedUser);
        
        // Sempre validar a sessão no servidor
        refetch();
      } catch (err) {
        console.error('Erro ao recuperar usuário do localStorage:', err);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Função para renovar a sessão manualmente
  const refreshSession = async (): Promise<void> => {
    if (isSessionRefreshing) return;
    
    console.log("[AuthContext] Iniciando renovação de sessão...");
    setIsSessionRefreshing(true);
    
    try {
      // Tentar obter dados atualizados do usuário do servidor com uma nova requisição direta
      // ao invés de usar refetch, para garantir que estamos fazendo um novo request
      console.log("[AuthContext] Enviando requisição para /api/auth/me");
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      });
      
      console.log("[AuthContext] Resposta recebida:", response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log("[AuthContext] Sessão inválida (401)");
          throw new Error("Sessão expirada");
        } else {
          console.log("[AuthContext] Erro na resposta:", response.statusText);
          throw new Error(`Erro ao renovar sessão: ${response.statusText}`);
        }
      }
      
      const userData = await response.json();
      console.log("[AuthContext] Dados do usuário recebidos:", userData);
      
      if (!userData || !userData.id) {
        console.log("[AuthContext] Dados do usuário inválidos");
        throw new Error("Dados do usuário inválidos");
      }
      
      // Atualizar o cache do React Query
      queryClient.setQueryData(['/api/auth/me'], userData);
      // E também atualizar o estado local
      setUser(userData);
      console.log("[AuthContext] Sessão renovada com sucesso");
      
    } catch (error) {
      console.error("[AuthContext] Erro ao renovar sessão:", error);
      
      // Limpar a sessão em caso de erro
      setUser(null);
      localStorage.removeItem('user');
      queryClient.setQueryData(['/api/auth/me'], null);
      
      // Se estivermos em uma página que requer autenticação,
      // vamos redirecionar para o login
      if (window.location.pathname !== '/login') {
        console.log("[AuthContext] Redirecionando para login após falha na renovação da sessão");
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    } finally {
      setIsSessionRefreshing(false);
    }
  };
  
  // Registrar a função refreshSession para ser usada pelo apiWrapper
  useEffect(() => {
    setSessionRefreshFunction(refreshSession);
    
    return () => {
      // Limpar a referência na desmontagem do componente
      setSessionRefreshFunction(() => Promise.resolve());
    };
  }, [refreshSession]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { 
      username: string; 
      password: string;
      rememberMe?: boolean;
    }) => {
      // Enviar requisição de login para o servidor
      const result = await postApi<AuthUser>('/api/auth/login', credentials);
      return result;
    },
    onSuccess: (userData: AuthUser, variables) => {
      setUser(userData);
      queryClient.setQueryData(['/api/auth/me'], userData);
      
      // Salvar no localStorage apenas para manter a sessão entre recarregamentos de página
      // não para uso offline
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Invalidar caches para recarregar dados com a nova sessão
      queryClient.invalidateQueries();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sempre enviar requisição ao servidor
      await postApi('/api/auth/logout', {});
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      // Limpar localStorage ao fazer logout
      localStorage.removeItem('user');
    },
    onError: (error) => {
      // Se ocorrer erro durante logout, limpar dados locais de qualquer forma
      console.error("Erro durante logout:", error);
      setUser(null);
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      localStorage.removeItem('user');
    }
  });

  const login = async (username: string, password: string, rememberMe: boolean = false): Promise<AuthUser> => {
    // Modo offline não suportado mais - sempre requer conexão
    if (!navigator.onLine) {
      throw new Error("Não é possível fazer login sem conexão à internet. Verifique sua conexão e tente novamente.");
    }
    
    // Usar a mutação normal para login online
    const userData = await loginMutation.mutateAsync({ username, password, rememberMe }) as AuthUser;
    
    // Garantir que a sessão foi estabelecida verificando novamente após 1 segundo
    // Isso ajuda a lidar com problemas de sincronização de sessão
    setTimeout(async () => {
      await refreshSession();
    }, 1000);
    
    return userData;
  };

  const logout = async (): Promise<void> => {
    return logoutMutation.mutateAsync();
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    queryClient.setQueryData(['/api/auth/me'], updatedUser);
    
    // Atualizar o localStorage apenas para persistência entre recarregamentos
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Adicionar interceptor global para erros 401
  useEffect(() => {
    const handleUnauthorized = async (event: Event) => {
      const e = event as ErrorEvent;
      if (e.error && typeof e.error === 'object' && 'status' in e.error && e.error.status === 401) {
        // Se ocorrer erro 401 e tivermos um usuário, tentar renovar a sessão
        if (user && !isSessionRefreshing) {
          try {
            await refreshSession();
          } catch (err) {
            // Se a renovação falhar, o refreshSession já limpará o estado
          }
        }
      }
    };

    window.addEventListener('error', handleUnauthorized);
    
    return () => {
      window.removeEventListener('error', handleUnauthorized);
    };
  }, [user, isSessionRefreshing]);
  
  // Verificar periodicamente se a sessão está válida (a cada 5 minutos)
  useEffect(() => {
    if (!user) return; // Não verificar se não houver usuário logado
    
    const checkInterval = setInterval(() => {
      if (!isSessionRefreshing) {
        console.log("Verificando sessão periodicamente...");
        refreshSession().catch(err => {
          console.error("Erro na verificação periódica de sessão:", err);
        });
      }
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [user, isSessionRefreshing]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || isSessionRefreshing,
        error: error as Error | null,
        login,
        logout,
        updateUser,
        refreshSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postApi, getApi } from "@/lib/apiWrapper";
import { checkNetworkStatus } from "@/lib/pwaManager";
import { setSessionRefreshFunction } from "@/lib/apiWrapper";

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

  // Verificar localStorage ao inicializar
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && !user) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        queryClient.setQueryData(['/api/auth/me'], parsedUser);

        // Se estiver online, tentar validar a sessão imediatamente
        if (checkNetworkStatus()) {
          refetch();
        }
      } catch (err) {
        console.error('Erro ao recuperar usuário do localStorage:', err);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Função para renovar a sessão manualmente
  const refreshSession = async (): Promise<void> => {
    if (isSessionRefreshing) return;
    
    setIsSessionRefreshing(true);
    try {
      // Tentar obter dados atualizados do usuário do servidor
      const result = await refetch();
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.data) {
        throw new Error("Sessão expirada");
      }
    } catch (error) {
      console.error("Erro ao renovar sessão:", error);
      
      // Verificar se há um usuário armazenado no localStorage
      const savedUser = localStorage.getItem('user');
      
      if (savedUser && !checkNetworkStatus()) {
        // Se estiver offline e tiver dados no localStorage, continuar com o usuário atual
        console.log("Usando usuário do localStorage para modo offline");
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          queryClient.setQueryData(['/api/auth/me'], parsedUser);
        } catch (err) {
          console.error("Erro ao processar usuário do localStorage:", err);
          // Limpar dados em caso de erro de parsing
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        // Se online ou sem dados no localStorage, limpar a sessão
        setUser(null);
        localStorage.removeItem('user');
        queryClient.setQueryData(['/api/auth/me'], null);
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
      // Usar postApi que é a versão correta para requisições POST com suporte offline
      const result = await postApi<AuthUser>('/api/auth/login', credentials, { enableOffline: false });
      return result;
    },
    onSuccess: (userData: AuthUser, variables) => {
      setUser(userData);
      queryClient.setQueryData(['/api/auth/me'], userData);
      
      // Sempre salvar no localStorage para permitir funcionamento offline
      // Configurar expiração para 48 horas (modo offline) conforme solicitado
      // Se rememberMe estiver ativado, usar 30 dias
      const expiry = variables.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000; // 48 horas
      const userWithExpiry = {
        ...userData,
        expiry: Date.now() + expiry
      };
      localStorage.setItem('user', JSON.stringify(userWithExpiry));
      
      // Invalidar caches para recarregar dados com a nova sessão
      queryClient.invalidateQueries();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) {
        // Se estiver offline, não enviar requisição para o servidor
        console.log("Logout realizado em modo offline");
        return;
      }
      // Se estiver online, enviar requisição normalmente
      await postApi('/api/auth/logout', {}, { enableOffline: false });
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
    // Se estiver offline, verificar se temos dados no localStorage
    if (!checkNetworkStatus()) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // Verificar se o usuário no localStorage corresponde às credenciais
          if (parsedUser.username === username) {
            // Verificar se não está expirado
            if (parsedUser.expiry && Date.now() < parsedUser.expiry) {
              console.log("Login offline bem-sucedido usando dados armazenados");
              setUser(parsedUser);
              queryClient.setQueryData(['/api/auth/me'], parsedUser);
              return parsedUser;
            } else {
              console.log("Dados armazenados expirados");
            }
          }
        } catch (err) {
          console.error("Erro ao processar dados de usuário armazenados:", err);
        }
      }
      throw new Error("Não é possível fazer login no modo offline");
    }
    
    // Se estiver online, usar a mutação normal
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
    
    // Atualizar o localStorage também
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        localStorage.setItem('user', JSON.stringify({
          ...updatedUser,
          expiry: parsedUser.expiry
        }));
      } catch (err) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
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
      if (checkNetworkStatus() && !isSessionRefreshing) {
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

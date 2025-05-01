import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Check if user is already logged in
  const { data, isLoading, error } = useQuery<AuthUser>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: Infinity,
    // Configuração para permitir obter dados do cache quando offline
    networkMode: 'always',
    // Não mostrar erros se a autenticação falhar e estivermos offline
    onError: (err) => {
      // Verificar se estamos offline
      if (!navigator.onLine) {
        console.log('Offline detectado durante verificação de autenticação, ignorando erro');
      } else {
        console.error('Erro ao verificar autenticação:', err);
      }
    }
  });

  // Set user data when it loads
  useEffect(() => {
    if (data) {
      setUser(data);
      
      // Quando os dados são carregados com sucesso, salvar no localStorage 
      // para manter autenticação offline
      localStorage.setItem('user', JSON.stringify(data));
    }
  }, [data]);

  // Verificar localStorage ao inicializar
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && !user) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        queryClient.setQueryData(['/api/auth/me'], parsedUser);
      } catch (err) {
        console.error('Erro ao recuperar usuário do localStorage:', err);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { 
      username: string; 
      password: string;
      rememberMe?: boolean;
    }) => {
      return await apiRequest('/api/auth/login', 'POST', credentials);
    },
    onSuccess: (userData, variables) => {
      setUser(userData);
      queryClient.setQueryData(['/api/auth/me'], userData);
      
      // Se "lembrar-me" estiver marcado, salvar no localStorage
      if (variables.rememberMe) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
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
      await apiRequest('/api/auth/logout', 'POST', {});
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
    if (!navigator.onLine) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          // Verificar se o usuário no localStorage corresponde às credenciais
          if (parsedUser.username === username) {
            console.log("Login offline bem-sucedido usando dados armazenados");
            setUser(parsedUser);
            queryClient.setQueryData(['/api/auth/me'], parsedUser);
            return parsedUser;
          }
        } catch (err) {
          console.error("Erro ao processar dados de usuário armazenados:", err);
        }
      }
      throw new Error("Não é possível fazer login no modo offline");
    }
    
    // Se estiver online, usar a mutação normal
    return loginMutation.mutateAsync({ username, password, rememberMe });
  };

  const logout = async (): Promise<void> => {
    return logoutMutation.mutateAsync();
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    queryClient.setQueryData(['/api/auth/me'], updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: error as Error | null,
        login,
        logout,
        updateUser,
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

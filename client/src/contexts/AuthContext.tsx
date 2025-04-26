import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
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
  });

  // Set user data when it loads
  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return await apiRequest('/api/auth/login', 'POST', credentials);
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.setQueryData(['/api/auth/me'], userData);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/auth/logout', 'POST', {});
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string): Promise<AuthUser> => {
    return loginMutation.mutateAsync({ username, password });
  };

  const logout = async (): Promise<void> => {
    return logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: error as Error | null,
        login,
        logout,
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

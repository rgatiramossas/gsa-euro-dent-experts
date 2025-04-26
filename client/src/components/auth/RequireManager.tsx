import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// Componente que verifica se o usuário é gestor ou admin para acessar rotas específicas
export function RequireManager({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Verifica se o usuário está logado e é gestor ou admin
  const isManagerOrAdmin = user && (user.role === "gestor" || user.role === "admin");

  if (!isManagerOrAdmin) {
    // Redireciona para o dashboard se não for gestor nem admin
    setTimeout(() => {
      setLocation("/dashboard");
    }, 0);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md max-w-lg w-full">
          <h2 className="text-lg font-medium mb-2">Acesso Restrito</h2>
          <p>
            Esta área é restrita para gestores e administradores.
            Você será redirecionado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
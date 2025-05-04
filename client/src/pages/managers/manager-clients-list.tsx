import React, { useEffect } from "react";
import { useLocation } from "wouter";
import ClientsList from "@/pages/clients/index";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

/**
 * Componente wrapper para exibir os clientes de um gestor específico
 */
const ManagerClientsList: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
      return;
    }
    
    // Verificar se o usuário é admin ou gestor
    if (!isLoading && isAuthenticated && user?.role !== "admin" && user?.role !== "gestor" && user?.role !== "manager") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, user, setLocation]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "gestor" && user?.role !== "manager")) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-1">
        <main className="flex-1 overflow-auto pb-16">
          <ClientsList managerMode={true} />
        </main>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default ManagerClientsList;
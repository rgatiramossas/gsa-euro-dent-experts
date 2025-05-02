import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function RequireTechnician({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "technician" && user.role !== "admin"))) {
      // Redireciona para o dashboard se não for técnico ou admin
      // Admins têm acesso a tudo, então não bloqueamos eles
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (user.role !== "technician" && user.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}
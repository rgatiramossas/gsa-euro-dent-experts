import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";

export default function DashboardSelector() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role === "gestor") {
      setLocation("/manager-dashboard");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  // Para gestores, redirecionamos via useEffect
  if (user.role === "gestor") {
    return null;
  }

  // Para admin e técnicos, mostramos o dashboard padrão
  return <Dashboard />;
}
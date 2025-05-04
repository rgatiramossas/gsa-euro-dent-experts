import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats, ServiceListItem, TechnicianPerformance as TechnicianPerformanceType } from "@/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { TechnicianPerformance } from "@/components/dashboard/TechnicianPerformance";
import { RecentServicesTable } from "@/components/dashboard/RecentServicesTable";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor" || user?.role === "manager";
  
  // Fetch dashboard stats
  const { 
    data: statsResponse, 
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery<any>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      console.log("Fazendo requisição para dashboard stats");
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log("Status da resposta dashboard stats:", response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Erro de autenticação no dashboard");
            // Aqui podemos tentar renovar a sessão antes de falhar
            return { 
              totalPendingServices: 0, 
              totalInProgressServices: 0,
              totalCompletedServices: 0,
              totalRevenue: 0
            };
          }
          throw new Error(`Erro ao buscar dados do dashboard: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Dados recebidos do dashboard API:", data);
        return data;
      } catch (error) {
        console.error("Erro ao buscar stats do dashboard:", error);
        throw error;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Usar os dados do backend diretamente com os novos nomes
  const stats = React.useMemo(() => {
    if (!statsResponse) return {
      totalPendingServices: 0,
      totalInProgressServices: 0,
      totalCompletedServices: 0,
      totalRevenue: 0
    } as DashboardStats;
    
    console.log("Stats recebidos do backend:", statsResponse);
    
    // Usar diretamente os dados que recebemos do backend
    return {
      totalPendingServices: statsResponse.totalPendingServices || 0,
      totalInProgressServices: statsResponse.totalInProgressServices || 0,
      totalCompletedServices: statsResponse.totalCompletedServices || 0,
      totalRevenue: statsResponse.totalRevenue || 0
    } as DashboardStats;
  }, [statsResponse]);

  // Fetch technician performance (only for admins)
  const { 
    data: techPerformance, 
    isLoading: isLoadingPerformance 
  } = useQuery<TechnicianPerformanceType[]>({
    queryKey: ['/api/dashboard/technician-performance'],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      console.log("Fazendo requisição para technician performance");
      try {
        const response = await fetch('/api/dashboard/technician-performance', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log("Status da resposta technician performance:", response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Erro de autenticação na requisição de performance de técnicos");
            return [];
          }
          throw new Error(`Erro ao buscar performance de técnicos: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar performance de técnicos:", error);
        return [];
      }
    },
    enabled: isAdmin, // Só busca os dados se for administrador
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch recent services
  const { 
    data: services, 
    isLoading: isLoadingServices 
  } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      console.log("Fazendo requisição para serviços recentes");
      try {
        const response = await fetch('/api/services?limit=5', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log("Status da resposta de serviços recentes:", response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Erro de autenticação na requisição de serviços recentes");
            return [];
          }
          throw new Error(`Erro ao buscar serviços recentes: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar serviços recentes:", error);
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title={t("dashboard.title", "Painel de Controle")} 
        description={t("dashboard.description", "Visão geral do sistema")} 
      />
      
      {/* Statistics Cards - Com ações rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t("dashboard.pendingServices", "Serviços Pendentes")}
          value={isLoadingStats ? "..." : stats?.totalPendingServices.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          colorClass="bg-primary"
          actionUrl="/services?status=pendente"
          actionLabel={t("common.viewDetails")}
        />
        
        <StatCard
          title={t("dashboard.servicesByStatus", "Serviços em Andamento")}
          value={isLoadingStats ? "..." : stats?.totalInProgressServices.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          colorClass="bg-secondary"
          actionUrl="/services?status=faturado"
          actionLabel={t("common.viewDetails")}
        />
        
        <StatCard
          title={t("dashboard.completedServices", "Serviços Concluídos")}
          value={isLoadingStats ? "..." : stats?.totalCompletedServices.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          colorClass="bg-success"
          actionUrl="/services?status=concluido"
          actionLabel={t("common.viewDetails")}
        />
        
        {/* Card de Faturamento Total - não visível para gestores */}
        {!isGestor && (
          <StatCard
            title={t("dashboard.revenue", "Faturamento")}
            value={isLoadingStats ? "..." : formatCurrency(stats?.totalRevenue || 0)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            colorClass="bg-amber-500"
            actionUrl="/finances"
            actionLabel={t("common.viewDetails")}
          />
        )}
      </div>
      
      {/* Quick Actions Row - não visível para gestores */}
      {!isGestor && (
        <div className="flex flex-wrap gap-3 mb-8">
          <Link href="/services/new" className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("services.newService", "Novo Serviço")}
          </Link>
          
          <Link href="/clients/new" className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t("clients.newClient")}
          </Link>
          
          <Link href="/budgets" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {t("budget.title")}
          </Link>
          

        </div>
      )}
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Services */}
        <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <RecentServicesTable
            services={Array.isArray(services) ? services : []}
            isLoading={isLoadingServices}
          />
        </div>
        
        {/* Technician Performance - visível apenas para administradores */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <TechnicianPerformance
              technicians={techPerformance || []}
              isLoading={isLoadingPerformance}
            />
          </div>
        )}
      </div>
    </div>
  );
}

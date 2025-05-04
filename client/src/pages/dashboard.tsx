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
  
  // Debug para o problema com gestores
  console.log("DASHBOARD RENDERIZANDO:");
  console.log("- Usuário:", user?.username);
  console.log("- Role:", user?.role);
  console.log("- ID:", user?.id);
  console.log("- isGestor:", isGestor);
  
  // Estado para armazenar erros e mensagens de depuração
  const [debugInfo, setDebugInfo] = React.useState<any>({
    error: null,
    result: null,
    attempts: 0,
    lastAttempt: null
  });
  
  // Função para testar diretamente a API de dashboard stats
  const testDashboardAPI = async () => {
    setDebugInfo(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
      lastAttempt: new Date().toISOString()
    }));
    
    try {
      // Construir a URL com parâmetros apropriados para o papel do usuário
      let url = '/api/dashboard/stats?debug=true&ts=' + Date.now();
      
      // Para gestores, precisamos usar uma URL com parâmetros adicionais
      if (isGestor && user?.id) {
        url = `/api/dashboard/stats?debug=true&ts=${Date.now()}&gestor_id=${user.id}&role=gestor`;
        console.log("Testando URL específica para gestor:", url);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const status = response.status;
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { parseError: true, text };
      }
      
      setDebugInfo(prev => ({
        ...prev,
        result: { status, data },
        error: null
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        result: null
      }));
    }
  };
  
  // Adicionar useEffect para forçar fetch manual das estatísticas do dashboard
  const [dashboardStats, setDashboardStats] = React.useState<DashboardStats>({
    totalPendingServices: 0,
    totalInProgressServices: 0,
    totalCompletedServices: 0,
    totalRevenue: 0
  });
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);

  // Função para buscar as estatísticas manualmente
  const fetchDashboardStats = React.useCallback(async () => {
    console.log("======================================");
    console.log("⚠️ INICIANDO FETCH DO DASHBOARD STATS");
    console.log("Buscando estatísticas do dashboard manualmente...");
    console.log("Role do usuário:", user?.role);
    console.log("ID do usuário:", user?.id);
    setIsLoadingStats(true);
    
    try {
      // Adicionar um timestamp para evitar cache
      const timestamp = new Date().getTime();
      
      // Construir a URL com base no papel do usuário
      let url = `/api/dashboard/stats?_t=${timestamp}`;
      
      // Para gestores, precisamos usar uma URL diferente ou adicionar parâmetros específicos
      if (isGestor) {
        // Quando é um gestor, adicionamos um parâmetro especial para o backend identificar
        url = `/api/dashboard/stats?_t=${timestamp}&gestor_id=${user?.id}&role=gestor`;
        console.log(`URL especial para gestor: ${url}`);
      }
      
      console.log(`Fazendo requisição para ${url}`);
      
      // Adicionar o cookie explicitamente
      const cookie = document.cookie;
      console.log("Cookie atual:", cookie);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Cookie': cookie
        }
      });
      
      console.log("Status da resposta:", response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Erro na resposta: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Dados recebidos:", data);
      
      // Processar os dados para garantir que todas as propriedades existam
      const processedData: DashboardStats = {
        totalPendingServices: Number(data.totalPendingServices) || 0,
        totalInProgressServices: Number(data.totalInProgressServices) || 0,
        totalCompletedServices: Number(data.totalCompletedServices) || 0,
        totalRevenue: Number(data.totalRevenue) || 0
      };
      
      console.log("Dados processados:", processedData);
      setDashboardStats(processedData);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      // Manter os valores padrão em caso de erro
    } finally {
      setIsLoadingStats(false);
    }
  }, [user?.id, user?.role, isGestor]);
  
  // Usar useEffect para chamar a função quando o componente montar
  React.useEffect(() => {
    console.log("Dashboard montado, buscando estatísticas...");
    
    // Adicionar um pequeno atraso para garantir que os dados de autenticação estão completos
    setTimeout(() => {
      console.log("🚀 DISPARANDO FETCH DE ESTATÍSTICAS COM DELAY...");
      console.log("Usuário atual:", user);
      console.log("Papel do usuário:", user?.role);
      
      // Para gestores, precisamos parâmetros adicionais
      let fetchUrl = '/api/dashboard/stats?_nocache=' + new Date().getTime();
      if (isGestor) {
        fetchUrl = `/api/dashboard/stats?_nocache=${new Date().getTime()}&gestor_id=${user?.id}&role=gestor`;
      }
      
      // Vamos fazer uma chamada manual
      fetch(fetchUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .then(response => {
        console.log(`Resposta manual stats (${fetchUrl}):`, response.status);
        if (response.ok) {
          return response.json();
        }
        console.error("Erro na resposta:", response.status, response.statusText);
        throw new Error(`Erro ao obter estatísticas: ${response.status}`);
      })
      .then(data => {
        console.log("Dados obtidos manualmente:", data);
        setDashboardStats({
          totalPendingServices: Number(data.totalPendingServices) || 0,
          totalInProgressServices: Number(data.totalInProgressServices) || 0,
          totalCompletedServices: Number(data.totalCompletedServices) || 0,
          totalRevenue: Number(data.totalRevenue) || 0
        });
        setIsLoadingStats(false);
      })
      .catch(error => {
        console.error("Erro ao buscar estatísticas manualmente:", error);
      });
      
      // Também chama o método normal
      fetchDashboardStats();
    }, 1000);
    
    // Configurar um intervalo para atualizar as estatísticas
    const intervalId = setInterval(() => {
      console.log("Intervalo de atualização disparado");
      fetchDashboardStats();
    }, 30000);
    
    // Limpar o intervalo quando o componente desmontar
    return () => clearInterval(intervalId);
  }, [fetchDashboardStats, user, isGestor]);
  
  // Mantemos o useQuery mas vamos garantir que ele use os dados atualizados
  const { 
    data: statsResponse, 
    error: statsError
  } = useQuery<any>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      console.log("[useQuery stats] Usando os dados do dashboardStats:", dashboardStats);
      return dashboardStats;
    },
    initialData: dashboardStats,
    enabled: true, // Habilitamos a consulta automática
  });
  
  // Usar os dados do backend diretamente com os novos nomes
  const stats = React.useMemo(() => {
    if (!dashboardStats) {
      console.log("Não há dashboardStats, retornando valores padrão");
      return {
        totalPendingServices: 0,
        totalInProgressServices: 0,
        totalCompletedServices: 0,
        totalRevenue: 0
      } as DashboardStats;
    }
    
    console.log("Stats recebidos do backend:", dashboardStats);
    console.log("Tipo de dashboardStats:", typeof dashboardStats);
    console.log("É um array?", Array.isArray(dashboardStats));
    
    if (typeof dashboardStats !== 'object' || !dashboardStats) {
      console.error("dashboardStats não é um objeto válido");
      return {
        totalPendingServices: 0,
        totalInProgressServices: 0,
        totalCompletedServices: 0,
        totalRevenue: 0
      } as DashboardStats;
    }
    
    // Converter valores numéricos explicitamente
    const result = {
      totalPendingServices: Number(dashboardStats.totalPendingServices) || 0,
      totalInProgressServices: Number(dashboardStats.totalInProgressServices) || 0,
      totalCompletedServices: Number(dashboardStats.totalCompletedServices) || 0,
      totalRevenue: Number(dashboardStats.totalRevenue) || 0
    } as DashboardStats;
    
    console.log("Stats processados:", result);
    return result;
  }, [dashboardStats]);

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
      
      {/* Debug Panel for Gestor */}
      {isGestor && (
        <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-md">
          <h3 className="text-lg font-medium mb-2">Debug Panel (Somente Gestor)</h3>
          <div className="flex flex-col gap-2">
            <div className="text-sm">
              <strong>Status:</strong> {debugInfo.attempts > 0 ? 
                (debugInfo.result ? 'Sucesso' : 'Erro') : 
                'Não testado'}
            </div>
            <div className="text-sm">
              <strong>Última tentativa:</strong> {debugInfo.lastAttempt || 'Nenhuma'}
            </div>
            <div className="text-sm">
              <strong>Tentativas:</strong> {debugInfo.attempts}
            </div>
            
            <button 
              onClick={testDashboardAPI}
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Testar API Dashboard Stats
            </button>
            
            {debugInfo.error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-md text-sm text-red-800">
                <strong>Erro:</strong> {debugInfo.error}
              </div>
            )}
            
            {debugInfo.result && (
              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md text-sm">
                <strong>Status:</strong> {debugInfo.result.status}<br />
                <strong>Dados:</strong>
                <pre className="mt-1 p-2 bg-white rounded-md overflow-auto max-h-40 text-xs">
                  {JSON.stringify(debugInfo.result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Statistics Cards - Com ações rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t("dashboard.pendingServices", "Serviços Pendentes")}
          value={isLoadingStats ? "..." : dashboardStats.totalPendingServices.toString()}
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
          value={isLoadingStats ? "..." : dashboardStats.totalInProgressServices.toString()}
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
          value={isLoadingStats ? "..." : dashboardStats.totalCompletedServices.toString()}
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
            value={isLoadingStats ? "..." : formatCurrency(dashboardStats.totalRevenue || 0)}
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

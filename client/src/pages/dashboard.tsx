import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats, ServiceListItem, TechnicianPerformance as TechnicianPerformanceType } from "@/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { TechnicianPerformance } from "@/components/dashboard/TechnicianPerformance";
import { RecentServicesTable } from "@/components/dashboard/RecentServicesTable";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch technician performance
  const { 
    data: techPerformance, 
    isLoading: isLoadingPerformance 
  } = useQuery<TechnicianPerformanceType[]>({
    queryKey: ['/api/dashboard/technician-performance'],
  });

  // Fetch recent services
  const { 
    data: services, 
    isLoading: isLoadingServices 
  } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services?limit=5'],
  });

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title="Dashboard" 
        description="Visão geral dos serviços e produtividade da equipe" 
      />
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Serviços Pendentes"
          value={isLoadingStats ? "..." : stats?.pendingServices.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          colorClass="bg-primary"
        />
        
        <StatCard
          title="Em Andamento"
          value={isLoadingStats ? "..." : stats?.inProgressServices.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          colorClass="bg-secondary"
        />
        
        <StatCard
          title="Concluídos Hoje"
          value={isLoadingStats ? "..." : stats?.completedToday.toString() || "0"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          colorClass="bg-success"
        />
        
        <StatCard
          title="Faturamento Mensal"
          value={isLoadingStats ? "..." : formatCurrency(stats?.monthlyRevenue || 0)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          colorClass="bg-amber-500"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Services */}
        <div className="lg:col-span-2">
          <RecentServicesTable
            services={services || []}
            isLoading={isLoadingServices}
          />
        </div>
        
        {/* Technician Performance */}
        <div>
          <TechnicianPerformance
            technicians={techPerformance || []}
            isLoading={isLoadingPerformance}
          />
        </div>
      </div>
    </div>
  );
}

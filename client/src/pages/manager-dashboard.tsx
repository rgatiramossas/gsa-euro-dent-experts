import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardList,
  Users,
  FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceListItem, DashboardStats } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [clientFilter, setClientFilter] = useState<string>("all");
  const { t } = useTranslation();
  
  // Obter estatísticas do dashboard
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Obter clientes do gestor
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ['/api/my-clients'],
  });
  
  // Obter serviços dos clientes do gestor
  const { data: services = [], isLoading: servicesLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services', { clientId: clientFilter !== "all" ? clientFilter : undefined }],
  });
  
  // Obter orçamentos
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<any[]>({
    queryKey: ['/api/budgets'],
  });
  
  // Função para selecionar a cor do status
  const getStatusColor = (status: string) => {
    switch(status) {
      case "pending": return "bg-yellow-500";
      case "completed": return "bg-green-500";
      case "aguardando_aprovacao": return "bg-purple-500";
      case "faturado": return "bg-blue-500";
      case "pago": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };
  
  // Função para traduzir o status
  const translateStatus = (status: string) => {
    return t(`services.status.${status}`) || status;
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('manager.title')}</h1>
          <p className="text-muted-foreground">
            {t('manager.welcome', { name: user?.name })}
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('manager.overview')}</TabsTrigger>
          <TabsTrigger value="services">{t('manager.serviceOrders')}</TabsTrigger>
          <TabsTrigger value="clients">{t('manager.myClients')}</TabsTrigger>
          <Link to="/budgets" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-gray-100">
            {t('manager.budgets')}
          </Link>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.pendingServices')}
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalPendingServices || 0}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.inProgressServices')}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalInProgressServices || 0}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.completedServices')}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalCompletedServices || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.latestServices')}</CardTitle>
              <CardDescription>
                {t('dashboard.latestServicesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : services && services.length > 0 ? (
                <div className="space-y-2">
                  {services.slice(0, 5).map((service) => (
                    <div key={service.id} className="flex justify-between items-center border rounded-md p-3">
                      <div className="flex flex-col">
                        <div className="font-medium">{service.client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.vehicle.make} {service.vehicle.model} - {service.serviceType.name}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(service.status)}>
                          {translateStatus(service.status)}
                        </Badge>
                        <Link to={`/services/${service.id}`}>
                          <Button variant="outline" size="sm">{t('dashboard.viewDetails')}</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('dashboard.noServicesFound')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Ordens de Serviço */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('manager.serviceOrders')}</CardTitle>
                  <CardDescription>
                    {t('manager.serviceOrdersDescription')}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Select 
                    value={clientFilter} 
                    onValueChange={setClientFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('dashboard.filterByClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('dashboard.allClients')}</SelectItem>
                      {!clientsLoading && clients && clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : services && services.length > 0 ? (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex justify-between items-center border rounded-md p-3">
                      <div className="flex flex-col">
                        <div className="font-medium">{service.client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.vehicle.make} {service.vehicle.model} - {service.serviceType.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {service.scheduled_date ? new Date(service.scheduled_date).toLocaleDateString() : t('dashboard.notScheduled')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(service.status)}>
                          {translateStatus(service.status)}
                        </Badge>
                        <Link to={`/services/${service.id}`}>
                          <Button variant="outline" size="sm">{t('dashboard.viewDetails')}</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('dashboard.noServicesFoundFiltered')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Meus Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manager.myClients')}</CardTitle>
              <CardDescription>
                {t('manager.myClientsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : clients && clients.length > 0 ? (
                <div className="space-y-3">
                  {clients.map((client: any) => (
                    <div key={client.id} className="flex justify-between items-center border rounded-md p-3">
                      <div className="flex flex-col">
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.email} - {client.phone}
                        </div>
                        {client.address && (
                          <div className="text-xs text-muted-foreground">
                            {client.address}, {client.city} - {client.state}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link to={`/clients/${client.id}`}>
                          <Button variant="outline" size="sm">{t('services.details')}</Button>
                        </Link>
                        <Link to={`/services/new?clientId=${client.id}`}>
                          <Button size="sm">{t('manager.newServiceOrder')}</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('manager.noClientsAssigned')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
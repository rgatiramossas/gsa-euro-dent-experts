import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardList,
  Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceListItem, DashboardStats } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [clientFilter, setClientFilter] = useState<string>("all");
  
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
    switch(status) {
      case "pending": return "Pendente";
      case "completed": return "Concluído";
      case "aguardando_aprovacao": return "Aguardando Aprovação";
      case "faturado": return "Faturado";
      case "pago": return "Pago";
      default: return status;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard do Gestor</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.name}. Aqui estão as informações dos seus clientes.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="services">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="clients">Meus Clientes</TabsTrigger>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Serviços Pendentes
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
                  Serviços em Andamento
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
                  Serviços Concluídos
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
              <CardTitle>Últimos Serviços</CardTitle>
              <CardDescription>
                Ordens de serviço recentes dos seus clientes
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
                          <Button variant="outline" size="sm">Ver Detalhes</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum serviço encontrado para seus clientes.
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
                  <CardTitle>Ordens de Serviço</CardTitle>
                  <CardDescription>
                    Todos os serviços dos clientes sob sua gestão
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Select 
                    value={clientFilter} 
                    onValueChange={setClientFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
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
                          {service.scheduled_date ? new Date(service.scheduled_date).toLocaleDateString() : 'Não agendado'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(service.status)}>
                          {translateStatus(service.status)}
                        </Badge>
                        <Link to={`/services/${service.id}`}>
                          <Button variant="outline" size="sm">Ver Detalhes</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum serviço encontrado para os critérios selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Meus Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meus Clientes</CardTitle>
              <CardDescription>
                Clientes atribuídos à sua gestão
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
                          <Button variant="outline" size="sm">Detalhes</Button>
                        </Link>
                        <Link to={`/services/new?clientId=${client.id}`}>
                          <Button size="sm">Nova OS</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum cliente atribuído à sua gestão.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
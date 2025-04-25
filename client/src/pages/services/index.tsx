import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { ServiceListItem, ServiceStatus } from "@/types";

export default function ServicesList() {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ServiceStatus | "all">("all");
  
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
  });

  // Filter services based on search term and active tab
  const filteredServices = services?.filter(service => {
    const matchesSearch = 
      searchTerm === "" || 
      service.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.vehicle.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || service.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const navigateToServiceDetails = (id: number) => {
    setLocation(`/services/${id}`);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Serviços"
        description="Gerencie todos os serviços de martelinho de ouro"
        actions={
          <Link href="/services/new">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Serviço
            </Button>
          </Link>
        }
      />
      
      <Card className="mt-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Buscar por cliente, veículo ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as ServiceStatus | "all")}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="scheduled">Agendados</TabsTrigger>
                <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
                <TabsTrigger value="completed">Concluídos</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum serviço encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices?.map((service) => (
                      <TableRow 
                        key={service.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigateToServiceDetails(service.id)}
                      >
                        <TableCell className="font-medium">#{service.id}</TableCell>
                        <TableCell>{service.client.name}</TableCell>
                        <TableCell>
                          {service.vehicle.make} {service.vehicle.model} {service.vehicle.year}
                          {service.vehicle.license_plate && ` - ${service.vehicle.license_plate}`}
                        </TableCell>
                        <TableCell>{service.technician?.name || "Não atribuído"}</TableCell>
                        <TableCell>
                          <ServiceStatusBadge status={service.status} />
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate(service.scheduled_date || service.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

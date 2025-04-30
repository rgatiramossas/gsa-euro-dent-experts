import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { ServiceListItem, ServiceStatus } from "@/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ServicesList() {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ServiceStatus | "all">("all");
  
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services', { enableOffline: true, offlineTableName: 'services' }],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnMount: true, // Forçar refetch quando o componente montar
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
            
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="text-sm font-medium">Status:</div>
              <Select 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as ServiceStatus | "all")}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Status do Serviço</SelectLabel>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                    <SelectItem value="faturado">Faturados</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum serviço encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices?.map((service) => (
                      <TableRow 
                        key={service.id} 
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">#{service.id}</TableCell>
                        <TableCell>{service.client.name}</TableCell>
                        <TableCell>
                          {service.vehicle.make} {service.vehicle.model}
                          {service.vehicle.license_plate && ` - ${service.vehicle.license_plate}`}
                        </TableCell>
                        <TableCell>{service.technician?.name || "Não atribuído"}</TableCell>
                        <TableCell>
                          <ServiceStatusBadge status={service.status} />
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate(service.scheduled_date || service.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => navigateToServiceDetails(service.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              <span>Detalhes</span>
                            </Button>
                          </div>
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

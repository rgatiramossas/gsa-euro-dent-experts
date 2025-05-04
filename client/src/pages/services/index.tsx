import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { addEventListener, WebSocketEventType } from "@/lib/websocketService";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export default function ServicesList() {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ServiceStatus | "all">("all");
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Fetch services
  const { data: services, isLoading, refetch } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnMount: true, // Forçar refetch quando o componente montar
  });
  
  // Configurar eventos para atualização em tempo real
  useEffect(() => {
    // Manipulador para quando um serviço é criado
    const handleServiceCreated = (data: any) => {
      console.log('Novo serviço criado:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: t("services.created", "Novo serviço criado"),
        description: t("services.listUpdated", "A lista de serviços foi atualizada"),
      });
    };
    
    // Manipulador para quando um serviço é atualizado
    const handleServiceUpdated = (data: any) => {
      console.log('Serviço atualizado:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: t("services.updated", "Serviço atualizado"),
        description: t("services.listUpdated", "A lista de serviços foi atualizada"),
      });
    };
    
    // Manipulador para quando um serviço é excluído
    const handleServiceDeleted = (data: any) => {
      console.log('Serviço excluído:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: t("services.deleted", "Serviço excluído"),
        description: t("services.listUpdated", "A lista de serviços foi atualizada"),
      });
    };
    
    // Registrar manipuladores de eventos
    const removeServiceCreatedListener = addEventListener('SERVICE_CREATED', handleServiceCreated);
    const removeServiceUpdatedListener = addEventListener('SERVICE_UPDATED', handleServiceUpdated);
    const removeServiceDeletedListener = addEventListener('SERVICE_DELETED', handleServiceDeleted);
    
    // Limpar manipuladores de eventos quando o componente for desmontado
    return () => {
      removeServiceCreatedListener();
      removeServiceUpdatedListener();
      removeServiceDeletedListener();
    };
  }, [refetch, toast, t]);
  
  // Function to refresh data
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    toast({
      title: t("services.refreshing", "Atualizando"),
      description: t("services.refreshingList", "Atualizando lista de serviços")
    });
    
    refetch()
      .then(() => {
        toast({
          title: t("services.refreshComplete", "Atualização Concluída"),
          description: t("services.listUpdated", "Lista de serviços atualizada com sucesso")
        });
        setIsRefreshing(false);
      })
      .catch(error => {
        console.error("Erro ao atualizar lista:", error);
        toast({
          title: t("services.refreshError", "Erro na Atualização"),
          description: t("services.refreshErrorDesc", "Houve um problema ao atualizar a lista"),
          variant: "destructive"
        });
        setIsRefreshing(false);
      });
  };

  // Filter services based on search term and active tab
  const filteredServices = Array.isArray(services) ? services.filter(service => {
    // Validações de segurança para propriedades aninhadas
    if (!service || !service.client || !service.vehicle) return false;
    
    const matchesSearch = 
      searchTerm === "" || 
      (service.client.name && service.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (service.vehicle.license_plate && service.vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (service.vehicle.make && service.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (service.vehicle.model && service.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = activeTab === "all" || service.status === activeTab;
    
    return matchesSearch && matchesTab;
  }) : [];

  const navigateToServiceDetails = (id: number) => {
    setLocation(`/services/${id}`);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("services.title", "Serviços")}
        description={t("services.manage", "Gerencie todos os serviços de martelinho de ouro")}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t("services.refresh", "Atualizar lista")}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/services/new">
              <Button>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("services.newService", "Novo Serviço")}
              </Button>
            </Link>
          </div>
        }
      />
      
      <Card className="mt-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <Input
              placeholder={t("services.searchPlaceholder", "Pesquisar serviços por cliente, veículo...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="text-sm font-medium">
                {i18n.language === 'de' ? "Status:" : 
                 i18n.language === 'es' ? "Estado:" :
                 i18n.language === 'fr' ? "Statut:" :
                 i18n.language === 'it' ? "Stato:" :
                 i18n.language === 'en' ? "Status:" :
                 "Status:"}
              </div>
              <Select 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as ServiceStatus | "all")}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={
                    i18n.language === 'de' ? "Option wählen" : 
                    i18n.language === 'es' ? "Seleccionar opción" :
                    i18n.language === 'fr' ? "Sélectionner une option" :
                    i18n.language === 'it' ? "Seleziona un'opzione" :
                    i18n.language === 'en' ? "Select option" :
                    t("validation.selectOption")
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {i18n.language === 'de' ? "Servicestatus" : 
                       i18n.language === 'es' ? "Estado del servicio" :
                       i18n.language === 'fr' ? "État du service" :
                       i18n.language === 'it' ? "Stato del servizio" :
                       i18n.language === 'en' ? "Service status" :
                       "Status do serviço"}
                    </SelectLabel>
                    <SelectItem value="all">
                      {i18n.language === 'de' ? "Alle" : 
                       i18n.language === 'es' ? "Todos" :
                       i18n.language === 'fr' ? "Tous" :
                       i18n.language === 'it' ? "Tutti" :
                       i18n.language === 'en' ? "All" :
                       "Todos"}
                    </SelectItem>
                    {/* Usando valores hardcoded para todos os idiomas para evitar o erro "key returned an object" */}
                    {i18n.language === 'de' ? (
                      <>
                        <SelectItem value="pending">Ausstehend</SelectItem>
                        <SelectItem value="completed">Abgeschlossen</SelectItem>
                        <SelectItem value="aguardando_aprovacao">Genehmigung ausstehend</SelectItem>
                        <SelectItem value="faturado">In Rechnung gestellt</SelectItem>
                        <SelectItem value="pago">Bezahlt</SelectItem>
                      </>
                    ) : i18n.language === 'es' ? (
                      <>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="aguardando_aprovacao">Esperando Aprobación</SelectItem>
                        <SelectItem value="faturado">Facturado</SelectItem>
                        <SelectItem value="pago">Pagado</SelectItem>
                      </>
                    ) : i18n.language === 'fr' ? (
                      <>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="aguardando_aprovacao">En attente d'approbation</SelectItem>
                        <SelectItem value="faturado">Facturé</SelectItem>
                        <SelectItem value="pago">Payé</SelectItem>
                      </>
                    ) : i18n.language === 'it' ? (
                      <>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="completed">Completato</SelectItem>
                        <SelectItem value="aguardando_aprovacao">In attesa di approvazione</SelectItem>
                        <SelectItem value="faturado">Fatturato</SelectItem>
                        <SelectItem value="pago">Pagato</SelectItem>
                      </>
                    ) : i18n.language === 'en' ? (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="aguardando_aprovacao">Waiting for Approval</SelectItem>
                        <SelectItem value="faturado">Invoiced</SelectItem>
                        <SelectItem value="pago">Paid</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pending">{t("services.status.pending", "Pendente")}</SelectItem>
                        <SelectItem value="completed">{t("services.status.completed", "Concluído")}</SelectItem>
                        <SelectItem value="aguardando_aprovacao">{t("services.status.aguardando_aprovacao", "Aguardando Aprovação")}</SelectItem>
                        <SelectItem value="faturado">{t("services.status.faturado", "Faturado")}</SelectItem>
                        <SelectItem value="pago">{t("services.status.pago", "Pago")}</SelectItem>
                      </>
                    )}
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
                    <TableHead>
                      {i18n.language === 'de' ? "Kunde" : 
                       i18n.language === 'es' ? "Cliente" :
                       i18n.language === 'fr' ? "Client" :
                       i18n.language === 'it' ? "Cliente" :
                       i18n.language === 'en' ? "Client" :
                       "Cliente"}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'de' ? "Fahrzeug" : 
                       i18n.language === 'es' ? "Vehículo" :
                       i18n.language === 'fr' ? "Véhicule" :
                       i18n.language === 'it' ? "Veicolo" :
                       i18n.language === 'en' ? "Vehicle" :
                       "Veículo"}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'de' ? "Techniker" : 
                       i18n.language === 'es' ? "Técnico" :
                       i18n.language === 'fr' ? "Technicien" :
                       i18n.language === 'it' ? "Tecnico" :
                       i18n.language === 'en' ? "Technician" :
                       "Técnico"}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'de' ? "Status" : 
                       i18n.language === 'es' ? "Estado" :
                       i18n.language === 'fr' ? "Statut" :
                       i18n.language === 'it' ? "Stato" :
                       i18n.language === 'en' ? "Status" :
                       "Status"}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'de' ? "Geplantes Datum" : 
                       i18n.language === 'es' ? "Fecha Programada" :
                       i18n.language === 'fr' ? "Date Programmée" :
                       i18n.language === 'it' ? "Data Programmata" :
                       i18n.language === 'en' ? "Scheduled Date" :
                       "Data Agendada"}
                    </TableHead>
                    <TableHead className="text-right">
                      {i18n.language === 'de' ? "Aktionen" : 
                       i18n.language === 'es' ? "Acciones" :
                       i18n.language === 'fr' ? "Actions" :
                       i18n.language === 'it' ? "Azioni" :
                       i18n.language === 'en' ? "Actions" :
                       "Ações"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {i18n.language === 'de' ? "Keine Ergebnisse gefunden" : 
                         i18n.language === 'es' ? "No se encontraron resultados" :
                         i18n.language === 'fr' ? "Aucun résultat trouvé" :
                         i18n.language === 'it' ? "Nessun risultato trovato" :
                         i18n.language === 'en' ? "No results found" :
                         "Nenhum resultado encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices?.map((service) => (
                      <TableRow 
                        key={service.id} 
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">
                          #{service.id}
                        </TableCell>
                        <TableCell>{service.client?.name || "-"}</TableCell>
                        <TableCell>
                          {service.vehicle?.make} {service.vehicle?.model}
                          {service.vehicle?.license_plate && ` - ${service.vehicle.license_plate}`}
                        </TableCell>
                        <TableCell>{service.technician?.name || 
                          (i18n.language === 'de' ? "Nicht zugewiesen" : 
                           i18n.language === 'es' ? "No asignado" :
                           i18n.language === 'fr' ? "Non assigné" :
                           i18n.language === 'it' ? "Non assegnato" :
                           i18n.language === 'en' ? "Unassigned" :
                           "Não atribuído")
                        }</TableCell>
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
                              <span>
                                {i18n.language === 'de' ? "Details" : 
                                 i18n.language === 'es' ? "Detalles" :
                                 i18n.language === 'fr' ? "Détails" :
                                 i18n.language === 'it' ? "Dettagli" :
                                 i18n.language === 'en' ? "Details" :
                                 "Detalhes"}
                              </span>
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

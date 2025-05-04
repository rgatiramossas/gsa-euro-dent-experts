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
import { CloudOff, RotateCw, RefreshCw } from "lucide-react";
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
import { checkNetworkStatus } from "@/lib/offlineDb";

export default function ServicesList() {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ServiceStatus | "all">("all");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Fetch services with offline support
  const { data: services, isLoading, refetch } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services', { enableOffline: true, offlineTableName: 'services' }],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnMount: true, // Forçar refetch quando o componente montar
  });
  
  // Monitor online status and sync state
  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }
    
    // Simplificando para usar apenas o status nativo do navegador
    // em vez de depender do offlineStatusStore
    
    // Initial status
    updateOnlineStatus();
    
    // Set up event listeners for online/offline status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  
  // Configurar WebSocket para atualização em tempo real
  useEffect(() => {
    // Manipulador para quando uma conexão WebSocket é estabelecida
    const handleConnectionOpen = () => {
      console.log('Conexão WebSocket estabelecida para a lista de serviços');
      setWsConnected(true);
    };
    
    // Manipulador para quando uma conexão WebSocket é fechada
    const handleConnectionClose = () => {
      console.log('Conexão WebSocket fechada para a lista de serviços');
      setWsConnected(false);
    };
    
    // Manipulador para quando um serviço é criado
    const handleServiceCreated = (data: any) => {
      console.log('Novo serviço criado:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: 'Novo serviço criado',
        description: 'A lista de serviços foi atualizada',
      });
    };
    
    // Manipulador para quando um serviço é atualizado
    const handleServiceUpdated = (data: any) => {
      console.log('Serviço atualizado:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: 'Serviço atualizado',
        description: 'A lista de serviços foi atualizada',
      });
    };
    
    // Manipulador para quando um serviço é excluído
    const handleServiceDeleted = (data: any) => {
      console.log('Serviço excluído:', data);
      // Atualizar a lista de serviços
      refetch();
      
      // Mostrar notificação toast
      toast({
        title: 'Serviço excluído',
        description: 'A lista de serviços foi atualizada',
      });
    };
    
    // Registrar manipuladores de eventos WebSocket
    const removeConnectionOpenListener = addEventListener('connection_open', handleConnectionOpen);
    const removeConnectionCloseListener = addEventListener('connection_close', handleConnectionClose);
    const removeServiceCreatedListener = addEventListener('SERVICE_CREATED', handleServiceCreated);
    const removeServiceUpdatedListener = addEventListener('SERVICE_UPDATED', handleServiceUpdated);
    const removeServiceDeletedListener = addEventListener('SERVICE_DELETED', handleServiceDeleted);
    
    // Limpar manipuladores de eventos quando o componente for desmontado
    return () => {
      removeConnectionOpenListener();
      removeConnectionCloseListener();
      removeServiceCreatedListener();
      removeServiceUpdatedListener();
      removeServiceDeletedListener();
    };
  }, [refetch, toast, t]);
  
  // Function to manually trigger sync
  const handleSync = () => {
    if (!isOnline) {
      toast({
        title: t("offline.offlineMode"),
        description: t("offline.cannotSyncOffline"),
        variant: "destructive"
      });
      return;
    }
    
    if (isSyncing) {
      toast({
        title: t("offline.syncInProgress", "Sincronização em Andamento"),
        description: t("offline.pleaseWait", "Aguarde enquanto sincronizamos os dados")
      });
      return;
    }
    
    setIsSyncing(true);
    toast({
      title: t("offline.syncStarted", "Sincronização Iniciada"),
      description: t("offline.syncingData", "Sincronizando dados com o servidor")
    });
    
    // Apenas fazer o refetch dos dados em vez de usar triggerSyncIfNeeded
    // que dependia do serviceWorker
    
    // After a short delay, refresh the data
    setTimeout(() => {
      refetch().then(() => {
        setIsSyncing(false);
        toast({
          title: t("offline.syncComplete", "Sincronização Concluída"),
          description: t("offline.dataUpdated", "Dados atualizados com sucesso")
        });
      }).catch(error => {
        console.error("Erro ao atualizar dados:", error);
        setIsSyncing(false);
        toast({
          title: t("offline.syncError", "Erro na Sincronização"),
          description: t("offline.syncErrorDesc", "Houve um problema ao sincronizar os dados"),
          variant: "destructive"
        });
      });
    }, 1500);
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
        description={
          <div className="flex items-center gap-2">
            <span>{t("services.manage", "Gerencie os serviços de reparo")}</span>
            <div className="flex items-center ml-2">
              <span className="text-xs text-gray-500 mr-1">WS:</span>
              <span 
                className={`inline-block w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                title={wsConnected ? 'WebSocket conectado' : 'WebSocket desconectado'}
              ></span>
            </div>
          </div>
        }
        actions={
          <Link href="/services/new">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("services.newService", "Novo Serviço")}
            </Button>
          </Link>
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

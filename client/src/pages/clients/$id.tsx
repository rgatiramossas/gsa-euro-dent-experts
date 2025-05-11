import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { getApi } from "@/lib/apiWrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Client } from "@shared/schema.mysql";

export interface ClientDetailProps {
  id: string;
}

export default function ClientDetail({ id }: ClientDetailProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const clientId = parseInt(id);
  
  // Mutation para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir cliente');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente excluído com sucesso",
        description: "Os serviços e orçamentos associados foram mantidos no histórico.",
        variant: "default",
      });
      
      // Invalida cache para forçar recarregamento da lista de clientes
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Redireciona para a lista de clientes
      setLocation('/clients');
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  // Query para obter detalhes do cliente
  const { 
    data: client, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/clients', clientId, { enableOffline: true, offlineTableName: 'clients' }],
    queryFn: async () => {
      try {
        return await getApi<Client>(`/api/clients/${clientId}`, {
          enableOffline: true,
          offlineTableName: 'clients'
        });
      } catch (error) {
        console.error('Erro ao carregar detalhes do cliente:', error);
        throw new Error('Erro ao carregar detalhes do cliente');
      }
    },
  });
  
  // Query para obter veículos do cliente
  const { 
    data: vehicles = [], 
    isLoading: isLoadingVehicles 
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'vehicles', { enableOffline: true, offlineTableName: 'vehicles' }],
    queryFn: async () => {
      try {
        return await getApi(`/api/clients/${clientId}/vehicles`, {
          enableOffline: true,
          offlineTableName: 'vehicles'
        });
      } catch (error) {
        console.error('Erro ao carregar veículos:', error);
        return [];
      }
    },
    enabled: !!clientId,
  });
  
  // Query para obter serviços do cliente
  const { 
    data: services = [], 
    isLoading: isLoadingServices 
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'services', { enableOffline: true, offlineTableName: 'services' }],
    queryFn: async () => {
      try {
        return await getApi(`/api/services?clientId=${clientId}`, {
          enableOffline: true,
          offlineTableName: 'services'
        });
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        return [];
      }
    },
    enabled: !!clientId,
  });
  
  // Query para obter orçamentos do cliente
  const { 
    data: budgets = [], 
    isLoading: isLoadingBudgets 
  } = useQuery({
    queryKey: ['/api/budgets', 'client', clientId, { enableOffline: true, offlineTableName: 'budgets' }],
    queryFn: async () => {
      try {
        return await getApi(`/api/budgets?clientId=${clientId}`, {
          enableOffline: true,
          offlineTableName: 'budgets'
        });
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
        return [];
      }
    },
    enabled: !!clientId,
  });

  // Handler para voltar à lista de clientes
  const handleBack = () => {
    setLocation('/clients');
  };

  // Exibindo tela de carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Exibindo mensagem de erro
  if (error || !client) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={t("clients.clientDetails")}
          actions={
            <Button variant="outline" onClick={handleBack}>
              {t("common.back")}
            </Button>
          }
        />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-600">{t("services.errors.loadingDetails")}</h3>
            <p className="mt-2 text-muted-foreground">
              {t("services.errors.loadingDetailsDescription")}
            </p>
            <Button 
              variant="default" 
              className="mt-4" 
              onClick={handleBack}
            >
              {t("clients.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={client.name}
        description={t("clients.details")}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleBack}
            >
              {t("common.back")}
            </Button>
            <Button 
              variant="default"
              onClick={() => setLocation(`/clients/${client.id}/edit`)}
            >
              {t("clients.editClient")}
            </Button>
            {/* Botão de excluir - apenas para admin */}
            {user?.role === "admin" && (
              <Button 
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                {t("clients.deleteClient")}
              </Button>
            )}
          </div>
        }
      />
      
      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.confirmDelete")} <strong>{client.name}</strong>.<br /><br />
              {t("common.thisItemHas")}:
              <ul className="list-disc pl-5 my-2">
                {vehicles.length > 0 && <li>{vehicles.length} {t("vehicles.title").toLowerCase()}</li>}
                {services.length > 0 && <li>{services.length} {t("services.title").toLowerCase()}</li>}
                {budgets.length > 0 && <li>{budgets.length} {t("budget.title").toLowerCase()}</li>}
              </ul>
              <br />
              {t("clients.associatedServicesWillBeKept")}
              <br /><br />
              {t("common.actionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? t("common.deleting") : t("common.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Card de Informações */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t("clients.clientInformation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("common.name")}</dt>
                <dd className="mt-1 text-base">{client.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("common.email")}</dt>
                <dd className="mt-1 text-base">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">{t("common.notProvided")}</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("clients.phone")}</dt>
                <dd className="mt-1 text-base">
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">{t("common.notSpecified")}</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("clients.address")}</dt>
                <dd className="mt-1 text-base">
                  {client.address || <span className="text-muted-foreground italic">{t("common.notSpecified")}</span>}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("common.registrationDate")}</dt>
                <dd className="mt-1 text-base">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Tabs para veículos, serviços e orçamentos */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>{t("common.relatedInformation")}</CardTitle>
            <CardDescription>{t("clients.relatedInfoDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="vehicles">
              <TabsList className="mb-4">
                <TabsTrigger value="vehicles">
                  {t("vehicles.title")} ({vehicles.length})
                </TabsTrigger>
                <TabsTrigger value="services">
                  {t("services.title")} ({services.length})
                </TabsTrigger>
                <TabsTrigger value="budgets">
                  {t("budget.title")} ({budgets.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab de Veículos */}
              <TabsContent value="vehicles">
                {isLoadingVehicles ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : vehicles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("vehicles.make")}/{t("vehicles.model")}</TableHead>
                        <TableHead>{t("vehicles.licensePlate")}</TableHead>
                        <TableHead>{t("vehicles.color")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">
                            {vehicle.make} {vehicle.model}
                          </TableCell>
                          <TableCell>{vehicle.license_plate || "N/A"}</TableCell>
                          <TableCell>{vehicle.color || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            {/* Botão de detalhes do veículo removido - veículos são gerenciados no contexto dos serviços */}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("clients.noVehicles")}</p>
                    <p className="text-sm mt-2">{t("clients.vehiclesRegisteredInService")}</p>
                  </div>
                )}

                {/* Os veículos agora são registrados diretamente nas ordens de serviço */}
              </TabsContent>

              {/* Tab de Serviços */}
              <TabsContent value="services">
                {isLoadingServices ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : services.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("services.serviceType")}</TableHead>
                        <TableHead>{t("services.vehicle")}</TableHead>
                        <TableHead>{t("services.status")}</TableHead>
                        <TableHead>{t("common.date")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.service_type?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {service.vehicle?.make} {service.vehicle?.model}
                          </TableCell>
                          <TableCell>
                            <ServiceStatusBadge status={service.status} />
                          </TableCell>
                          <TableCell>
                            {service.scheduled_date ? 
                              new Date(service.scheduled_date).toLocaleDateString() : 
                              "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/services/${service.id}`)}
                            >
                              {t("common.details")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("clients.noServices")}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/services/new?clientId=${client.id}`)}
                    >
                      {t("services.newService")}
                    </Button>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/services/new?clientId=${client.id}`)}
                    >
                      {t("services.newService")}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab de Orçamentos */}
              <TabsContent value="budgets">
                {isLoadingBudgets ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : budgets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("services.vehicle")}</TableHead>
                        <TableHead>{t("common.date")}</TableHead>
                        <TableHead>{t("common.value")}</TableHead>
                        <TableHead>{t("services.status")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgets.map((budget) => (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">
                            {budget.vehicle_info || "N/A"}
                          </TableCell>
                          <TableCell>
                            {budget.created_at ? 
                              new Date(budget.created_at).toLocaleDateString() : 
                              "N/A"}
                          </TableCell>
                          <TableCell>
                            {budget.total_price ? 
                              new Intl.NumberFormat(undefined, {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(budget.total_price) : 
                              "N/A"}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              budget.status === 'aprovado' ? 'bg-green-100 text-green-800' : 
                              budget.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {budget.status ? budget.status.charAt(0).toUpperCase() + budget.status.slice(1) : t("services.status.pending")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/budgets/${budget.id}/edit`)}
                            >
                              {t("common.details")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("clients.noBudgets")}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/budgets/new?clientId=${client.id}`)}
                    >
                      {t("budget.newBudget")}
                    </Button>
                  </div>
                )}
                
                {budgets.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/budgets/new?clientId=${client.id}`)}
                    >
                      {t("budget.newBudget")}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
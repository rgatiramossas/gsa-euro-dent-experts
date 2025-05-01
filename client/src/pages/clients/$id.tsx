import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
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
    queryKey: ['/api/clients', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do cliente');
      }
      return response.json() as Promise<Client>;
    },
  });
  
  // Query para obter veículos do cliente
  const { 
    data: vehicles = [], 
    isLoading: isLoadingVehicles 
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'vehicles'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/vehicles`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Query para obter serviços do cliente
  const { 
    data: services = [], 
    isLoading: isLoadingServices 
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'services'],
    queryFn: async () => {
      const response = await fetch(`/api/services?clientId=${clientId}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
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
          title="Detalhes do Cliente"
          actions={
            <Button variant="outline" onClick={handleBack}>
              Voltar
            </Button>
          }
        />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-600">Erro ao carregar detalhes do cliente</h3>
            <p className="mt-2 text-muted-foreground">
              Não foi possível obter as informações do cliente. Tente novamente mais tarde.
            </p>
            <Button 
              variant="default" 
              className="mt-4" 
              onClick={handleBack}
            >
              Voltar para a lista de clientes
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o cliente <strong>{client.name}</strong>.<br /><br />
              Este cliente possui:
              <ul className="list-disc pl-5 my-2">
                {vehicles.length > 0 && <li>{vehicles.length} veículo(s) registrado(s)</li>}
                {services.length > 0 && <li>{services.length} serviço(s) registrado(s)</li>}
              </ul>
              <br />
              Os serviços e orçamentos associados a este cliente serão mantidos no sistema para fins de histórico, mas o cliente será marcado como excluído.
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
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
                <dt className="text-sm font-medium text-muted-foreground">Telefone</dt>
                <dd className="mt-1 text-base">
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">Não informado</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Endereço</dt>
                <dd className="mt-1 text-base">
                  {client.address || <span className="text-muted-foreground italic">Não informado</span>}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Data de Cadastro</dt>
                <dd className="mt-1 text-base">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Tabs para veículos e serviços */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Informações Relacionadas</CardTitle>
            <CardDescription>Veículos e serviços relacionados a este cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="vehicles">
              <TabsList className="mb-4">
                <TabsTrigger value="vehicles">
                  Veículos ({vehicles.length})
                </TabsTrigger>
                <TabsTrigger value="services">
                  Serviços ({services.length})
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
                        <TableHead>Marca/Modelo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/vehicles/${vehicle.id}`)}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum veículo cadastrado para este cliente.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/clients/${client.id}/vehicle/new`)}
                    >
                      Cadastrar Veículo
                    </Button>
                  </div>
                )}

                {vehicles.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/clients/${client.id}/vehicle/new`)}
                    >
                      Cadastrar Novo Veículo
                    </Button>
                  </div>
                )}
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
                        <TableHead>Tipo</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
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
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${service.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                service.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'}
                            `}>
                              {service.status === 'completed' ? 'Concluído' : 
                               service.status === 'in_progress' ? 'Em Andamento' : 
                               service.status === 'pending' ? 'Pendente' : 
                               service.status}
                            </div>
                          </TableCell>
                          <TableCell>
                            {service.scheduled_date ? 
                              new Date(service.scheduled_date).toLocaleDateString('pt-BR') : 
                              "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/services/${service.id}`)}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum serviço cadastrado para este cliente.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/services/new?clientId=${client.id}`)}
                    >
                      Cadastrar Serviço
                    </Button>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/services/new?clientId=${client.id}`)}
                    >
                      Cadastrar Novo Serviço
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
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ServiceWithDetails, ServiceStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ServiceDetailsProps {
  id: string;
}

export default function ServiceDetails({ id }: ServiceDetailsProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<ServiceStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const { data: service, isLoading, error } = useQuery<ServiceWithDetails>({
    queryKey: [`/api/services/${id}`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: ServiceStatus; notes?: string }) => {
      const res = await apiRequest('PATCH', `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/services/${id}`]});
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      toast({
        title: "Status atualizado",
        description: "O status do serviço foi atualizado com sucesso",
      });
      setShowStatusDialog(false);
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status do serviço",
        variant: "destructive",
      });
    }
  });

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    
    updateStatusMutation.mutate({
      status: newStatus as ServiceStatus,
      notes: statusNotes || undefined
    });
  };

  const handleBack = () => {
    setLocation('/services');
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Detalhes do Serviço"
          actions={
            <Button variant="outline" onClick={handleBack}>
              Voltar
            </Button>
          }
        />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-red-600">Erro ao carregar detalhes do serviço</h3>
            <p className="mt-2 text-gray-500">Não foi possível carregar os detalhes deste serviço.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={`Serviço #${service.id}`}
        description="Detalhes do serviço de martelinho de ouro"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              Voltar
            </Button>
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button>
                  Atualizar Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atualizar Status do Serviço</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Status atual</label>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Novo status</label>
                    <Select
                      value={newStatus}
                      onValueChange={setNewStatus}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                        <SelectItem value="faturado">Faturado</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Informe detalhes sobre a mudança de status"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancelar</Button>
                  <Button 
                    onClick={handleStatusUpdate} 
                    disabled={!newStatus || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <div className="space-y-6">
        {/* Service Information */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle>Informações do Serviço</CardTitle>
              <ServiceStatusBadge status={service.status} />
            </div>
            <p className="text-sm text-gray-500">
              Criado em: {formatDateTime(service.created_at)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Cliente</h3>
                <p className="text-gray-800 font-medium">{service.client?.name}</p>
                <p className="text-gray-600 text-sm">{service.client?.email}</p>
                <p className="text-gray-600 text-sm">{service.client?.phone}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Veículo</h3>
                <p className="text-gray-800 font-medium">
                  {service.vehicle?.make} {service.vehicle?.model} {service.vehicle?.year}
                </p>
                <p className="text-gray-600 text-sm">
                  {service.vehicle?.color} - Placa {service.vehicle?.license_plate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Técnico</h3>
                {service.technician ? (
                  <>
                    <p className="text-gray-800 font-medium">{service.technician.name}</p>
                    <p className="text-gray-600 text-sm">{service.technician.phone}</p>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">Não atribuído</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Service Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Detalhes do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo de Serviço</h3>
              <p className="text-gray-800">{service.serviceType?.name}</p>
              {service.serviceType?.description && (
                <p className="text-gray-600 text-sm mt-1">{service.serviceType.description}</p>
              )}
            </div>
            
            {service.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Descrição</h3>
                <p className="text-gray-800">{service.description}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Localização</h3>
              <div className="bg-gray-100 rounded-lg p-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="text-gray-700 text-sm">
                  <p className="font-medium">{service.location_type === "workshop" ? "Oficina" : "Local do Cliente"}</p>
                  <p>{service.address || "Endereço não especificado"}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {service.scheduled_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data Agendada</h3>
                  <p className="text-gray-800">{formatDateTime(service.scheduled_date)}</p>
                </div>
              )}
              
              {service.start_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Início</h3>
                  <p className="text-gray-800">{formatDateTime(service.start_date)}</p>
                </div>
              )}
              
              {service.completion_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Conclusão</h3>
                  <p className="text-gray-800">{formatDateTime(service.completion_date)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Photo Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Registro Fotográfico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Antes</h3>
                {service.photos?.before && service.photos.before.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {service.photos.before.map((photo) => (
                      <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={photo.photo_url} 
                          alt="Antes do reparo" 
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
                    Nenhuma foto do estado inicial
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Depois</h3>
                {service.photos?.after && service.photos.after.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {service.photos.after.map((photo) => (
                      <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={photo.photo_url} 
                          alt="Depois do reparo" 
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
                    Nenhuma foto do resultado final
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Financial Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Valor do serviço</span>
                <span className="text-gray-800 font-medium">{formatCurrency(service.price)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Taxa de deslocamento</span>
                <span className="text-gray-800 font-medium">{formatCurrency(service.displacement_fee)}</span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span className="text-gray-700">Total</span>
                <span className="text-primary text-lg">{formatCurrency(service.total)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <Button variant="outline">Editar Orçamento</Button>
              <Button variant="secondary" className="bg-success hover:bg-success/90 text-white">
                Aprovar Orçamento
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Notes Section */}
        {service.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800">{service.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

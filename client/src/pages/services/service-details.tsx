import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ServiceWithDetails, ServiceStatus, ServiceType } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/common/PhotoUpload";
import { LocationSelector } from "@/components/common/LocationSelector";
import { useForm } from "react-hook-form";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";

interface ServiceDetailsProps {
  id: string;
}

export default function ServiceDetails({ id }: ServiceDetailsProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [newStatus, setNewStatus] = useState<ServiceStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // Nova abordagem para edição inline
  const [isEditing, setIsEditing] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<FileList | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<FileList | null>(null);
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [photosToRemove, setPhotosToRemove] = useState<number[]>([]);
  
  // Simulação de dados dos técnicos - normalmente viria de uma API
  const technicians = [
    { id: 1, name: "Admin User" },
    { id: 2, name: "João Silva" }
  ];
  
  const { data: service, isLoading, error } = useQuery<ServiceWithDetails>({
    queryKey: [`/api/services/${id}`],
  });
  
  const { data: serviceTypes } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
  });
  
  // Criar um formulário para edição com valores padrão
  const editForm = useForm({
    defaultValues: {
      service_type_id: 0,
      technician_id: 0,
      description: "",
      notes: "",
      price: 0,
      displacement_fee: 0,
      location_type: "workshop" as "client_location" | "workshop",
      address: "",
      latitude: 0,
      longitude: 0,
      scheduled_date: new Date(),
      photos: undefined
    }
  });
  
  // Atualizar valores iniciais do formulário quando service carregar
  React.useEffect(() => {
    if (service) {
      editForm.reset({
        service_type_id: service.service_type_id || 0,
        technician_id: service.technician_id || 0,
        description: service.description || "",
        notes: service.notes || "",
        price: service.price || 0,
        displacement_fee: service.displacement_fee || 0,
        location_type: service.location_type as "client_location" | "workshop",
        address: service.address || "",
        latitude: service.latitude || 0,
        longitude: service.longitude || 0,
        scheduled_date: service.scheduled_date ? new Date(service.scheduled_date) : new Date(),
        photos: undefined
      });
    }
  }, [service]);

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
      setNewStatus("");
      setStatusNotes("");
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
  
  const updateServiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        body: formData,
        // Não definir Content-Type para multipart/form-data
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`Erro ao atualizar serviço: ${res.status} ${res.statusText}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/services/${id}`]});
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      toast({
        title: "Serviço atualizado",
        description: "As informações do serviço foram atualizadas com sucesso",
      });
      
      // Resetar o estado de edição
      setIsEditing(false);
      setBeforePhotos(null);
      setAfterPhotos(null);
      setBeforePhotoPreview(null);
      setAfterPhotoPreview(null);
      setPhotosToRemove([]);
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast({
        title: "Erro ao atualizar serviço",
        description: "Ocorreu um erro ao atualizar as informações do serviço",
        variant: "destructive",
      });
    }
  });
  
  const handleStatusUpdate = () => {
    if (!newStatus) return;
    
    const data: { status: ServiceStatus; notes?: string } = {
      status: newStatus as ServiceStatus
    };
    
    if (statusNotes.trim()) {
      data.notes = statusNotes.trim();
    }
    
    updateStatusMutation.mutate(data);
  };
  
  const handleBack = () => {
    setLocation('/services');
  };
  
  // Funções para edição inline
  const handleStartEditing = () => {
    setIsEditing(true);
  };
  
  const handleCancelEditing = () => {
    setIsEditing(false);
    // Resetar quaisquer modificações não salvas
    if (service) {
      editForm.reset({
        service_type_id: service.service_type_id || 0,
        technician_id: service.technician_id || 0,
        description: service.description || "",
        notes: service.notes || "",
        price: service.price || 0,
        displacement_fee: service.displacement_fee || 0,
        location_type: service.location_type as "client_location" | "workshop",
        address: service.address || "",
        latitude: service.latitude || 0,
        longitude: service.longitude || 0,
        scheduled_date: service.scheduled_date ? new Date(service.scheduled_date) : new Date(),
        photos: undefined
      });
    }
    
    // Resetar os estados de fotos
    setBeforePhotos(null);
    setAfterPhotos(null);
    setBeforePhotoPreview(null);
    setAfterPhotoPreview(null);
    setPhotosToRemove([]);
  };
  
  // Função para salvar as alterações
  const handleSaveChanges = () => {
    editForm.handleSubmit((data) => {
      // Preparar o objeto de dados para envio
      const updateData = {
        service_type_id: data.service_type_id,
        price: data.price,
        displacement_fee: data.displacement_fee,
      };
      
      // Criar o FormData para o envio
      const formData = new FormData();
      
      // Adicionar os dados do serviço
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Adicionar fotos "antes" se houver
      if (beforePhotos) {
        Array.from(beforePhotos).forEach((file: File) => {
          formData.append('before_photos', file);
        });
      }
      
      // Adicionar fotos "depois" se houver
      if (afterPhotos) {
        Array.from(afterPhotos).forEach((file: File) => {
          formData.append('after_photos', file);
        });
      }
      
      // Adicionar IDs das fotos para remover
      if (photosToRemove.length > 0) {
        formData.append('photos_to_remove', JSON.stringify(photosToRemove));
      }
      
      // Enviar o FormData para o servidor
      updateServiceMutation.mutate(formData);
    })();
  };
  
  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/services/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso",
      });
      // Redirecionar para a listagem após excluir
      setLocation('/services');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast({
        title: "Erro ao excluir serviço",
        description: "Ocorreu um erro ao excluir o serviço",
        variant: "destructive",
      });
    }
  });
  
  // Função para receber novas fotos do tipo "antes"
  const handleBeforePhotoChange = (files: FileList) => {
    if (files.length === 0) return;
    
    setBeforePhotos(files);
    
    // Limpar previews antigos
    if (beforePhotoPreview) {
      URL.revokeObjectURL(beforePhotoPreview);
    }
    
    // Criar previews para mostrar ao usuário
    // No caso real, usaríamos múltiplos previews
    const previewUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      previewUrls.push(URL.createObjectURL(files[i]));
    }
    setBeforePhotoPreview(previewUrls.join(','));
    
    console.log(`${files.length} fotos 'antes' selecionadas`);
  };
  
  // Função para receber novas fotos do tipo "depois"
  const handleAfterPhotoChange = (files: FileList) => {
    if (files.length === 0) return;
    
    setAfterPhotos(files);
    
    // Limpar previews antigos
    if (afterPhotoPreview) {
      URL.revokeObjectURL(afterPhotoPreview);
    }
    
    // Criar previews para mostrar ao usuário
    const previewUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      previewUrls.push(URL.createObjectURL(files[i]));
    }
    setAfterPhotoPreview(previewUrls.join(','));
    
    console.log(`${files.length} fotos 'depois' selecionadas`);
  };
  
  // Função para marcar uma foto para remoção
  const handleRemovePhoto = (photoId: number) => {
    setPhotosToRemove((prev) => [...prev, photoId]);
    
    toast({
      title: "Foto marcada para remoção",
      description: "A foto será removida quando você salvar as alterações",
    });
    
    console.log(`Foto ${photoId} marcada para remoção`);
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
                      onValueChange={(value) => setNewStatus(value as ServiceStatus)}
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
        
        {!isEditing ? (
          <>
            {/* Service Details - View Mode */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Detalhes do Serviço</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleStartEditing}>
                    Editar Serviço
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo de Serviço</h3>
                  <div>
                    <p className="text-gray-800">{service.serviceType?.name}</p>
                    {service.serviceType?.description && (
                      <p className="text-gray-600 text-sm mt-1">{service.serviceType.description}</p>
                    )}
                  </div>
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
            
            {/* Photo Gallery - View Mode */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos Antes do Serviço</h3>
                    {service.photos?.before && service.photos.before.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {service.photos.before.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do dano" 
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma foto do dano disponível</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos Após Serviço</h3>
                    {service.photos?.after && service.photos.after.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {service.photos.after.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto após reparo" 
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma foto após serviço disponível</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Financial Section - View Mode */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Valor do serviço</span>
                    <span className="text-gray-800 font-medium">{formatCurrency(service.price)}</span>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Valor administrativo</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(service.displacement_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-medium">
                    <span className="text-gray-700">Total</span>
                    <span className="text-primary text-lg">{formatCurrency(service.total)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Serviço
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteServiceMutation.mutate()}
                          disabled={deleteServiceMutation.isPending}
                        >
                          {deleteServiceMutation.isPending ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          </>
        ) : (
          /* Edit Mode - Using the same structure as the new-service form but only for editable fields */
          <Form {...editForm}>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }} className="space-y-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" type="button" onClick={handleCancelEditing}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateServiceMutation.isPending}>
                  {updateServiceMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            
              {/* Service Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Informações do Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="service_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Serviço <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={(value) => editForm.setValue('service_type_id', parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de serviço" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {serviceTypes?.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              {/* Financial Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Valores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={editForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do Serviço (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {currentUser?.role === 'admin' && (
                      <FormField
                        control={editForm.control}
                        name="displacement_fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Administrativo (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0,00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between py-2 font-medium mt-4 border-t pt-4">
                    <span className="text-gray-700">Total</span>
                    <span className="text-primary text-lg">
                      {formatCurrency((editForm.watch('price') || 0) + (editForm.watch('displacement_fee') || 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Photos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Registro Fotográfico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos Antes do Serviço</h3>
                    <div className="mb-4">
                      <PhotoUpload
                        label="Adicionar fotos (máx. 5)"
                        onChange={(files) => handleBeforePhotoChange(files)}
                        className="mt-1"
                        accept="image/*"
                        multiple={true}
                        maxFiles={5}
                        preview={beforePhotoPreview || undefined}
                      />
                    </div>
                    
                    {/* Exibição das fotos existentes com opção de remoção */}
                    {service.photos?.before && service.photos.before.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Fotos existentes</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {service.photos.before.map((photo) => (
                            <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                              <img 
                                src={photo.photo_url} 
                                alt="Foto do dano" 
                                className="object-cover w-full h-full"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <Trash2 className="h-6 w-6 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos Após Serviço</h3>
                    <div className="mb-4">
                      <PhotoUpload
                        label="Adicionar fotos (máx. 5)"
                        onChange={(files) => handleAfterPhotoChange(files)}
                        className="mt-1"
                        accept="image/*"
                        multiple={true}
                        maxFiles={5}
                        preview={afterPhotoPreview || undefined}
                      />
                    </div>
                    
                    {/* Exibição das fotos existentes com opção de remoção */}
                    {service.photos?.after && service.photos.after.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Fotos existentes</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {service.photos.after.map((photo) => (
                            <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                              <img 
                                src={photo.photo_url} 
                                alt="Foto após reparo" 
                                className="object-cover w-full h-full"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <Trash2 className="h-6 w-6 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Footer with Delete Button */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardFooter className="border-t pt-4">
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Serviço
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteServiceMutation.mutate()}
                            disabled={deleteServiceMutation.isPending}
                          >
                            {deleteServiceMutation.isPending ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardFooter>
              </Card>
            </form>
          </Form>
        )}
        
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
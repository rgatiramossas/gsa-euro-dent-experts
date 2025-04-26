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
import { CalendarIcon, Trash2, X } from "lucide-react";
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
  // Mantendo for compatibilidade temporária
  const [beforePhotos, setBeforePhotos] = useState<FileList | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<FileList | null>(null);
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  // Nova abordagem unificada
  const [servicePhotos, setServicePhotos] = useState<FileList | null>(null);
  const [servicePhotoPreview, setServicePhotoPreview] = useState<string | null>(null);
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
      administrative_fee: 0,
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
        administrative_fee: service.administrative_fee || 0,
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
      return await apiRequest(`/api/services/${id}`, 'PATCH', data);
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
    mutationFn: async (formData: FormData | Record<string, any>) => {
      // Verificar se os dados são FormData ou um objeto regular
      let options: RequestInit = {
        method: 'PATCH',
      };
      
      // Se for FormData, deixamos o Content-Type ser definido automaticamente
      if (formData instanceof FormData) {
        options.body = formData;
      } else {
        // Se for um objeto JSON, definimos o Content-Type
        options.body = JSON.stringify(formData);
        options.headers = {
          'Content-Type': 'application/json'
        };
      }
      
      const res = await fetch(`/api/services/${id}`, options);
      
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
      // Limpar fotos nos dois formatos (novo e legado)
      setServicePhotos(null);
      setServicePhotoPreview(null);
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
        administrative_fee: service.administrative_fee || 0,
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
    // Resetar também as fotos de serviço
    setServicePhotos(null);
    setServicePhotoPreview(null);
    setPhotosToRemove([]);
  };
  
  // Função para salvar as alterações
  const handleSaveChanges = () => {
    editForm.handleSubmit((data) => {
      console.log("Dados do formulário:", data);
      
      // Verificar se o serviço existe
      if (!service) {
        console.error("Serviço não encontrado");
        toast({
          title: "Erro",
          description: "Serviço não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      // Sempre usaremos FormData para simplificar e unificar o processo
      const formData = new FormData();
      
      // Verificar e adicionar campos que foram modificados
      if (data.service_type_id !== service.service_type_id) {
        formData.append('service_type_id', data.service_type_id.toString());
      }
      
      if (data.technician_id !== service.technician_id) {
        formData.append('technician_id', data.technician_id.toString());
      }
      
      // Processar valores numéricos
      const dataPrice = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
      const servicePrice = typeof service.price === 'string' ? parseFloat(service.price) : service.price;
      
      if (dataPrice !== servicePrice) {
        formData.append('price', dataPrice.toString());
      }
      
      // Campo displacement_fee removido
      
      const dataAdministrativeFee = typeof data.administrative_fee === 'string' ? parseFloat(data.administrative_fee) : data.administrative_fee;
      const serviceAdministrativeFee = typeof service.administrative_fee === 'string' ? parseFloat(service.administrative_fee) : service.administrative_fee;
      
      if (dataAdministrativeFee !== serviceAdministrativeFee) {
        formData.append('administrative_fee', dataAdministrativeFee.toString());
      }
      
      if (data.description !== service.description) {
        formData.append('description', data.description || '');
      }
      
      if (data.notes !== service.notes) {
        formData.append('notes', data.notes || '');
      }
      
      if (data.location_type !== service.location_type) {
        formData.append('location_type', data.location_type);
      }
      
      if (data.address !== service.address) {
        formData.append('address', data.address || '');
      }
      
      // Verificar se existem alterações de fotos
      const hasPhotoAdditions = servicePhotos && servicePhotos.length > 0;
      const hasPhotoRemovals = photosToRemove.length > 0;
      const hasPhotoChanges = hasPhotoAdditions || hasPhotoRemovals;
      
      // Verificar se existem alterações nos campos de texto/números
      const hasFieldChanges = Array.from(formData.entries()).length > 0;
      
      if (!hasFieldChanges && !hasPhotoChanges) {
        toast({
          title: "Nenhuma alteração detectada",
          description: "Nenhuma informação foi alterada para este serviço",
        });
        setIsEditing(false);
        return;
      }
      
      // Se só temos alterações de fotos, precisamos sinalizar isso para o servidor
      if (!hasFieldChanges && hasPhotoChanges) {
        formData.append('_hasPhotoChangesOnly', 'true');
      }
      
      // Adicionar novas fotos (apenas abordagem unificada 'service')
      if (hasPhotoAdditions) {
        Array.from(servicePhotos).forEach((file: File) => {
          formData.append('photos_service', file);
        });
      }
      
      // Adicionar IDs das fotos para remover
      if (hasPhotoRemovals) {
        formData.append('photos_to_remove', JSON.stringify(photosToRemove));
      }
      
      // Sinalizar que há alterações de fotos para o servidor
      if (hasPhotoChanges) {
        formData.append('has_photo_changes', 'true');
      }
      
      console.log("Enviando atualização do serviço com FormData");
      updateServiceMutation.mutate(formData);
    })();
  };
  
  // Exclusão de fotos individuais
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return await apiRequest(`/api/services/${id}/photos/${photoId}`, 'DELETE');
    },
    onSuccess: (data) => {
      // Atualizar os dados do serviço para refletir a foto removida
      queryClient.invalidateQueries({queryKey: [`/api/services/${id}`]});
      
      toast({
        title: "Foto removida",
        description: `Foto removida com sucesso. Restam ${data.remainingSlots} slots disponíveis.`,
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir foto:', error);
      toast({
        title: "Erro ao remover foto",
        description: "Ocorreu um erro ao remover a foto",
        variant: "destructive"
      });
    }
  });
  
  // Função para lidar com a exclusão de uma foto
  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };
  
  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/services/${id}`, 'DELETE');
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
  
  // Função que calcula quantas slots de fotos ainda estão disponíveis
  const calculateRemainingPhotoSlots = (): number => {
    if (!service || !service.photos) return 4; // Se não há serviço ou fotos, permite o máximo
    
    // Conta o número total de fotos existentes no servidor
    const existingPhotosCount = 
      (service.photos.service?.length || 0) + 
      (service.photos.before?.length || 0) + 
      (service.photos.after?.length || 0);
    
    // Filtra as fotos existentes para excluir as que já foram marcadas para remoção
    const existingPhotosFiltered = existingPhotosCount - photosToRemove.length;
    
    // O número máximo de fotos que podem ser adicionadas
    const maxPhotos = 4;
    
    // Calcular o número de slots disponíveis
    const remainingSlots = Math.max(0, maxPhotos - existingPhotosFiltered);
    
    console.log(`Slots de fotos disponíveis: ${remainingSlots} (existentes: ${existingPhotosCount}, removidas: ${photosToRemove.length}, restantes no servidor: ${existingPhotosFiltered})`);
    
    return remainingSlots;
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
  
  // Função para receber novas fotos do tipo "service" (abordagem unificada)
  const handleServicePhotoChange = (files: FileList) => {
    if (files.length === 0 || !service) return;
    
    // Calcular corretamente as fotos existentes no servidor
    const currentPhotos = [
      ...(service.photos?.service || []),
      ...(service.photos?.before || []),
      ...(service.photos?.after || [])
    ];
    
    // Filtrar fotos que não estão marcadas para remoção
    const remainingPhotos = currentPhotos.filter(photo => !photosToRemove.includes(photo.id));
    
    // Verificar quantas fotos existentes temos desconsiderando as marcadas para remoção
    const existingPhotosOnServer = remainingPhotos.length;
    
    console.log("Contagem de fotos existentes:", {
      service: service.photos?.service?.length || 0,
      before: service.photos?.before?.length || 0,
      after: service.photos?.after?.length || 0,
      total: currentPhotos.length,
      marcadasParaRemover: photosToRemove.length,
      realmenteExistentes: existingPhotosOnServer
    });
    
    // Calcular slots restantes
    const remainingSlots = 4 - existingPhotosOnServer;
    
    console.log(`Slots disponíveis: ${remainingSlots} (4 - ${existingPhotosOnServer})`);
    
    if (remainingSlots <= 0) {
      toast({
        title: "Limite de fotos atingido",
        description: "Você já atingiu o limite de 4 fotos. Remova algumas fotos existentes antes de adicionar novas.",
        variant: "destructive",
      });
      return;
    }
    
    // Limitar o número de novas fotos ao número de slots disponíveis
    const newFiles = Array.from(files).slice(0, remainingSlots);
    
    // Criar um novo objeto FileList com as novas fotos
    const newFilesTransfer = new DataTransfer();
    
    // Adicionar novos arquivos
    newFiles.forEach(file => {
      newFilesTransfer.items.add(file);
    });
    
    // Obter o novo FileList
    const newFileList = newFilesTransfer.files;
    
    // Atualizar o estado com a lista de novas fotos
    setServicePhotos(newFileList);
    
    // Limpar previews antigos se existirem
    if (servicePhotoPreview) {
      servicePhotoPreview.split(',').forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    
    // Criar previews para mostrar ao usuário
    const previewUrls: string[] = [];
    for (let i = 0; i < newFileList.length; i++) {
      previewUrls.push(URL.createObjectURL(newFileList[i]));
    }
    
    // Armazenar os URLs de preview separados por vírgula
    const previewUrlsString = previewUrls.join(',');
    setServicePhotoPreview(previewUrlsString);
    
    console.log(`Total de ${newFileList.length} novas fotos de serviço selecionadas.`);
    console.log("Preview URLs:", previewUrlsString);
    
    // Mostrar feedback ao usuário
    if (newFiles.length < files.length) {
      toast({
        title: "Algumas fotos não foram adicionadas",
        description: `Apenas ${newFiles.length} de ${files.length} fotos foram adicionadas devido ao limite de 4 fotos por serviço.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Fotos adicionadas",
        description: `${newFiles.length} ${newFiles.length === 1 ? 'foto foi adicionada' : 'fotos foram adicionadas'} com sucesso.`,
      });
    }
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
                  {service.vehicle?.make} {service.vehicle?.model}
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
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos do Veículo</h3>
                    {/* Combinamos todas as fotos em uma única visualização */}
                    {((service.photos?.before && service.photos.before.length > 0) || 
                      (service.photos?.after && service.photos.after.length > 0) ||
                      (service.photos?.service && service.photos.service.length > 0)) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {/* Fotos de tipo 'service' (novo formato unificado) */}
                        {service.photos?.service && service.photos.service.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-blue-500 text-white">
                              Serviço
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {/* Fotos de tipo 'before' (retrocompatibilidade) */}
                        {service.photos?.before && service.photos.before.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-orange-500 text-white">
                              Antes
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {/* Fotos de tipo 'after' (retrocompatibilidade) */}
                        {service.photos?.after && service.photos.after.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-green-500 text-white">
                              Depois
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma foto disponível</p>
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
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Taxa de deslocamento</span>
                        <span className="text-gray-800 font-medium">{formatCurrency(service.displacement_fee)}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Taxa administrativa</span>
                        <span className="text-gray-800 font-medium">{formatCurrency(service.administrative_fee || 0)}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 font-medium">
                        <span className="text-gray-700">Total</span>
                        <span className="text-primary text-lg">{formatCurrency(service.total)}</span>
                      </div>
                    </>
                  )}
                  
                  {currentUser?.role !== 'admin' && (
                    <div className="flex justify-between py-2 font-medium mt-2">
                      <span className="text-gray-700">Valor para o técnico</span>
                      <span className="text-primary text-lg">{formatCurrency(service.price)}</span>
                    </div>
                  )}
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
                          <FormLabel>Valor do Serviço (Técnico) (€)</FormLabel>
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
                      <>
                        <FormField
                          control={editForm.control}
                          name="administrative_fee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa Administrativa (€)</FormLabel>
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
                              <FormDescription>
                                Comissão para o administrador (apenas visível para administradores)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                  
                  {currentUser?.role === 'admin' ? (
                    <div className="flex justify-between py-2 font-medium mt-4 border-t pt-4">
                      <span className="text-gray-700">Total</span>
                      <span className="text-primary text-lg">
                        {formatCurrency(
                          (editForm.watch('price') || 0) + 
                          (editForm.watch('administrative_fee') || 0)
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-2 font-medium mt-4 border-t pt-4">
                      <span className="text-gray-700">Valor para o técnico</span>
                      <span className="text-primary text-lg">
                        {formatCurrency(editForm.watch('price') || 0)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Photos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Fotos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="photos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fotos do Serviço</FormLabel>
                          <FormControl>
                            <PhotoUpload
                              label="fotos-servico"
                              onChange={(files) => {
                                if (files.length > 0) {
                                  // Combinar as novas fotos com as existentes para o form também
                                  const existingFiles = servicePhotos ? Array.from(servicePhotos) : [];
                                  const newFiles = Array.from(files);
                                  
                                  // Manipular as fotos através da função específica para garantir a coerência
                                  handleServicePhotoChange(files);
                                  
                                  // Atualizar o valor do formulário com as fotos combinadas
                                  const combinedFiles = new DataTransfer();
                                  existingFiles.forEach(file => combinedFiles.items.add(file));
                                  newFiles.forEach(file => combinedFiles.items.add(file));
                                  
                                  editForm.setValue("photos", combinedFiles.files, { shouldValidate: true });
                                  
                                  toast({
                                    title: "Fotos selecionadas com sucesso",
                                    description: `${files.length} ${files.length === 1 ? 'foto' : 'fotos'} ${files.length === 1 ? 'selecionada' : 'selecionadas'}.`,
                                    variant: "default",
                                  });
                                }
                              }}
                              multiple
                              maxFiles={calculateRemainingPhotoSlots()}
                              preview={servicePhotoPreview || undefined}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            {calculateRemainingPhotoSlots() > 0 
                              ? `Adicione até ${calculateRemainingPhotoSlots()} ${calculateRemainingPhotoSlots() === 1 ? 'foto' : 'fotos'} do serviço. Total máximo: 4 fotos.` 
                              : 'Limite máximo de 4 fotos atingido. Remova alguma foto existente para adicionar novas.'}
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Exibição das fotos existentes */}
                  {((service.photos?.before && service.photos.before.length > 0) || 
                    (service.photos?.after && service.photos.after.length > 0) ||
                    (service.photos?.service && service.photos.service.length > 0)) ? (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-2">Fotos existentes</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {/* Fotos de tipo 'service' */}
                        {service.photos?.service && service.photos.service.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
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
                        
                        {/* Fotos de tipo 'before' (retrocompatibilidade) */}
                        {service.photos?.before && service.photos.before.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
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
                        
                        {/* Fotos de tipo 'after' (retrocompatibilidade) */}
                        {service.photos?.after && service.photos.after.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <img 
                              src={photo.photo_url} 
                              alt="Foto do veículo" 
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
                  ) : null}
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
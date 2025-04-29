import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ServiceType, ServiceStatus } from "@/types";
import {
  Clipboard,
  Clock,
  MapPin,
  FileText,
  User,
  CreditCard,
  Edit,
  Trash2,
  X,
  Check,
  MessageSquare,
  UploadCloud,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { ImageWithFallback } from "@/components/common/ImageWithFallback";

interface ServiceDetailsProps {
  id: string;
}

export default function ServiceDetails({ id }: ServiceDetailsProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  // Variáveis auxiliares para melhorar a legibilidade e evitar erros de tipagem
  const isGestor = currentUser?.role === 'gestor' || currentUser?.role === 'manager'; // Incluir ambas as variações
  const isAdmin = currentUser?.role === 'admin';
  const isTechnician = currentUser?.role === 'technician';
  const canEditService = isAdmin || isTechnician; // Apenas admin e técnico podem editar
  const canUpdateStatus = isAdmin || isTechnician; // Apenas admin e técnico podem atualizar status
  
  // DEBUG: log user role info
  console.log("VERIFICAÇÃO DE USUÁRIO:", {
    currentUser,
    role: currentUser?.role,
    isAdmin,
    isTechnician,
    isGestor,
    userJson: JSON.stringify(currentUser)
  });
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
    onSuccess: (data) => {
      console.log("--------------------------------------------");
      console.log("DETALHAMENTO COMPLETO DO SERVIÇO:", JSON.stringify(data, null, 2));
      console.log("--------------------------------------------");
      console.log("Informações de usuário:", { 
        isAdmin, 
        isTechnician, 
        isGestor
      });
      console.log("Valores financeiros:", {
        price: data?.price,
        priceType: typeof data?.price,
        adminFee: data?.administrative_fee,
        adminFeeType: typeof data?.administrative_fee,
        total: data?.total,
        totalType: typeof data?.total
      });
    },
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
      /* Taxa de deslocamento removida */
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
        /* Taxa de deslocamento removida */
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
        /* Taxa de deslocamento removida */
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
      
      /* Campo displacement_fee removido */
      
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
      const hasFieldChanges = Array.from(formData.keys()).length > 0;
      
      if (!hasFieldChanges && !hasPhotoChanges) {
        toast({
          title: "Sem alterações",
          description: "Nenhuma alteração foi detectada no serviço",
          variant: "default",
        });
        setIsEditing(false);
        return;
      }
      
      // Adicionar fotos se existirem
      if (servicePhotos && servicePhotos.length > 0) {
        // Adicionar fotos no novo formato (tipo 'service')
        Array.from(servicePhotos).forEach((file: File) => {
          formData.append('photos_service', file);
        });
      }
      
      // Adicionar fotos de antes e depois para manter compatibilidade
      if (beforePhotos && beforePhotos.length > 0) {
        Array.from(beforePhotos).forEach((file: File) => {
          formData.append('photos_before', file);
        });
      }
      
      if (afterPhotos && afterPhotos.length > 0) {
        Array.from(afterPhotos).forEach((file: File) => {
          formData.append('photos_after', file);
        });
      }
      
      // Adicionar IDs de fotos a serem removidas
      if (photosToRemove.length > 0) {
        formData.append('photos_to_remove', JSON.stringify(photosToRemove));
      }
      
      // Enviar a requisição
      updateServiceMutation.mutate(formData);
    })();
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
  
  // Usar o nome do tipo de serviço
  const getServiceTypeName = (serviceTypeId: number | null | undefined) => {
    if (!serviceTypeId || !serviceTypes) return "Não especificado";
    const serviceType = serviceTypes.find(type => type.id === serviceTypeId);
    return serviceType ? serviceType.name : "Não especificado";
  };
  
  // Formatação de data
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Não especificada";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "PPP", { locale: ptBR });
  };
  
  // Formatação do status
  const formatStatus = (status: string | null | undefined) => {
    if (!status) return "Não especificado";
    
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'in_progress': 'Em andamento',
      'completed': 'Concluído',
      'canceled': 'Cancelado',
      'pago': 'Pago'
    };
    
    return statusMap[status] || status;
  };
  
  // Cor do status
  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return "bg-gray-500";
    
    const statusColorMap: Record<string, string> = {
      'pending': 'bg-yellow-500',
      'in_progress': 'bg-blue-500',
      'completed': 'bg-green-500',
      'canceled': 'bg-red-500',
      'pago': 'bg-purple-500'
    };
    
    return statusColorMap[status] || "bg-gray-500";
  };
  
  // Formatação da localização
  const formatLocation = (locationType: string | null | undefined) => {
    if (!locationType) return "Não especificada";
    
    const locationMap: Record<string, string> = {
      'client_location': 'Localização do Cliente',
      'workshop': 'Oficina'
    };
    
    return locationMap[locationType] || locationType;
  };
  
  // Função para tratar imagens removidas
  const handleDeletePhoto = (photoId: number) => {
    setPhotosToRemove([...photosToRemove, photoId]);
    // Remover visualmente da lista - o DB só será atualizado ao salvar
    // Aqui estamos simulando a remoção para o usuário ver como fica
    
    // Não é necessário remover do estado atual porque ao invalidar a query, 
    // os dados serão recarregados automaticamente do backend
    
    toast({
      title: "Foto marcada para remoção",
      description: "A foto será removida quando você salvar as alterações",
    });
  };
  
  // Função para tratar upload de fotos
  const handleBeforePhotoChange = (files: FileList) => {
    if (files && files.length > 0) {
      // Limitar a 4 fotos
      if (files.length > 4) {
        toast({
          title: "Limite de fotos excedido",
          description: "Você pode enviar no máximo 4 fotos por categoria",
          variant: "destructive",
        });
        return;
      }
      
      // Definir fotos e criar preview
      setBeforePhotos(files);
      setBeforePhotoPreview(URL.createObjectURL(files[0]));
    }
  };
  
  const handleAfterPhotoChange = (files: FileList) => {
    if (files && files.length > 0) {
      // Limitar a 4 fotos
      if (files.length > 4) {
        toast({
          title: "Limite de fotos excedido",
          description: "Você pode enviar no máximo 4 fotos por categoria",
          variant: "destructive",
        });
        return;
      }
      
      // Definir fotos e criar preview
      setAfterPhotos(files);
      setAfterPhotoPreview(URL.createObjectURL(files[0]));
    }
  };
  
  const handleServicePhotoChange = (files: FileList) => {
    if (files && files.length > 0) {
      // Limitar a 4 fotos
      if (files.length > 4) {
        toast({
          title: "Limite de fotos excedido",
          description: "Você pode enviar no máximo 4 fotos por categoria",
          variant: "destructive",
        });
        return;
      }
      
      // Definir fotos e criar preview
      setServicePhotos(files);
      setServicePhotoPreview(URL.createObjectURL(files[0]));
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto p-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Erro ao carregar detalhes do serviço</h2>
          <p className="text-red-600 mb-4">Ocorreu um erro ao carregar as informações do serviço</p>
          <Button onClick={handleBack} variant="outline">Voltar para a lista</Button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container max-w-5xl mx-auto p-4">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-amber-700 mb-2">Serviço não encontrado</h2>
          <p className="text-amber-600 mb-4">Não foi possível encontrar o serviço solicitado</p>
          <Button onClick={handleBack} variant="outline">Voltar para a lista</Button>
        </div>
      </div>
    );
  }

  const isPaid = service.status === 'pago';
  const isServiceEditable = (canEditService && !isPaid) || // Regra 1: Admin/técnico podem editar se não estiver pago
                           (isAdmin); // Regra 2: Administrador pode editar qualquer serviço
  
  return (
    <div className="container max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="outline" size="sm" onClick={handleBack} className="mb-2">
            <span className="mr-2">←</span> Voltar para Serviços
          </Button>
          <h1 className="text-2xl font-bold">
            Detalhes do Serviço
            <Badge className={`ml-2 ${getStatusColor(service.status)} text-white`}>
              {formatStatus(service.status)}
            </Badge>
          </h1>
        </div>
        {/* Botões de ação - não mostrar para gestores */}
        {!isEditing && isServiceEditable && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleStartEditing}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Tag className="h-4 w-4 mr-2" />
                  Alterar Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Status do Serviço</DialogTitle>
                  <DialogDescription>
                    Selecione o novo status do serviço e adicione notas se necessário.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Novo Status</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) => setNewStatus(value as ServiceStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em andamento</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Adicione informações sobre a mudança de status"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                    Cancelar
                  </Button>
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
        )}
      </div>

      {/* Conteúdo principal do serviço */}
      {!isEditing ? (
        // View Mode
        <>
          {/* Client & Vehicle Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Cliente e Veículo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium mb-2">Cliente</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                      <div>
                        <p className="font-medium">{service.client?.name || "Cliente não especificado"}</p>
                        {service.client?.phone && (
                          <p className="text-sm text-gray-600">{service.client.phone}</p>
                        )}
                        {service.client?.email && (
                          <p className="text-sm text-gray-600">{service.client.email}</p>
                        )}
                      </div>
                    </div>
                    {service.client?.address && (
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-600">{service.client.address}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-medium mb-2">Veículo</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <div>
                        <p className="font-medium">
                          {service.vehicle?.make} {service.vehicle?.model} {service.vehicle?.year}
                        </p>
                        {service.vehicle?.color && (
                          <p className="text-sm text-gray-600">
                            Cor: {service.vehicle.color}
                          </p>
                        )}
                        {service.vehicle?.license_plate && (
                          <p className="text-sm text-gray-600">
                            Placa: {service.vehicle.license_plate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Detalhes do Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Tipo de Serviço</h3>
                      <p className="text-base">{getServiceTypeName(service.service_type_id)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Técnico Responsável</h3>
                      <p className="text-base">{service.technician_name || "Não atribuído"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Data Agendada</h3>
                      <p className="text-base">{formatDate(service.scheduled_date)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Local de Atendimento</h3>
                      <p className="text-base">{formatLocation(service.location_type)}</p>
                      {service.location_type === 'client_location' && service.address && (
                        <p className="text-sm text-gray-600">{service.address}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Descrição</h3>
                      <p className="text-base whitespace-pre-line">
                        {service.description || "Sem descrição"}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Notas</h3>
                      <p className="text-base whitespace-pre-line">
                        {service.notes || "Sem notas adicionais"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Fotos do Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="mb-2">
                  <div>
                    {((service.photos?.before && service.photos.before.length > 0) || 
                      (service.photos?.after && service.photos.after.length > 0) ||
                      (service.photos?.service && service.photos.service.length > 0)) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {/* Fotos de tipo 'service' (novo formato unificado) */}
                        {service.photos?.service && service.photos.service.map((photo) => (
                          <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                            <ImageWithFallback 
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
                            <ImageWithFallback 
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
                            <ImageWithFallback 
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
              </div>
            </CardContent>
          </Card>
          
          {/* Financial Section - View Mode (visível apenas para admin e técnicos) */}
          {!isGestor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {/* Só exibir valores financeiros para admin e técnicos */}
                  {isAdmin && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Valor do serviço</span>
                        <span className="text-gray-800 font-medium">
                          {formatCurrency(Number(service.price) || 0)}
                        </span>
                      </div>
                      
                      {/* Taxa de deslocamento removida */}
                      
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Taxa administrativa</span>
                        <span className="text-gray-800 font-medium">
                          {formatCurrency(Number(service.administrative_fee) || 0)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between py-2 font-medium">
                        <span className="text-gray-700">Total</span>
                        <span className="text-primary text-lg">
                          {formatCurrency(Number(service.price || 0) + Number(service.administrative_fee || 0))}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {isTechnician && (
                    <div className="flex justify-between py-2 font-medium mt-2">
                      <span className="text-gray-700">Valor para o técnico</span>
                      <span className="text-primary text-lg">{formatCurrency(Number(service.price) || 0)}</span>
                    </div>
                  )}
                  
                  {/* Mostrar mensagem explicativa para gestores */}
                  {isGestor && (
                    <div className="p-4 bg-gray-50 rounded-md text-center">
                      <p className="text-gray-600">Valores financeiros não estão disponíveis para gestores</p>
                      <p className="text-xs text-gray-500 mt-1">Para visualizar valores financeiros, entre em contato com um administrador</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Card Footer and Actions */}
          {!isEditing && !isGestor && (
            <Card>
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
          )}
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
            
            {/* Financial Information - não mostrar para gestores */}
            {!isGestor && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Valores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Serviço (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Taxa de deslocamento removida */}
                  
                  <FormField
                    control={editForm.control}
                    name="administrative_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa Administrativa (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Detalhes Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Serviço</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o serviço a ser realizado..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre o serviço..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Photos Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Existing photos */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Fotos existentes</h3>
                    {((service.photos?.before && service.photos.before.length > 0) || 
                      (service.photos?.after && service.photos.after.length > 0) ||
                      (service.photos?.service && service.photos.service.length > 0)) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {/* Mostrar fotos atuais filtradas (as que não estão marcadas para remoção) */}
                        {service.photos?.service && service.photos.service
                          .filter(photo => !photosToRemove.includes(photo.id))
                          .map((photo) => (
                            <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                              <ImageWithFallback 
                                src={photo.photo_url} 
                                alt="Foto do serviço" 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-blue-500 text-white">
                                Serviço
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        }
                        
                        {service.photos?.before && service.photos.before
                          .filter(photo => !photosToRemove.includes(photo.id))
                          .map((photo) => (
                            <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                              <ImageWithFallback 
                                src={photo.photo_url} 
                                alt="Foto antes" 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-orange-500 text-white">
                                Antes
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        }
                        
                        {service.photos?.after && service.photos.after
                          .filter(photo => !photosToRemove.includes(photo.id))
                          .map((photo) => (
                            <div key={photo.id} className="relative aspect-w-4 aspect-h-3 bg-gray-100 rounded-lg overflow-hidden group">
                              <ImageWithFallback 
                                src={photo.photo_url} 
                                alt="Foto depois" 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-green-500 text-white">
                                Depois
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma foto disponível</p>
                    )}
                  </div>
                  
                  {/* Add new photos - Novo formato unificado */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Adicionar novas fotos (máx. 4)</h3>
                    <div className="space-y-1">
                      <Label htmlFor="service_photos">Fotos do serviço</Label>
                      <Input
                        id="service_photos"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleServicePhotoChange(e.target.files)}
                      />
                      {servicePhotoPreview && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Preview:</p>
                          <img 
                            src={servicePhotoPreview} 
                            alt="Preview" 
                            className="h-24 w-auto rounded-md border border-gray-200" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Manter para compatibilidade com sistemas legados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="before_photos">Fotos antes (legado)</Label>
                      <Input
                        id="before_photos"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleBeforePhotoChange(e.target.files)}
                      />
                      {beforePhotoPreview && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Preview:</p>
                          <img 
                            src={beforePhotoPreview} 
                            alt="Preview" 
                            className="h-24 w-auto rounded-md border border-gray-200" 
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="after_photos">Fotos depois (legado)</Label>
                      <Input
                        id="after_photos"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleAfterPhotoChange(e.target.files)}
                      />
                      {afterPhotoPreview && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Preview:</p>
                          <img 
                            src={afterPhotoPreview} 
                            alt="Preview" 
                            className="h-24 w-auto rounded-md border border-gray-200" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Form buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" type="button" onClick={handleCancelEditing}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
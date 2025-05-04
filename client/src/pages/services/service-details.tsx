import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR, enUS, de } from "date-fns/locale";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { putApi, deleteApi } from "@/lib/apiWrapper";
import { checkNetworkStatus } from "@/lib/offlineDb";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useTranslateServiceType } from "@/hooks/useTranslateServiceType";
import { ServiceType, ServiceStatus, ServiceWithDetails } from "@/types";
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
  const { t, i18n } = useTranslation();
  const { translateServiceType } = useTranslateServiceType();
  
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
  const [photosToRemove, setPhotosToRemove] = useState<number[]>([]);
  
  // Simulação de dados dos técnicos - normalmente viria de uma API
  const technicians = [
    { id: 1, name: "Admin User" },
    { id: 2, name: "João Silva" }
  ];
  
  const { data: service, isLoading, error } = useQuery<ServiceWithDetails>({
    queryKey: [`/api/services/${id}`, { enableOffline: true, offlineTableName: 'services' }],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnMount: true
  });
  
  const { data: serviceTypes } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types', { enableOffline: true, offlineTableName: 'service_types' }],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnMount: true,
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
      // Verificar status da rede
      const isOnline = checkNetworkStatus();
      console.log("Status da rede:", isOnline ? "Online" : "Offline");
      
      try {
        // Usar apiWrapper para suporte offline
        const result = await putApi(`/api/services/${id}`, data, {
          enableOffline: true,
          offlineTableName: 'services'
        });
        
        if (!isOnline) {
          return { ...result, _offline: true };
        }
        
        return result;
      } catch (error) {
        console.error("Erro na atualização de status:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Verificar se foi atualizado offline
      const isOfflineData = data && data._offline === true;
      
      queryClient.invalidateQueries({queryKey: [`/api/services/${id}`]});
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      toast({
        title: t("services.statusUpdated"),
        description: isOfflineData 
          ? t("offline.serviceOfflineDescription") 
          : t("services.statusUpdatedSuccess"),
      });
      
      setShowStatusDialog(false);
      setNewStatus("");
      setStatusNotes("");
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: t("errors.updateStatus"),
        description: t("errors.updateStatusDescription"),
        variant: "destructive",
      });
    }
  });
  
  const updateServiceMutation = useMutation({
    mutationFn: async (formData: FormData | Record<string, any>) => {
      // Verificar status da rede
      const isOnline = checkNetworkStatus();
      console.log("Status da rede:", isOnline ? "Online" : "Offline");
      
      try {
        // Se for um objeto comum, usamos o apiRequest com suporte offline
        if (!(formData instanceof FormData)) {
          return await putApi(`/api/services/${id}`, formData, {
            enableOffline: true,
            offlineTableName: 'services'
          });
        }
        
        // Para FormData em modo offline, precisamos converter para JSON
        if (!isOnline) {
          console.log("Modo offline: convertendo FormData para JSON");
          const jsonData: Record<string, any> = {};
          
          for (const [key, value] of formData.entries()) {
            if (key === 'photos_to_remove') {
              jsonData[key] = JSON.parse(value as string);
            } else if (!key.startsWith('photos_')) { // Ignorar campos de foto em modo offline
              jsonData[key] = value;
            }
          }
          
          // Usar putApi com suporte offline
          const result = await putApi(`/api/services/${id}`, jsonData, {
            enableOffline: true,
            offlineTableName: 'services'
          });
          
          console.log("Serviço atualizado offline:", result);
          return { ...result, _offline: true };
        }
        
        // Para FormData em modo online, fazer tratamento normal
        const res = await fetch(`/api/services/${id}`, {
          method: 'PATCH',
          body: formData,
          credentials: 'include',
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Erro na resposta:", errorText);
          throw new Error(`Erro ao atualizar serviço: ${res.status} ${res.statusText}`);
        }
        
        return res.json();
      } catch (error) {
        console.error("Erro na atualização:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Verificar se foi atualizado offline
      const isOfflineData = data && data._offline === true;
      
      queryClient.invalidateQueries({queryKey: [`/api/services/${id}`]});
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      toast({
        title: t("services.serviceUpdated"),
        description: isOfflineData 
          ? t("offline.serviceOfflineDescription") 
          : t("services.serviceUpdatedSuccess"),
      });
      
      // Resetar o estado de edição
      setIsEditing(false);
      // Limpar fotos nos dois formatos (novo e legado)
      setServicePhotos(null);
      setBeforePhotos(null);
      setAfterPhotos(null);
      setBeforePhotoPreview(null);
      setAfterPhotoPreview(null);
      setPhotosToRemove([]);
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast({
        title: t("errors.updateService"),
        description: t("errors.updateServiceDescription"),
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
          title: t("common.error"),
          description: t("services.errors.serviceNotFound"),
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
          title: t("services.noChanges"),
          description: t("services.noChangesDetected"),
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
      // Verificar status da rede
      const isOnline = checkNetworkStatus();
      console.log("Status da rede:", isOnline ? "Online" : "Offline");
      
      try {
        // Usar deleteApi com suporte offline
        const result = await deleteApi(`/api/services/${id}`, {
          offlineTableName: 'services'
        });
        
        if (!isOnline) {
          return { _offline: true, id: Number(id) };
        }
        
        return result;
      } catch (error) {
        console.error("Erro na exclusão:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Verificar se foi excluído offline
      const isOfflineData = data && data._offline === true;
      
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      toast({
        title: t("services.serviceDeleted"),
        description: isOfflineData 
          ? t("offline.serviceOfflineDescription") 
          : t("services.serviceDeletedSuccess", "O serviço foi excluído com sucesso"),
      });
      
      setLocation('/services');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast({
        title: t("errors.deleteService"),
        description: t("errors.deleteServiceDescription"),
        variant: "destructive",
      });
    }
  });
  
  // Usar o nome do tipo de serviço
  const getServiceTypeName = (serviceTypeId: number | null | undefined) => {
    if (!serviceTypeId || !serviceTypes) return t("common.notSpecified", "Não especificado");
    const serviceType = serviceTypes.find(type => type.id === serviceTypeId);
    // Usar o hook translateServiceType para traduzir o nome com base no idioma atual
    return serviceType ? translateServiceType(serviceType.name) : t("common.notSpecified", "Não especificado");
  };
  
  // Formatação de data
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return t("common.notSpecified", "Não especificada");
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Escolher o local correto baseado no idioma atual
    const currentLanguage = i18n.language;
    
    let dateLocale = ptBR; // Português é o padrão
    if (currentLanguage === 'de') {
      dateLocale = de;
    } else if (currentLanguage === 'es') {
      // Espanhol usa o mesmo formato do inglês, só muda as palavras
      dateLocale = enUS;
    }
    
    return format(date, "PPP", { locale: dateLocale });
  };
  
  // Formatação do status
  const formatStatus = (status: string | null | undefined) => {
    if (!status) return t("common.notSpecified", "Não especificado");
    
    // Obtenha o idioma atual da instância de i18n já criada no componente principal
    const currentLanguage = i18n.language;
    
    if (currentLanguage === 'it') {
      // Mapeamento direto para italiano
      const italianStatusMap: Record<string, string> = {
        'pending': 'In attesa',
        'in_progress': 'In corso',
        'completed': 'Completato',
        'canceled': 'Annullato',
        'pago': 'Pagato',
        'aguardando_aprovacao': 'In attesa di approvazione',
        'faturado': 'Fatturato'
      };
      
      return italianStatusMap[status] || status;
    }
    
    // Para outros idiomas, usar o mapeamento normal
    const statusKeys: Record<string, string> = {
      'pending': 'services.status.pending',
      'in_progress': 'services.status.in_progress',
      'completed': 'services.status.completed',
      'canceled': 'services.status.canceled',
      'pago': 'services.status.pago',
      'aguardando_aprovacao': 'services.status.aguardando_aprovacao',
      'faturado': 'services.status.faturado'
    };
    
    // Obter a chave de tradução ou usar o status como fallback
    const translationKey = statusKeys[status] || status;
    // Traduzir usando a chave (com fallback para o status original)
    return t(translationKey, { defaultValue: status });
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
    if (!locationType) return t("common.notSpecified", "Não especificada");
    
    const locationKeys: Record<string, string> = {
      'client_location': 'services.clientLocation',
      'workshop': 'services.workshop'
    };
    
    // Obter a chave de tradução ou usar o tipo de localização como fallback
    const translationKey = locationKeys[locationType] || locationType;
    // Traduzir usando a chave
    return t(translationKey, locationType);
  };
  
  // Função para tratar imagens removidas
  const handleDeletePhoto = (photoId: number) => {
    setPhotosToRemove([...photosToRemove, photoId]);
    // Remover visualmente da lista - o DB só será atualizado ao salvar
    // Aqui estamos simulando a remoção para o usuário ver como fica
    
    // Não é necessário remover do estado atual porque ao invalidar a query, 
    // os dados serão recarregados automaticamente do backend
    
    toast({
      title: t("photos.markedForRemoval", "Foto marcada para remoção"),
      description: t("photos.willBeRemovedOnSave", "A foto será removida quando você salvar as alterações"),
    });
  };
  
  // Função para tratar upload de fotos
  const handleBeforePhotoChange = (files: FileList) => {
    if (files && files.length > 0) {
      // Limitar a 4 fotos
      if (files.length > 4) {
        toast({
          title: t("photos.limitExceeded"),
          description: t("photos.maxFourPerCategory"),
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
          title: t("photos.limitExceeded"),
          description: t("photos.maxFourPerCategory"),
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
      // Converter FileList atual (se existir) em array
      const currentFiles = servicePhotos ? Array.from(servicePhotos) : [];
      // Converter novas FileList em array
      const newFiles = Array.from(files);
      
      // Verificar o total de fotos após a adição
      const totalFiles = currentFiles.length + newFiles.length;
      
      // Limitar a 4 fotos no total
      if (totalFiles > 4) {
        toast({
          title: t("photos.limitExceeded"),
          description: t("photos.limitExceededWithCount", "Você já tem {{current}} foto(s) e está tentando adicionar {{new}}. O limite é de 4 fotos.", {
            current: currentFiles.length,
            new: newFiles.length
          }),
          variant: "destructive",
        });
        return;
      }
      
      // Criar novo FileList combinando as fotos atuais e novas
      const dataTransfer = new DataTransfer();
      
      // Adicionar fotos atuais
      currentFiles.forEach(file => {
        dataTransfer.items.add(file);
      });
      
      // Adicionar novas fotos
      newFiles.forEach(file => {
        dataTransfer.items.add(file);
      });
      
      // Atualizar estado com o novo FileList combinado
      const combinedFiles = dataTransfer.files;
      setServicePhotos(combinedFiles);
      
      // Mostrar mensagem de sucesso
      toast({
        title: t("photos.added", "Fotos adicionadas"),
        description: t("photos.addedWithCount", "{{count}} foto(s) adicionada(s). Total: {{total}}/4", {
          count: newFiles.length,
          total: combinedFiles.length
        }),
      });
    }
  };
  
  // Função para remover uma foto específica da seleção
  const handleRemoveSelectedPhoto = (indexToRemove: number) => {
    if (!servicePhotos || servicePhotos.length === 0) return;
    
    const files = Array.from(servicePhotos);
    if (indexToRemove < 0 || indexToRemove >= files.length) return;
    
    // Filtrar a foto a ser removida
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    
    // Se não houver mais fotos, limpar o estado
    if (updatedFiles.length === 0) {
      setServicePhotos(null);
      return;
    }
    
    // Caso contrário, criar um novo FileList com as fotos restantes
    const dataTransfer = new DataTransfer();
    updatedFiles.forEach(file => dataTransfer.items.add(file));
    setServicePhotos(dataTransfer.files);
    
    toast({
      title: t("photos.removed", "Foto removida"),
      description: t("photos.removedWithCount", "Foto {{index}} removida. Total: {{total}}/4", {
        index: indexToRemove + 1,
        total: updatedFiles.length
      }),
    });
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
          <h2 className="text-xl font-semibold text-red-700 mb-2">{t("services.errors.loadingDetails", "Erro ao carregar detalhes do serviço")}</h2>
          <p className="text-red-600 mb-4">{t("services.errors.loadingDetailsDescription", "Ocorreu um erro ao carregar as informações do serviço")}</p>
          <Button onClick={handleBack} variant="outline">{t("services.backToList", "Voltar para a lista")}</Button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container max-w-5xl mx-auto p-4">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-amber-700 mb-2">{t("services.errors.serviceNotFound", "Serviço não encontrado")}</h2>
          <p className="text-amber-600 mb-4">{t("services.errors.serviceNotFoundDescription", "Não foi possível encontrar o serviço solicitado")}</p>
          <Button onClick={handleBack} variant="outline">{t("services.backToList", "Voltar para a lista")}</Button>
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
            <span className="mr-2">←</span> {t("services.backToServices")}
          </Button>
          <h1 className="text-2xl font-bold">
            {t("services.serviceDetails")}
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
              {t("common.edit", "Editar")}
            </Button>
            
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Tag className="h-4 w-4 mr-2" />
                  {t("services.changeStatus")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("services.changeStatus")}</DialogTitle>
                  <DialogDescription>
                    {t("services.selectNewStatus")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">{t("services.newStatus")}</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) => setNewStatus(value as ServiceStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("services.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{formatStatus("pending")}</SelectItem>
                        <SelectItem value="in_progress">{formatStatus("in_progress")}</SelectItem>
                        <SelectItem value="completed">{formatStatus("completed")}</SelectItem>
                        <SelectItem value="canceled">{formatStatus("canceled")}</SelectItem>
                        <SelectItem value="pago">{formatStatus("pago")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("services.notesOptional")}</Label>
                    <Textarea
                      id="notes"
                      placeholder={t("services.addStatusNotes")}
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? t("common.saving") : t("common.save")}
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
              <CardTitle>{t("services.clientAndVehicle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium mb-2">{t("services.client")}</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                      <div>
                        <p className="font-medium">{service.client?.name || t("clients.notSpecified")}</p>
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
                  <h3 className="text-base font-medium mb-2">{t("services.vehicle")}</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <div>
                        <p className="font-medium">
                          {service.vehicle?.make} {service.vehicle?.model} {service.vehicle?.year}
                        </p>
                        {service.vehicle?.color && (
                          <p className="text-sm text-gray-600">
                            {t("vehicles.color")}: {service.vehicle.color}
                          </p>
                        )}
                        {service.vehicle?.license_plate && (
                          <p className="text-sm text-gray-600">
                            {t("vehicles.licensePlate")}: {service.vehicle.license_plate}
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
              <CardTitle>{t("services.serviceDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">{t("services.serviceType")}</h3>
                      <p className="text-base">{getServiceTypeName(service.service_type_id)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">{t("services.responsibleTechnician")}</h3>
                      <p className="text-base">{service.technician?.name || t("services.unassigned")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">{t("services.scheduledDate")}</h3>
                      <p className="text-base">{formatDate(service.scheduled_date)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">{t("services.location")}</h3>
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
                      <h3 className="text-sm font-medium text-gray-500">{t("services.description")}</h3>
                      <p className="text-base whitespace-pre-line">
                        {service.description || t("services.noDescription")}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">{t("services.notes")}</h3>
                      <p className="text-base whitespace-pre-line">
                        {service.notes || t("services.noAdditionalNotes")}
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
              <CardTitle>{t("services.photos")}</CardTitle>
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
                              alt={t("photos.vehiclePhoto")} 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-blue-500 text-white">
                              {t("photos.service")}
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove")}
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
                              alt={t("photos.vehiclePhoto")} 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-orange-500 text-white">
                              {t("photos.before")}
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove")}
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
                              alt={t("photos.vehiclePhoto")} 
                              className="object-cover w-full h-full"
                            />
                            <Badge className="absolute top-1 left-1 bg-green-500 text-white">
                              {t("photos.after")}
                            </Badge>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove")}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">{t("photos.noPhotosAvailable")}</p>
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
                <CardTitle>{t("services.values")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {/* Só exibir valores financeiros para admin e técnicos */}
                  {isAdmin && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{t("services.serviceValue")}</span>
                        <span className="text-gray-800 font-medium">
                          {formatCurrency(Number(service.price) || 0)}
                        </span>
                      </div>
                      
                      {/* Taxa de deslocamento removida */}
                      
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{t("services.administrativeFee")}</span>
                        <span className="text-gray-800 font-medium">
                          {formatCurrency(Number(service.administrative_fee) || 0)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between py-2 font-medium">
                        <span className="text-gray-700">{t("services.totalValue")}</span>
                        <span className="text-primary text-lg">
                          {formatCurrency(Number(service.price || 0) + Number(service.administrative_fee || 0))}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {isTechnician && (
                    <div className="flex justify-between py-2 font-medium mt-2">
                      <span className="text-gray-700">{t("services.technicianValue")}</span>
                      <span className="text-primary text-lg">{formatCurrency(Number(service.price) || 0)}</span>
                    </div>
                  )}
                  
                  {/* Mostrar mensagem explicativa para gestores */}
                  {isGestor && (
                    <div className="p-4 bg-gray-50 rounded-md text-center">
                      <p className="text-gray-600">{t("services.financialValuesNotAvailable")}</p>
                      <p className="text-xs text-gray-500 mt-1">{t("services.contactAdminForFinancial")}</p>
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
                        {t("services.deleteService")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("services.deleteService")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("services.confirmDelete")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteServiceMutation.mutate()}
                          disabled={deleteServiceMutation.isPending}
                        >
                          {deleteServiceMutation.isPending ? t("services.deleting") : t("common.delete")}
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
                {t("common.cancel", "Cancelar")}
              </Button>
              <Button type="submit" disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending ? t("common.saving", "Salvando...") : t("common.save", "Salvar")}
              </Button>
            </div>
          
            {/* Service Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t("services.serviceInformation", "Informações do Serviço")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="service_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.serviceType", "Tipo de Serviço")} <span className="text-red-500">*</span></FormLabel>
                      <Select
                        onValueChange={(value) => editForm.setValue('service_type_id', parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("services.selectServiceType", "Selecione o tipo de serviço")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {translateServiceType(type.name)}
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
                  <CardTitle>{t("services.values", "Valores")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("services.serviceValue", "Valor do Serviço")} (R$)</FormLabel>
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
                        <FormLabel>{t("services.administrativeFee", "Taxa Administrativa")} (R$)</FormLabel>
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
                <CardTitle>{t("services.additionalDetails", "Detalhes Adicionais")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.description", "Descrição do Serviço")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("services.problemPlaceholder", "Descreva o serviço a ser realizado...")}
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
                      <FormLabel>{t("services.additionalNotes", "Notas Adicionais")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("services.notesPlaceholder", "Informações adicionais sobre o serviço...")}
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
                <CardTitle>{t("services.photos", "Fotos")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Existing photos */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("photos.existingPhotos", "Fotos existentes")}</h3>
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
                                alt={t("photos.vehiclePhoto", "Foto do serviço")} 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-blue-500 text-white">
                                {t("services.service", "Serviço")}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove", "Remover foto")}
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
                                alt={t("photos.before", "Foto antes")} 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-orange-500 text-white">
                                {t("photos.before", "Antes")}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove", "Remover foto")}
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
                                alt={t("photos.after", "Foto depois")} 
                                className="object-cover w-full h-full"
                              />
                              <Badge className="absolute top-1 left-1 bg-green-500 text-white">
                                {t("photos.after", "Depois")}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t("photos.remove", "Remover foto")}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">{t("photos.noPhotosAvailable", "Nenhuma foto disponível")}</p>
                    )}
                  </div>
                  
                  {/* Add new photos - Novo formato unificado */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("photos.addNewPhotos", "Adicionar novas fotos")} (máx. 4)</h3>
                    <div className="space-y-1">
                      <Label htmlFor="service_photos">{t("services.servicePhotos", "Fotos do serviço")}</Label>
                      <Input
                        id="service_photos"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleServicePhotoChange(e.target.files)}
                      />
                      {/* Exibir miniaturas de todas as fotos selecionadas */}
                      {servicePhotos && servicePhotos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            {t("photos.preview", "Preview")}: {servicePhotos.length} {t(servicePhotos.length === 1 ? "photos.singular" : "photos.plural", "foto(s)")} {t("photos.selected", "selecionada(s)")}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {Array.from(servicePhotos).map((file, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt={`${t("photos.preview", "Preview")} ${index + 1}`} 
                                  className="h-24 w-auto rounded-md border border-gray-200" 
                                />
                                <span className="absolute top-0 right-0 bg-gray-800 text-white text-xs px-1 rounded-bl">
                                  {index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSelectedPhoto(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title={t("photos.remove", "Remover foto")}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Componentes legados removidos */}
                </div>
              </CardContent>
            </Card>
            
            {/* Form buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" type="button" onClick={handleCancelEditing}>
                {t("common.cancel", "Cancelar")}
              </Button>
              <Button type="submit" disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending ? t("common.saving", "Salvando...") : t("common.saveChanges", "Salvar Alterações")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
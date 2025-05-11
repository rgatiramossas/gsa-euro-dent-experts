import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getApi, postApi } from "@/lib/apiWrapper";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslateServiceType } from "@/hooks/useTranslateServiceType";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { PhotoUploader } from "@/components/common/PhotoUploader";
import { LocationSelector } from "@/components/common/LocationSelector";

// Schemas
const formSchema = z.object({
  client_id: z.number({
    required_error: "Selecione um cliente", // Será substituído dinamicamente usando o t()
  }),
  // Campos de veículo
  vehicle_id: z.number().optional().nullable(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_plate: z.string().optional(),
  vehicle_vin: z.string().optional(), // Chassi
  service_type_id: z.number({
    required_error: "Selecione o tipo de serviço", // Será substituído dinamicamente usando o t()
  }),
  technician_id: z.number().optional().nullable(),
  status: z.string(),
  description: z.string().optional().nullable(),
  location_type: z.enum(['client_location', 'workshop'] as const),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  scheduled_date: z.date().optional(),
  scheduled_time: z.string().optional(),
  price: z.number().default(0),
  administrative_fee: z.number().default(0),
  total: z.number().optional(),
  notes: z.string().optional().nullable(),
}).refine(
  // Validação que exige ao menos placa OU chassi quando não há veículo selecionado
  (data) => {
    // Se temos um vehicle_id, não precisamos de mais nada
    if (data.vehicle_id) return true;
    // Caso contrário, exigimos placa OU chassi
    return !!(data.vehicle_plate || data.vehicle_vin)
  },
  {
    message: "Preencha ao menos a placa ou o chassi do veículo",
    path: ["vehicle_plate"], // Campo onde será exibida a mensagem de erro
  }
);

// Tipos
type FormData = z.infer<typeof formSchema>;

interface Client {
  id: number;
  name: string;
  phone: string;
  // Propriedades para controle offline
  _isOffline?: boolean;
  _pendingSync?: boolean;
  _fromStorage?: boolean;
}

interface Vehicle {
  id: number;
  client_id: number;
  make: string;
  model: string;
  // Propriedades para controle offline
  _isOffline?: boolean;
  _pendingSync?: boolean;
  _fromStorage?: boolean;
}

interface ServiceType {
  id: number;
  name: string;
  description: string;
  default_price: number;
}

interface User {
  id: number;
  name: string;
  role: string;
}

export default function NewServicePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [serviceSavedOffline, setServiceSavedOffline] = useState(false);
  const { translateServiceType } = useTranslateServiceType();
  
  // Carregar dados do cliente - versão simplificada sem suporte offline
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const clientsFromServer = await getApi<Client[]>('/api/clients');
        
        if (Array.isArray(clientsFromServer)) {
          console.log(`Clientes obtidos do servidor: ${clientsFromServer.length}`);
          return clientsFromServer;
        } else {
          console.warn("Resposta do servidor não é um array, usando array vazio");
          return [];
        }
      } catch (serverError) {
        console.error("Erro ao buscar clientes do servidor:", serverError);
        return [];
      }
    },
    refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    refetchOnMount: true        // Sempre recarregar ao montar o componente
  });
  
  // Carregar veículos para o cliente selecionado - versão simplificada
  const { data: vehicles, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/clients', selectedClientId, 'vehicles'],
    queryFn: async () => {
      console.log("Buscando veículos para cliente:", selectedClientId);
      if (!selectedClientId) return [];
      
      const url = `/api/clients/${selectedClientId}/vehicles`;
      
      try {
        // Buscar dados da API
        const vehiclesData = await getApi<Vehicle[]>(url);
        console.log("Veículos obtidos da API:", vehiclesData?.length || 0);
        
        // Verificação de segurança para garantir que temos um array
        if (!Array.isArray(vehiclesData)) {
          return [];
        }
        
        return vehiclesData;
      } catch (error) {
        console.error("Erro ao carregar veículos:", error);
        return []; // Retornar array vazio em caso de erro
      }
    },
    enabled: !!selectedClientId,
    refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    refetchOnMount: true        // Sempre recarregar ao montar o componente
  });
  
  const { data: serviceTypes } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
    queryFn: async () => {
      try {
        return await getApi<ServiceType[]>('/api/service-types');
      } catch (error) {
        console.error("Erro ao carregar tipos de serviço:", error);
        return [];
      }
    }
  });
  
  const { data: technicians } = useQuery<User[]>({
    queryKey: ['/api/users?role=technician'],
    queryFn: async () => {
      try {
        return await getApi<User[]>('/api/users?role=technician');
      } catch (error) {
        console.error("Erro ao carregar técnicos:", error);
        return [];
      }
    }
  });

  // Estado para verificar se houve uma tentativa offline que falhou
  const [offlineAttemptFailed, setOfflineAttemptFailed] = useState(false);
  
  // Create service mutation - declaração da mutação de criação de serviço
  const createServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        // Verificar se estamos offline antes de tentar a requisição
        if (!navigator.onLine) {
          console.log("Detectada operação offline. Não é possível salvar sem conexão.");
          setOfflineAttemptFailed(true);
          throw new Error("OFFLINE_MODE");
        }
        
        // Format the datetime properly
        let formattedData = { ...data };
        
        // Tratamento especial para a data agendada
        if (formattedData.scheduled_date) {
          try {
            let dateToUse: Date;
            
            // Se já for string, converte para Date para manipular
            if (typeof formattedData.scheduled_date === 'string') {
              try {
                dateToUse = new Date(formattedData.scheduled_date);
              } catch (e) {
                // Se não conseguir converter a string, usa a data atual
                console.error("Erro ao converter string de data:", e);
                dateToUse = new Date();
              }
            } 
            // Se já for Date, usa diretamente
            else if (formattedData.scheduled_date instanceof Date) {
              dateToUse = formattedData.scheduled_date;
            }
            // Caso não seja nem string nem Date, usa a data atual
            else {
              dateToUse = new Date();
            }
            
            // Define meio-dia como horário padrão
            dateToUse.setHours(12, 0, 0, 0);
            
            // Se tiver horário específico, ajusta
            if (data.scheduled_time) {
              const [hours, minutes] = data.scheduled_time.split(':');
              dateToUse.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
            
            // Converte para ISO string para enviar ao servidor, mas mantém o tipo Date para o formulário
            const isoString = dateToUse.toISOString();
            // @ts-ignore - Ignorar erro de tipagem, a API espera string mas o form espera Date
            formattedData.scheduled_date = isoString;
            
            console.log("Data formatada:", formattedData.scheduled_date);
          } catch (error) {
            console.error("Erro ao processar data:", error);
            // Em caso de erro fatal, usa a data atual
            const fallbackDate = new Date().toISOString();
            // @ts-ignore - Ignorar erro de tipagem, a API espera string mas o form espera Date
            formattedData.scheduled_date = fallbackDate;
          }
        } else {
          // Se não tiver data, usa a data atual
          const defaultDate = new Date().toISOString();
          // @ts-ignore - Ignorar erro de tipagem, a API espera string mas o form espera Date
          formattedData.scheduled_date = defaultDate;
        }
        
        // Calculate total
        const price = formattedData.price !== undefined && formattedData.price !== null 
          ? formattedData.price 
          : 0;
        
        const administrativeFee = formattedData.administrative_fee !== undefined && formattedData.administrative_fee !== null 
          ? formattedData.administrative_fee 
          : 0;
        
        formattedData.total = price + administrativeFee;
        
        // Remover parâmetros desnecessários dos dados
        const { scheduled_time, ...serviceData } = formattedData;
        
        // Log de depuração
        console.log("Enviando dados:", JSON.stringify(serviceData, null, 2));
        
        // 1. Criar serviço usando o apiWrapper - sem suporte offline 
        // para garantir envio direto ao servidor
        console.log("Enviando serviço diretamente para o servidor...");
        const createdService = await postApi<any>('/api/services', serviceData, {
          enableOffline: false // Desativar suporte offline para garantir envio direto ao servidor
        });
        console.log("Resposta do servidor:", createdService);
        
        // Processar upload de fotos se houver fotos
        if (photos && photos.length > 0) {
          try {
            const serviceId = createdService.id;
            
            // Criar FormData para upload das fotos
            const formData = new FormData();
            
            // Foto sem classificação específica
            formData.append('photo_type', 'service');
            
            // Adicionar cada foto ao FormData
            for (let i = 0; i < photos.length; i++) {
              formData.append('photos', photos[i]);
            }
            
            console.log("Enviando fotos para o serviço:", serviceId);
            
            // Upload de fotos - apenas quando online
            const uploadRes = await fetch(`/api/services/${serviceId}/photos`, {
              method: 'POST',
              body: formData,
              credentials: 'include',
            });
            
            if (!uploadRes.ok) {
              console.error("Erro ao fazer upload das fotos:", await uploadRes.text());
              console.warn("Prosseguindo apesar do erro no upload de fotos");
            } else {
              const uploadData = await uploadRes.json();
              console.log("Resposta do upload:", uploadData);
            }
          } catch (photoError) {
            console.error("Erro ao processar fotos:", photoError);
            // Não lança erro para não impedir a criação do serviço
          }
        } else {
          console.log("Nenhuma foto selecionada para upload");
        }
        
        return createdService;
        
      } catch (error: any) {
        // Tentar obter os detalhes do erro
        console.error("Detalhes do erro:", error);
        if (error.response) {
          try {
            const errorData = await error.response.json();
            console.error("Erro detalhado da API:", errorData);
          } catch (e) {
            console.error("Não foi possível ler o corpo da resposta de erro");
          }
        }
        
        // ⚠️ IMPORTANTE: Garantir que o erro seja sempre propagado para o handler onError
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidar queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Notificar o usuário do sucesso
      toast({
        title: t("services.serviceCreated"),
        description: t("services.serviceCreatedSuccess"),
      });
      
      // Redirecionar para a lista de serviços
      setLocation('/services');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast({
        title: t("errors.createService"),
        description: t("errors.createServiceDescription"),
        variant: "destructive",
      });
    }
  });

  // Form definition
  // Criar um resolver personalizado que traduza as mensagens de erro
  const customResolver = async (data: any, context: any, options: any) => {
    // Usar o resolver do Zod, mas substituir as mensagens de erro por versões traduzidas
    const result = await zodResolver(formSchema)(data, context, options);
    
    if (result.errors) {
      // Para cada campo com erro, verificar se é um erro de campo obrigatório
      Object.entries(result.errors).forEach(([field, fieldError]) => {
        const error = fieldError as { message?: string };
        if (error && error.message === "Selecione um cliente") {
          error.message = t("services.errors.selectClient");
        } else if (error && error.message === "Selecione um veículo") {
          error.message = t("services.errors.selectVehicle");
        } else if (error && error.message === "Selecione o tipo de serviço") {
          error.message = t("services.errors.selectServiceType");
        }
      });
    }
    return result;
  };

  const form = useForm<FormData>({
    resolver: customResolver,
    defaultValues: {
      client_id: undefined,
      vehicle_id: undefined,
      vehicle_make: "",
      vehicle_model: "",
      vehicle_plate: "",
      vehicle_vin: "",
      service_type_id: undefined,
      technician_id: undefined,
      status: "pending",
      description: "",
      location_type: "client_location",
      price: 0,
      administrative_fee: 0,
      address: "",
      latitude: null,
      longitude: null,
      notes: "",
      scheduled_date: new Date(), // Data padrão é hoje
    },
  });
  
  // Auto-fill technician based on logged in user (if technician)
  useEffect(() => {
    if (user && technicians) {
      if (user.role === 'technician') {
        // Auto-assign the current user as technician
        form.setValue('technician_id', user.id);
      }
    }
  }, [user, technicians, form]);
  
  // Verificar regularmente o status da rede para atualizar o texto do botão
  useEffect(() => {
    // Verificar se estamos offline e resetar o estado da mutação se necessário
    const checkNetworkAndReset = () => {
      if (!navigator.onLine && offlineAttemptFailed) {
        console.log("Detectado offline e tentativa anterior falhou, resetando mutação");
        createServiceMutation.reset();
        setOfflineAttemptFailed(false);
      }
    };
    
    // Verificar status da rede inicial
    checkNetworkAndReset();
    
    // Adicionar listeners para eventos de online/offline
    window.addEventListener('online', checkNetworkAndReset);
    window.addEventListener('offline', checkNetworkAndReset);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', checkNetworkAndReset);
      window.removeEventListener('offline', checkNetworkAndReset);
    };
  }, [offlineAttemptFailed, createServiceMutation]);

  // Timeout de segurança para requisições de API
  useEffect(() => {
    // Configurar timeout de segurança para operações
    let timeoutId: number | null = null;
    
    if (createServiceMutation.isPending) {
      console.log("Configurando timeout de segurança para a mutação");
      timeoutId = window.setTimeout(() => {
        console.log("Timeout atingido! A operação não foi concluída em tempo hábil");
        if (createServiceMutation.isPending) {
          console.log("A mutação ainda está pendente, resetando-a para evitar bloqueio da UI");
          createServiceMutation.reset();
          
          toast({
            title: t("errors.timeout"),
            description: t("errors.operationTimeout"),
            variant: "destructive"
          });
        }
      }, 10000); // 10 segundos de timeout
    }
    
    console.log("Componente de novo serviço montado");
    
    // Remover listener quando o componente for desmontado
    return () => {
      // Limpar o timeout se existir
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [toast, createServiceMutation, t]);
  
  // Função que é chamada quando o formulário é enviado
  const onSubmit = async (data: FormData) => {
    console.log("Formulário enviado com os dados:", data);
    
    // Garantir que o service_type_id seja um dos valores válidos
    if (serviceTypes && !serviceTypes.some(type => type.id === data.service_type_id)) {
      toast({
        title: t("errors.validation"),
        description: t("errors.invalidServiceType", { values: serviceTypes.map(t => t.name).join(', ') }),
        variant: "destructive",
      });
      return;
    }
    
    // Log detalhado para depuração
    console.log("Enviando para criação, detalhes:", {
      client: clients?.find(c => c.id === data.client_id)?.name,
      vehicle_id: data.vehicle_id,
      vehicle_make: data.vehicle_make,
      vehicle_model: data.vehicle_model,
      vehicle_plate: data.vehicle_plate,
      vehicle_vin: data.vehicle_vin,
      serviceType: serviceTypes?.find(t => t.id === data.service_type_id)?.name,
    });

    // Verificar se estamos offline antes de tentar a requisição
    if (!navigator.onLine) {
      console.log("Detectada operação offline durante envio do formulário.");
      
      // Mostrar notificação que não é possível criar serviços offline
      toast({
        title: t("errors.networkError", "Erro de conexão"),
        description: t("errors.needConnectionToSave", "É necessário conexão com a internet para salvar serviços."),
        variant: "destructive"
      });
      
      return;
    }
    
    // Se online, iniciar a operação de criação do serviço
    createServiceMutation.mutate(data);
  };
  
  const handleClientChange = (clientId: string) => {
    const id = parseInt(clientId);
    setSelectedClientId(id);
    form.setValue("client_id", id);
    form.setValue("vehicle_id", null as any);
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("services.newService", "Novo Serviço")}
        description={t("services.newServiceDesc", "Cadastre um novo serviço de reparo sem pintura")}
        actions={
          <Button variant="outline" onClick={() => setLocation('/services')}>
            {t("common.cancel")}
          </Button>
        }
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Client and Vehicle Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("clients.clientInformation", "Informações do Cliente")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.client", "Cliente")} <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => handleClientChange(value)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("services.selectClient", "Selecione o cliente")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients
                          ?.filter(client => 
                            // Filtrar clientes excluídos (que contêm '[EXCLUÍDO]' no nome)
                            !client.name.includes('[EXCLUÍDO]') && 
                            !client.name.includes('[EXCLUIDO]')
                          )
                          .map((client) => (
                            <SelectItem 
                              key={client.id} 
                              value={client.id.toString()}
                              className={client._isOffline ? "text-blue-600 font-medium" : ""}
                            >
                              {client.name} - {client.phone} 
                              {client._isOffline && " [Offline]"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm"
                      onClick={() => setLocation('/clients/new')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t("clients.registerClient", "Cadastrar Cliente")}
                    </Button>
                  </FormItem>
                )}
              />
              
              {/* Campos de veículo digitados manualmente */}
              <div className="mt-4">
                <h3 className="font-medium text-sm mb-2">{t("clients.vehicle", "Informações do Veículo")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Marca do veículo */}
                  <FormField
                    control={form.control}
                    name="vehicle_make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("vehicles.make", "Marca")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t("vehicles.makeExample", "Ex: Toyota, Honda, etc.")}
                            disabled={!selectedClientId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Modelo do veículo */}
                  <FormField
                    control={form.control}
                    name="vehicle_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("vehicles.model", "Modelo")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t("vehicles.modelExample", "Ex: Corolla, Civic, etc.")}
                            disabled={!selectedClientId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Placa do veículo */}
                  <FormField
                    control={form.control}
                    name="vehicle_plate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("vehicles.plate", "Placa")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t("vehicles.platePlaceholder", "ABC-1234")}
                            disabled={!selectedClientId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Chassi do veículo */}
                  <FormField
                    control={form.control}
                    name="vehicle_vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("vehicles.vin", "Chassi")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t("vehicles.vinExample", "Número do chassi")}
                            disabled={!selectedClientId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("vehicles.requiredPlateOrVin", "Informe ao menos um dos campos: Placa ou Chassi")}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Service Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("services.serviceDetails", "Detalhes do Serviço")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="service_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.serviceType", "Tipo de Serviço")} <span className="text-red-500">*</span></FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const id = parseInt(value);
                          form.setValue('service_type_id', id);
                          
                          // Auto-fill price from service type if not manually changed
                          if (serviceTypes) {
                            const selectedType = serviceTypes.find(type => type.id === id);
                            if (selectedType && selectedType.default_price) {
                              form.setValue('price', selectedType.default_price);
                            }
                          }
                        }}
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
                              {type.default_price ? ` (€ ${type.default_price.toFixed(2)})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="technician_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.technician", "Técnico")}</FormLabel>
                      <Select
                        onValueChange={(value) => form.setValue('technician_id', parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("services.selectTechnician", "Selecione o técnico (opcional)")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id.toString()}>
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("services.technicianHelp", "Selecione o técnico responsável pelo serviço")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("services.description", "Descrição")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("services.descriptionPlaceholder", "Descreva o serviço a ser realizado...")}
                        rows={3}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("services.descriptionHelp", "Forneça detalhes sobre o serviço a ser realizado")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("services.date", "Data")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>{t("services.selectDate", "Selecione a data")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                

              </div>
            </CardContent>
          </Card>
          
          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("services.locationDetails", "Detalhes da Localização")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="location_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.locationType", "Tipo de Localização")}</FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="client_location"
                              checked={field.value === 'client_location'}
                              onCheckedChange={() => field.onChange('client_location')}
                            />
                            <label
                              htmlFor="client_location"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t("services.clientLocation", "Local do Cliente")}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="workshop"
                              checked={field.value === 'workshop'}
                              onCheckedChange={() => field.onChange('workshop')}
                            />
                            <label
                              htmlFor="workshop"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t("services.workshop", "Oficina")}
                            </label>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <LocationSelector 
                    onLocationChange={(address) => {
                      form.setValue('address', address);
                      // Coordenadas não são mais usadas
                      form.setValue('latitude', null);
                      form.setValue('longitude', null);
                    }}
                    initialAddress={form.watch('address') || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Financial Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("services.financialInfo", "Informações Financeiras")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.price", "Preço")} (€)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            form.setValue('price', isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="administrative_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("services.administrativeFee", "Taxa Administrativa")} (€)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            form.setValue('administrative_fee', isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium mb-2">{t("services.totalValue", "Valor Total")} (€)</span>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-gray-100 text-right">
                    {((form.watch('price') || 0) + (form.watch('administrative_fee') || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Photos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("services.photos", "Fotos")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                onPhotosSelected={(selectedPhotos) => setPhotos(selectedPhotos)}
                maxPhotos={5}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {t("services.photoHelp", "Adicione fotos do trabalho a ser realizado")}
              </p>
            </CardContent>
          </Card>
          

          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => setLocation('/services')}>
              {t("common.cancel", "Cancelar")}
            </Button>
            <Button 
              type="submit" 
              disabled={createServiceMutation.isPending || serviceSavedOffline}
            >
              {createServiceMutation.isPending || serviceSavedOffline 
                ? t("common.saving", "Salvando...") 
                : !navigator.onLine 
                  ? t("offline.saveOffline", "Salvar Offline") 
                  : t("common.save", "Salvar")
              }
            </Button>
          </div>
          
        </form>
      </Form>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getApi, postApi } from "@/lib/apiWrapper";
import { checkNetworkStatus } from "@/lib/pwaManager";
import offlineDb from "@/lib/offlineDb";
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
  vehicle_id: z.number({
    required_error: "Selecione um veículo", // Será substituído dinamicamente usando o t()
  }),
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
});

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
  
  // Carregar dados do cliente - estratégia completamente revisada
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients', { enableOffline: true, offlineTableName: 'clients' }],
    queryFn: async () => {
      // Array para armazenar todos os clientes (online + offline)
      let allClients: Client[] = [];
      const isOfflineNow = !navigator.onLine;
      
      console.log("Estado da rede ao buscar clientes:", isOfflineNow ? "OFFLINE" : "ONLINE");
      
      // 1. Primeiro tentar buscar do servidor/cache
      try {
        const clientsFromServer = await getApi<Client[]>('/api/clients', {
          enableOffline: true,
          offlineTableName: 'clients'
        });
        
        if (Array.isArray(clientsFromServer)) {
          console.log(`Clientes obtidos do servidor/cache: ${clientsFromServer.length}`);
          allClients = [...clientsFromServer];
        } else {
          console.warn("Resposta do servidor não é um array, usando array vazio");
        }
      } catch (serverError) {
        console.error("Erro ao buscar clientes do servidor:", serverError);
      }
      
      // 2. Buscar clientes pendentes no armazenamento offline (independente do estado da rede)
      try {
        // Buscar todas as requisições pendentes
        const { getPendingRequests, getAllFromTable } = await import('@/lib/offlineDb');
        const pendingClientsRequests = await getPendingRequests({
          tableName: 'clients',
          operationType: 'create'
        });
        
        console.log(`Requisições de clientes pendentes: ${pendingClientsRequests.length}`);
        
        // Converter requisições pendentes em objetos de cliente
        const pendingClients = pendingClientsRequests.map(item => {
          try {
            // ID temporário negativo para evitar conflitos
            const offlineId = typeof item.body.id === 'number' 
              ? item.body.id 
              : -(new Date(item.timestamp).getTime());
            
            return {
              ...item.body,
              id: offlineId,
              _isOffline: true,
              _pendingSync: true
            };
          } catch (e) {
            console.error("Erro ao processar cliente pendente:", e);
            return null;
          }
        }).filter(Boolean) as Client[];
        
        // 3. Também buscar clientes armazenados diretamente no IndexedDB
        try {
          const storedClients = await getAllFromTable('clients') || [];
          console.log(`Clientes na tabela offline: ${storedClients.length}`);
          
          // Mapear para o formato de cliente com flag offline
          const clientsFromStorage = storedClients.map(client => ({
            ...client,
            _isOffline: true,
            _fromStorage: true
          }));
          
          // Adicionar ao array de pendentes se não existirem
          clientsFromStorage.forEach(storedClient => {
            if (!pendingClients.some(c => c.id === storedClient.id)) {
              pendingClients.push(storedClient);
            }
          });
        } catch (storageError) {
          console.error("Erro ao buscar clientes do armazenamento:", storageError);
        }
        
        // 4. Adicionar clientes pendentes à lista principal, evitando duplicatas
        pendingClients.forEach(offlineClient => {
          if (!allClients.some(c => c.id === offlineClient.id)) {
            allClients.push(offlineClient);
          }
        });
      } catch (offlineError) {
        console.error("Erro ao buscar clientes offline:", offlineError);
      }
      
      // Log do resultado final
      console.log(`RESULTADO FINAL - Total de clientes: ${allClients.length}`);
      allClients.forEach((client, index) => {
        const status = client._isOffline ? "OFFLINE" : "ONLINE";
        console.log(`${index + 1}. Cliente ${client.id}: ${client.name} [${status}]`);
      });
      
      return allClients;
    },
    refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    refetchOnMount: true        // Sempre recarregar ao montar o componente
  });
  
  // Carregar veículos para o cliente selecionado - otimizado para garantir exibição dos veículos offline
  const { data: vehicles, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/clients', selectedClientId, 'vehicles', { enableOffline: true, offlineTableName: 'vehicles' }],
    queryFn: async () => {
      console.log("Buscando veículos para cliente:", selectedClientId);
      if (!selectedClientId) return [];
      
      const url = `/api/clients/${selectedClientId}/vehicles`;
      const isOfflineNow = !navigator.onLine;
      
      try {
        console.log("Estado da rede:", isOfflineNow ? "OFFLINE" : "ONLINE");
        
        // 1. Buscar dados da API/cache
        let vehiclesData: Vehicle[] = [];
        try {
          // Usar getApi com suporte a modo offline
          vehiclesData = await getApi<Vehicle[]>(url, {
            enableOffline: true,
            offlineTableName: 'vehicles'
          });
          console.log("Veículos obtidos da API/cache:", vehiclesData?.length || 0);
        } catch (apiError) {
          console.error("Erro ao buscar veículos da API:", apiError);
        }
        
        // Verificação de segurança para garantir que temos um array
        if (!Array.isArray(vehiclesData)) {
          vehiclesData = [];
        }
        
        // 2. Buscar TODAS as requisições offline pendentes (veículos criados recentemente)
        // Importante: Buscar sempre, não apenas no modo offline
        let pendingVehicles: any[] = [];
        try {
          const { getPendingRequests, getAllFromTable } = await import('@/lib/offlineDb');
          const offlineRequests = await getPendingRequests({
            tableName: 'vehicles',
            operationType: 'create'
          });
          
          console.log("Total de requisições veículos pendentes:", offlineRequests.length);
          
          // Filtrar apenas os veículos do cliente selecionado
          pendingVehicles = offlineRequests
            .filter(item => item.body && Number(item.body.client_id) === Number(selectedClientId))
            .map(item => {
              try {
                // ID temporário negativo para evitar conflitos
                const offlineId = typeof item.body.id === 'number' 
                  ? item.body.id 
                  : -(new Date(item.timestamp).getTime());
                
                return {
                  ...item.body,
                  id: offlineId,
                  _isOffline: true,
                  _pendingSync: true
                };
              } catch (e) {
                console.error("Erro ao processar veículo offline:", e);
                return null;
              }
            })
            .filter(Boolean);
          
          console.log("Veículos pendentes (filtrados):", pendingVehicles.length);
          
          // 3. Buscar registros diretamente da tabela offline
          // Cria uma promessa que busca os veículos com tratamento de erros
          try {
            console.log("Buscando veículos salvos na tabela offline...");
            // Usar a função para obter todos os veículos da tabela
            const storedVehicles = await getAllFromTable('vehicles') || [];
            console.log(`Veículos na tabela offline: ${storedVehicles.length}`);
            
            if (storedVehicles && storedVehicles.length > 0) {
              // Debug para verificar o conteúdo completo
              console.log("Conteúdo de todos os veículos offline:", JSON.stringify(storedVehicles).slice(0, 200) + "...");
              
              // Filtrar apenas os deste cliente com verificação mais robusta
              const filteredStoredVehicles = storedVehicles
                .filter(v => {
                  // Verificação segura dos tipos (aceita string e número)
                  try {
                    const vClientId = typeof v.client_id === 'string' ? parseInt(v.client_id) : v.client_id;
                    const selectedId = Number(selectedClientId);
                    const matches = vClientId === selectedId;
                    console.log(`Comparando client_id do veículo ${v.id}: ${vClientId} === ${selectedId}: ${matches}`);
                    return matches;
                  } catch (e) {
                    console.error("Erro ao comparar client_id do veículo:", e, v);
                    return false;
                  }
                })
                .map(v => ({
                  ...v,
                  _isOffline: true,
                  _fromStorage: true
                }));
              
              console.log(`Veículos armazenados (filtrados): ${filteredStoredVehicles.length}`);
              
              // Adicionar veículos armazenados com segurança
              filteredStoredVehicles.forEach(storedVehicle => {
                if (!pendingVehicles.some(v => v.id === storedVehicle.id)) {
                  pendingVehicles.push(storedVehicle);
                  console.log(`Adicionado veículo offline: ${storedVehicle.make} ${storedVehicle.model} (ID: ${storedVehicle.id})`);
                }
              });
            }
          } catch (storageError) {
            console.error("Erro ao buscar veículos do armazenamento:", storageError);
          }
        } catch (offlineError) {
          console.error("Erro ao buscar veículos offline:", offlineError);
        }
        
        // 4. Combinar resultados, removendo duplicatas
        const allVehicles: Vehicle[] = [...vehiclesData];
        
        // Adicionar veículos offline que não estão na lista (pelos IDs)
        pendingVehicles.forEach(offlineVehicle => {
          if (!allVehicles.some(v => v.id === offlineVehicle.id)) {
            allVehicles.push(offlineVehicle);
          }
        });
        
        console.log("RESULTADO FINAL - Veículos disponíveis:", allVehicles.length);
        allVehicles.forEach(v => {
          const status = v._isOffline ? "OFFLINE" : "ONLINE";
          console.log(`- Veículo ${v.id}: ${v.make} ${v.model} [${status}]`);
        });
        
        return allVehicles;
      } catch (error) {
        console.error("Erro crítico ao carregar veículos:", error);
        return []; // Último recurso: array vazio
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
        return await getApi<ServiceType[]>('/api/service-types', {
          enableOffline: true,
          offlineTableName: 'serviceTypes'
        });
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
        return await getApi<User[]>('/api/users?role=technician', {
          enableOffline: true,
          offlineTableName: 'users'
        });
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
        if (!navigator.onLine || !checkNetworkStatus()) {
          console.log("Detectada operação offline. Iniciando processamento offline...");
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
        
        // Verificar status da rede antes de iniciar
        const isOnline = checkNetworkStatus();
        console.log("Status da rede:", isOnline ? "Online" : "Offline");
        
        // 1. Criar serviço usando o apiWrapper para suporte offline
        const createdService = await postApi<any>('/api/services', serviceData, {
          enableOffline: true,
          offlineTableName: 'services'
        });
        console.log("Resposta do servidor ou cache local:", createdService);
        
        // Se estiver no modo offline, retornar imediatamente para evitar o loop
        if (!isOnline) {
          console.log("Modo offline: serviço criado localmente, saltando o upload de fotos");
          return { ...createdService, _offline: true };
        }
        
        // Processar upload de fotos se houver fotos e APENAS se estivermos online
        if (isOnline && photos && photos.length > 0) {
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
          console.log("Nenhuma foto selecionada para upload ou modo offline");
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
      // Verificar se estamos offline e o serviço foi salvo localmente
      const isOfflineData = data && data._offline === true;
      
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: t("services.serviceCreated"),
        description: isOfflineData 
          ? t("offline.willSyncWhenOnline") 
          : t("services.serviceCreatedSuccess"),
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

  // Adicionar um listener para mensagens do service worker
  useEffect(() => {
    function handleServiceWorkerMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;
      
      console.log("[SW Message]", event.data.type, event.data);
      
      // Quando receber notificação de operação offline iniciada ou enfileirada
      if (event.data.type === 'offline-operation-started' || event.data.type === 'operation-queued') {
        console.log("Operação offline processada, ID:", event.data.tempId);
        
        // Verificar se estamos em processo de salvamento
        const isMutationPending = createServiceMutation.isPending || document.querySelector('button[type="submit"]:disabled');
        
        if (isMutationPending) {
          console.log("Formulário em estado de salvamento, marcando como salvo offline");
          
          // Marcar como salvo offline 
          setServiceSavedOffline(true);
          
          // Mostrar notificação para o usuário
          toast({
            title: t("offline.savedOffline"),
            description: t("offline.serviceOfflineDescription"),
          });
          
          // Forçar redefinição do estado de mutação para permitir o usuário continuar
          createServiceMutation.reset();
          
          // Redirecionar para a lista após um pequeno tempo
          setTimeout(() => {
            setLocation('/services');
          }, 500);
        }
      }
    }
    
    // Configurar timeout de segurança para o caso do service worker não responder
    let timeoutId: number | null = null;
    
    if (createServiceMutation.isPending) {
      console.log("Configurando timeout de segurança para a mutação");
      timeoutId = window.setTimeout(() => {
        console.log("Timeout atingido! O service worker não respondeu em tempo hábil");
        if (createServiceMutation.isPending) {
          console.log("A mutação ainda está pendente, resetando-a para evitar bloqueio da UI");
          createServiceMutation.reset();
          
          // Verificar se estamos offline
          if (!navigator.onLine) {
            toast({
              title: t("offline.savedOffline"),
              description: t("offline.serviceOfflineDescription"),
            });
            
            // Redirecionar para evitar que o usuário fique preso
            setTimeout(() => {
              setLocation('/services');
            }, 500);
          }
        }
      }, 10000); // 10 segundos de timeout
    }
    
    // Adicionar listener quando o componente for montado
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      console.log("Registrando listener para mensagens do service worker");
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    } else {
      console.warn("Service worker não encontrado ou não ativo");
    }
    
    // Remover listener quando o componente for desmontado
    return () => {
      // Limpar o timeout se existir
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [toast, setLocation, createServiceMutation, t]);
  
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
      vehicle: vehicles?.find(v => v.id === data.vehicle_id)?.make,
      serviceType: serviceTypes?.find(t => t.id === data.service_type_id)?.name,
    });

    // Verificar se estamos offline antes de tentar a requisição
    if (!navigator.onLine) {
      console.log("Detectada operação offline durante envio do formulário.");
      
      try {
        // Formatar a data para ser consistente com a API
        let formattedData = { ...data };
        
        // Tratamento para a data agendada
        if (formattedData.scheduled_date) {
          try {
            const dateToUse = formattedData.scheduled_date instanceof Date 
              ? formattedData.scheduled_date 
              : new Date(formattedData.scheduled_date as string);
            
            // Define meio-dia como horário padrão ou usa o horário específico
            if (data.scheduled_time) {
              const [hours, minutes] = data.scheduled_time.split(':');
              dateToUse.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            } else {
              dateToUse.setHours(12, 0, 0, 0);
            }
            
            formattedData.scheduled_date = dateToUse.toISOString();
          } catch (error) {
            console.error("Erro ao processar data:", error);
            formattedData.scheduled_date = new Date().toISOString();
          }
        } else {
          formattedData.scheduled_date = new Date().toISOString();
        }
        
        // Calcular total
        const price = formattedData.price !== undefined && formattedData.price !== null 
          ? formattedData.price : 0;
        const administrativeFee = formattedData.administrative_fee !== undefined && formattedData.administrative_fee !== null 
          ? formattedData.administrative_fee : 0;
        formattedData.total = price + administrativeFee;
        
        // Remover parâmetros desnecessários
        const { scheduled_time, ...serviceData } = formattedData;
        
        // 1. Salvar no IndexedDB usando o apiWrapper
        const createdService = await postApi('/api/services', serviceData, {
          enableOffline: true,
          offlineTableName: 'services'
        });
        
        // 2. Atualizar diretamente o cache do React Query
        const currentServices = queryClient.getQueryData<any[]>(['/api/services', { enableOffline: true, offlineTableName: 'services' }]) || [];
        
        // Adicionar o serviço recém-criado à lista
        queryClient.setQueryData(['/api/services', { enableOffline: true, offlineTableName: 'services' }], [
          ...currentServices,
          {
            ...createdService,
            _isOffline: true,
            _pendingSync: true,
            // Adicionar dados relacionados para UI
            client: clients?.find(c => c.id === data.client_id),
            vehicle: vehicles?.find(v => v.id === data.vehicle_id),
            service_type: serviceTypes?.find(t => t.id === data.service_type_id),
            technician: technicians?.find(t => t.id === data.technician_id)
          }
        ]);
        
        // Atualizar também a query simplificada
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        
        // Mostrar notificação e marcar como salvo offline
        toast({
          title: t("offline.savedOffline"),
          description: t("offline.serviceOfflineDescription"),
        });
        
        // Resetar estado para permitir mais envios
        setOfflineAttemptFailed(false);
        
        // Redirecionar para a lista
        setTimeout(() => {
          setLocation('/services');
        }, 500);
        
        return;
      } catch (error) {
        console.error("Erro ao salvar offline:", error);
        setOfflineAttemptFailed(false);
        
        toast({
          title: t("errors.createService"),
          description: t("offline.errorSavingOffline"),
          variant: "destructive",
        });
        
        return;
      }
    }
    
    // Se online, iniciar a operação de criação do serviço normalmente
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
              
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.vehicle", "Veículo")} <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => form.setValue('vehicle_id', parseInt(value))}
                      value={field.value?.toString()}
                      disabled={!selectedClientId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedClientId ? t("services.selectVehicle", "Selecione o veículo") : t("services.selectClientFirst", "Selecione um cliente primeiro")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((vehicle) => (
                          <SelectItem 
                            key={vehicle.id} 
                            value={vehicle.id.toString()}
                            className={vehicle._isOffline ? "text-blue-600 font-medium" : ""}
                          >
                            {vehicle.make} {vehicle.model}
                            {vehicle._isOffline && " [Offline]"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedClientId && (
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => setLocation(`/clients/${selectedClientId}/vehicle/new`)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t("vehicles.registerVehicle", "Cadastrar Veículo")}
                      </Button>
                    )}
                  </FormItem>
                )}
              />
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
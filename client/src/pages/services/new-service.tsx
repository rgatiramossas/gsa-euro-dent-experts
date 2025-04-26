import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { LocationSelector } from "@/components/common/LocationSelector";
import { PhotoUpload } from "@/components/common/PhotoUpload";
import { Client, ServiceType, User, Vehicle } from "@/types";
import { insertServiceSchema } from "@shared/schema";

// Extend the schema with more validations
const formSchema = insertServiceSchema.extend({
  client_id: z.number({
    required_error: "O cliente é obrigatório"
  }),
  vehicle_id: z.number({
    required_error: "O veículo é obrigatório"
  }),
  service_type_id: z.number({
    required_error: "O tipo de serviço é obrigatório"
  }),
  location_type: z.enum(["client_location", "workshop"], {
    required_error: "A localização é obrigatória"
  }),
  scheduled_date: z.date({
    required_error: "A data é obrigatória"
  }).or(z.string()),  // Permitir tanto Date quanto string
  scheduled_time: z.string().optional(),
  status: z.string().default("pending"),
  price: z.number().optional().nullable(),
  displacement_fee: z.number().optional().nullable().default(0),
  // Campo para upload de fotos (apenas para o formulário, não é enviado diretamente)
  photos: z.any().optional(), // z.any() para permitir FileList
  // Garantir que campos opcionais não causem problemas
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewService() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  
  // Queries
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });
  
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: [selectedClientId ? `/api/clients/${selectedClientId}/vehicles` : null],
    enabled: !!selectedClientId,
  });
  
  const { data: serviceTypes } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
  });
  
  const { data: technicians } = useQuery<User[]>({
    queryKey: ['/api/users?role=technician'],
  });

  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: undefined,
      vehicle_id: undefined,
      service_type_id: undefined,
      technician_id: undefined,
      status: "pending",
      description: "",
      location_type: "client_location",
      price: 0,
      displacement_fee: 0,
      // photos removido
      address: "",
      latitude: null,
      longitude: null,
      notes: "",
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
  
  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
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
          
          // Converte para ISO string para enviar ao servidor
          formattedData.scheduled_date = dateToUse.toISOString();
          
          console.log("Data formatada:", formattedData.scheduled_date);
        } catch (error) {
          console.error("Erro ao processar data:", error);
          // Em caso de erro fatal, usa a data atual
          formattedData.scheduled_date = new Date().toISOString();
        }
      } else {
        // Se não tiver data, usa a data atual
        formattedData.scheduled_date = new Date().toISOString();
      }
      
      // Calculate total
      const price = formattedData.price !== undefined && formattedData.price !== null 
        ? formattedData.price 
        : 0;
      
      const displacementFee = formattedData.displacement_fee !== undefined && formattedData.displacement_fee !== null 
        ? formattedData.displacement_fee 
        : 0;
      
      formattedData.total = price + displacementFee;
      
      // Remover parâmetros desnecessários dos dados
      const { scheduled_time, photos, ...serviceData } = formattedData;
      
      // Log de depuração
      console.log("Enviando dados:", JSON.stringify(serviceData, null, 2));
      
      try {
        // 1. Criar serviço
        const createdService = await apiRequest('/api/services', 'POST', serviceData);
        console.log("Resposta do servidor:", createdService);
        
        // Processar upload de fotos se houver
        console.log("Serviço criado com sucesso, verificando fotos para upload");
        
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
            
            // Fazer o upload das fotos
            const uploadRes = await fetch(`/api/services/${serviceId}/photos`, {
              method: 'POST',
              body: formData,
              // Não definir Content-Type, pois o browser vai definir automaticamente com o boundary correto
            });
            
            if (!uploadRes.ok) {
              console.error("Erro ao fazer upload das fotos:", await uploadRes.text());
              // Não lança erro para não impedir a criação do serviço
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
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso",
      });
      setLocation('/services');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast({
        title: "Erro ao criar serviço",
        description: "Ocorreu um erro ao criar o serviço. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormData) => {
    console.log("Formulário enviado com os dados:", data);
    
    // Garantir que o service_type_id seja um dos valores válidos
    if (serviceTypes && !serviceTypes.some(type => type.id === data.service_type_id)) {
      toast({
        title: "Erro de validação",
        description: `Tipo de serviço inválido. Valores disponíveis: ${serviceTypes.map(t => `${t.name} (${t.id})`).join(', ')}`,
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
    
    createServiceMutation.mutate(data);
  };
  
  const handleClientChange = (clientId: string) => {
    const id = parseInt(clientId);
    setSelectedClientId(id);
    form.setValue("client_id", id);
    form.setValue("vehicle_id", undefined);
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Novo Serviço"
        description="Cadastre um novo serviço de martelinho de ouro"
        actions={
          <Button variant="outline" onClick={() => setLocation('/services')}>
            Cancelar
          </Button>
        }
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Client and Vehicle Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => handleClientChange(value)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name} - {client.phone}
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
                      Cadastrar novo cliente
                    </Button>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => form.setValue('vehicle_id', parseInt(value))}
                      defaultValue={field.value?.toString()}
                      disabled={!selectedClientId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedClientId ? "Selecione o veículo" : "Selecione um cliente primeiro"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.make} {vehicle.model}
                            {vehicle.license_plate && ` - ${vehicle.license_plate}`}
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
                        Cadastrar novo veículo
                      </Button>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Service Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Informações do Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="service_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => form.setValue('service_type_id', parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} (ID: {type.id})
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Problema</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descreva o problema em detalhes..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico Responsável</FormLabel>
                    {user?.role === 'technician' ? (
                      <FormControl>
                        <Input 
                          value={user?.name || ''}
                          disabled
                        />
                      </FormControl>
                    ) : (
                      <Select
                        onValueChange={(value) => form.setValue('technician_id', parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o técnico" />
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
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data <span className="text-red-500">*</span></FormLabel>
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
                                format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
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
                            initialFocus
                            locale={ptBR}
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
          
          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização <span className="text-red-500">*</span></FormLabel>
                    <LocationSelector
                      value={{
                        locationType: field.value as "client_location" | "workshop",
                        address: form.getValues().address || '',
                        latitude: form.getValues().latitude || undefined,
                        longitude: form.getValues().longitude || undefined,
                      }}
                      onChange={(value) => {
                        form.setValue("location_type", value.locationType);
                        form.setValue("address", value.address || '');
                        form.setValue("latitude", value.latitude || null);
                        form.setValue("longitude", value.longitude || null);
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Photos Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="photos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fotos do veículo (até 4 fotos)</FormLabel>
                      <FormControl>
                        <PhotoUpload
                          label="fotos-veiculo"
                          multiple={true}
                          maxFiles={4}
                          onChange={(files) => {
                            field.onChange(files);
                            setPhotos(files);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Adicione fotos para documentar o estado do veículo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Price */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'sm:grid-cols-2' : ''} gap-4`}>
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor do Serviço (€)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                          value={field.value !== undefined ? field.value?.toFixed(2) : '0.00'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {user?.role === 'admin' && (
                  <FormField
                    control={form.control}
                    name="displacement_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Administrativo (€)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            value={field.value !== undefined ? field.value?.toFixed(2) : '0.00'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Observações Adicionais</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações sobre o orçamento..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setLocation('/services')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createServiceMutation.isPending}
            >
              {createServiceMutation.isPending ? "Salvando..." : "Salvar Serviço"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

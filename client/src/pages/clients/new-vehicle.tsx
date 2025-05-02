import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Form,
  FormControl,
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
import { Input } from "@/components/ui/input";
import { Client } from "@/types";
import { insertVehicleSchema } from "@shared/schema.mysql";
import { storeOfflineRequest } from "@/lib/offlineDb";
import { useTranslation } from "react-i18next";

// Use o schema original sem estender com year
const formSchema = insertVehicleSchema;

type FormData = z.infer<typeof formSchema>;

interface NewVehicleProps {
  clientId: string;
}

export default function NewVehicle({ clientId }: NewVehicleProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Efeito para detectar mudanças no estado da conexão
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Limpar timeout ao desmontar
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);
  
  // Get client details
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
  });
  
  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: parseInt(clientId),
      make: "",
      model: "",
      color: "",
      license_plate: "",
      vin: "",
    },
  });
  
  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('/api/vehicles', 'POST', data);
    },
    onSuccess: (data) => {
      // Invalidar as queries para atualizar os dados quando estiver online
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/vehicles`] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      
      // Atualizar manualmente o cache para garantir que seja exibido imediatamente
      // mesmo que a invalidação falhe por algum motivo
      
      // 1. Atualizar a lista de veículos do cliente específico
      const clientVehiclesQueryKey = [`/api/clients/${clientId}/vehicles`];
      const clientVehiclesData = queryClient.getQueryData<any>(clientVehiclesQueryKey);
      
      if (clientVehiclesData) {
        // Se o formato for um array direto
        if (Array.isArray(clientVehiclesData)) {
          queryClient.setQueryData(
            clientVehiclesQueryKey,
            [...clientVehiclesData, data]
          );
        } 
        // Se o formato for { data: [...], total: number }
        else if (clientVehiclesData.data && Array.isArray(clientVehiclesData.data)) {
          queryClient.setQueryData(
            clientVehiclesQueryKey,
            {
              ...clientVehiclesData,
              data: [...clientVehiclesData.data, data],
              total: (clientVehiclesData.total || 0) + 1
            }
          );
        }
      }
      
      // 2. Atualizar a lista global de veículos (se existir no cache)
      const allVehiclesQueryKey = ['/api/vehicles'];
      const allVehiclesData = queryClient.getQueryData<any>(allVehiclesQueryKey);
      
      if (allVehiclesData) {
        // Se o formato for um array direto
        if (Array.isArray(allVehiclesData)) {
          queryClient.setQueryData(
            allVehiclesQueryKey,
            [...allVehiclesData, data]
          );
        } 
        // Se o formato for { data: [...], total: number }
        else if (allVehiclesData.data && Array.isArray(allVehiclesData.data)) {
          queryClient.setQueryData(
            allVehiclesQueryKey,
            {
              ...allVehiclesData,
              data: [...allVehiclesData.data, data],
              total: (allVehiclesData.total || 0) + 1
            }
          );
        }
      }
      
      toast({
        title: t("vehicles.vehicleRegistered", "Veículo cadastrado"),
        description: t("vehicles.vehicleRegisteredDesc", "O veículo foi cadastrado com sucesso"),
      });
      setIsSaving(false);
      setLocation('/clients');
    },
    onError: (error) => {
      console.error('Error creating vehicle:', error);
      toast({
        title: t("vehicles.errorRegistering", "Erro ao cadastrar veículo"),
        description: t("vehicles.errorRegisteringDesc", "Ocorreu um erro ao cadastrar o veículo. Verifique os dados e tente novamente."),
        variant: "destructive",
      });
      setIsSaving(false);
    }
  });
  
  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    
    // Limpar timeout anterior se existir
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    
    // Verificar o estado da conexão usando a variável isOffline
    if (isOffline) {
      try {
        // Salvar localmente no IndexedDB
        const timestamp = new Date().getTime();
        const tempId = -timestamp; // ID temporário negativo para identificar itens offline
        
        // Criar veículo temporário com ID negativo para o cache
        const tempVehicle = {
          id: tempId,
          client_id: Number(clientId),
          make: data.make,
          model: data.model,
          color: data.color || "",
          license_plate: data.license_plate || "",
          vin: data.vin || "",
          notes: data.notes || "",
          _isOffline: true,
          created_at: new Date().toISOString()
        };
        
        // Modificar os dados para salvar o ID temporário
        const offlineData = {
          ...data,
          id: tempId,
          _isOffline: true
        };
        
        const pendingRequest = {
          id: `vehicle_${timestamp}`,
          timestamp,
          url: '/api/vehicles',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: offlineData,
          tableName: 'vehicles',
          operationType: 'create' as const
        };
        
        // Salvar a requisição pendente para sincronização posterior
        await storeOfflineRequest(pendingRequest);
        
        // Atualizar o cache para mostrar o veículo imediatamente em todas as listas/views
        
        // 1. Atualizar a lista de veículos do cliente específico
        const clientVehiclesQueryKey = [`/api/clients/${clientId}/vehicles`];
        const clientVehiclesData = queryClient.getQueryData<any>(clientVehiclesQueryKey);
        
        if (clientVehiclesData) {
          // Se o formato for um array direto
          if (Array.isArray(clientVehiclesData)) {
            queryClient.setQueryData(
              clientVehiclesQueryKey,
              [...clientVehiclesData, tempVehicle]
            );
          } 
          // Se o formato for { data: [...], total: number }
          else if (clientVehiclesData.data && Array.isArray(clientVehiclesData.data)) {
            queryClient.setQueryData(
              clientVehiclesQueryKey,
              {
                ...clientVehiclesData,
                data: [...clientVehiclesData.data, tempVehicle],
                total: (clientVehiclesData.total || 0) + 1
              }
            );
          }
        }
        
        // 2. Atualizar a lista global de veículos (se existir no cache)
        const allVehiclesQueryKey = ['/api/vehicles'];
        const allVehiclesData = queryClient.getQueryData<any>(allVehiclesQueryKey);
        
        if (allVehiclesData) {
          // Se o formato for um array direto
          if (Array.isArray(allVehiclesData)) {
            queryClient.setQueryData(
              allVehiclesQueryKey,
              [...allVehiclesData, tempVehicle]
            );
          } 
          // Se o formato for { data: [...], total: number }
          else if (allVehiclesData.data && Array.isArray(allVehiclesData.data)) {
            queryClient.setQueryData(
              allVehiclesQueryKey,
              {
                ...allVehiclesData,
                data: [...allVehiclesData.data, tempVehicle],
                total: (allVehiclesData.total || 0) + 1
              }
            );
          }
        }
        
        toast({
          title: t("vehicles.savedOffline", "Veículo salvo offline"),
          description: t("vehicles.savedOfflineDesc", "O veículo foi salvo localmente e será sincronizado quando a conexão for restaurada"),
        });
        
        // Redirecionar após o cadastro offline
        setIsSaving(false);
        setLocation('/clients');
      } catch (error) {
        console.error('Erro ao salvar veículo offline:', error);
        toast({
          title: t("vehicles.errorSavingOffline", "Erro ao salvar offline"),
          description: t("vehicles.errorSavingOfflineDesc", "Não foi possível salvar o veículo localmente. Tente novamente."),
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } else {
      // Processamento online normal
      createVehicleMutation.mutate(data);
      
      // Configurar timeout para resetar o estado de salvamento (caso ocorra um erro não tratado)
      const timeout = setTimeout(() => {
        setIsSaving(false);
      }, 10000); // 10 segundos
      
      setSaveTimeout(timeout);
    }
  };
  
  if (isLoadingClient) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("vehicles.newVehicle", "Novo Veículo")}
        description={t("vehicles.newVehicleDesc", `Cadastre um novo veículo para ${client?.name || "cliente"}`)}
        actions={
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            {t("common.cancel", "Cancelar")}
          </Button>
        }
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("vehicles.vehicleInformation", "Informações do Veículo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("vehicles.make", "Marca")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("vehicles.makePlaceholder", "Ex: Honda, Toyota, etc.")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("vehicles.model", "Modelo")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("vehicles.modelPlaceholder", "Ex: Civic, Corolla, etc.")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field: { value, onChange, ...rest } }) => (
                    <FormItem>
                      <FormLabel>{t("vehicles.color", "Cor")}</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder={t("vehicles.colorPlaceholder", "Ex: Preto, Prata, etc.")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="license_plate"
                  render={({ field: { value, onChange, ...rest } }) => (
                    <FormItem>
                      <FormLabel>{t("vehicles.licensePlate", "Placa")}</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder={t("vehicles.licensePlatePlaceholder", "Ex: ABC-1234")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field: { value, onChange, ...rest } }) => (
                    <FormItem>
                      <FormLabel>{t("vehicles.vin", "Chassi (VIN)")}</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder={t("vehicles.vinPlaceholder", "Número do chassi")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              

            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setLocation('/clients')}
            >
              {t("common.cancel", "Cancelar")}
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createVehicleMutation.isPending || isSaving}
            >
              {createVehicleMutation.isPending || isSaving 
                ? t("common.saving", "Salvando...") 
                : !isOffline
                  ? t("vehicles.registerVehicle", "Cadastrar Veículo")
                  : t("vehicles.saveOffline", "Salvar Offline")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

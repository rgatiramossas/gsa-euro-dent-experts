import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { useTranslation } from "react-i18next";
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
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { insertClientSchema } from "@shared/schema.mysql";

// Esquema simplificado para o formulário
const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal(""))
});

type FormData = z.infer<typeof formSchema>;

export default function NewClient() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });
  
  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Enviando dados:", data);
      return await apiRequest('/api/clients', 'POST', data);
    },
    onSuccess: (data) => {
      console.log("Cliente criado com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Cliente cadastrado",
        description: "O cliente foi cadastrado com sucesso",
      });
      setLocation('/clients');
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast({
        title: "Erro ao cadastrar cliente",
        description: "Ocorreu um erro ao cadastrar o cliente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Função para obter a localização atual
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocalização não é suportada pelo seu navegador");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Usar a API OpenStreetMap Nominatim para geocodificação reversa
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'User-Agent': 'EurodentApp/1.0'
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Falha ao obter endereço');
          }
          
          const data = await response.json();
          console.log('Geocode data:', data);
          
          // Extrair informações úteis da resposta
          const address = data.address;
          const streetAddress = [
            address.road,
            address.house_number ? `, ${address.house_number}` : '',
            address.suburb ? ` - ${address.suburb}` : ''
          ].join('');
          
          // Preencher o campo do formulário
          form.setValue("address", streetAddress || `Próximo a ${data.display_name}`);
          
          toast({
            title: "Localização obtida",
            description: "Endereço preenchido automaticamente",
          });
        } catch (error) {
          console.error('Erro ao obter endereço:', error);
          // Fallback para o formato de coordenadas caso o geocoding falhe
          const locationString = `Localização atual (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          form.setValue("address", locationString);
          
          toast({
            title: "Localização obtida parcialmente",
            description: "Não foi possível determinar o endereço completo, usando coordenadas.",
            variant: "destructive"
          });
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão para geolocalização negada pelo usuário";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informações de localização indisponíveis";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado para obter localização";
            break;
          default:
            errorMessage = "Erro desconhecido ao obter localização";
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      }
    );
  };
  
  const onSubmit = (data: FormData) => {
    // Limpar dados vazios para evitar problemas com MySQL
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Garantir que o nome esteja presente
    if (!cleanData.name || cleanData.name.trim() === '') {
      form.setError('name', { message: 'O nome é obrigatório' });
      return;
    }
    
    console.log("Enviando dados limpos:", cleanData);
    createClientMutation.mutate(cleanData as FormData);
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("clients.newClient")}
        description={t("clients.newClientDesc", "Cadastre um novo cliente (formulário simplificado)")}
        actions={
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            {t("common.cancel")}
          </Button>
        }
      />
      
      <Card className="mt-6 mb-4">
        <CardHeader>
          <CardTitle>{t("clients.simplifiedForm", "Formulário Simplificado")}</CardTitle>
          <CardDescription>
            {t("clients.simplifiedFormDesc", "Este é o formulário simplificado para cadastro de clientes, focando apenas nas informações essenciais.")}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("clients.clientInformation", "Informações do Cliente")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.fullName", "Nome Completo")}*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("clients.clientNamePlaceholder", "Nome do cliente")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.email", "Email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={t("clients.emailPlaceholder", "email@exemplo.com")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.phone", "Telefone")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("clients.phonePlaceholder", "(00) 00000-0000")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.address", "Endereço")}</FormLabel>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <FormControl>
                          <Input {...field} placeholder={t("clients.addressPlaceholder", "Endereço completo")} />
                        </FormControl>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isGettingLocation ? "Obtendo..." : "Localização"}
                      </Button>
                    </div>
                    {locationError && (
                      <p className="text-sm text-red-500 mt-1">{locationError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setLocation('/clients')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? "Salvando..." : "Cadastrar Cliente"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

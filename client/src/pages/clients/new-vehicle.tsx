import React from "react";
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
import { insertVehicleSchema } from "@shared/schema";

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
      year: new Date().getFullYear(), // Ano atual como padrão
      color: "",
      license_plate: "",
      vin: "",
    },
  });
  
  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/vehicles', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/vehicles`] });
      toast({
        title: "Veículo cadastrado",
        description: "O veículo foi cadastrado com sucesso",
      });
      setLocation('/clients');
    },
    onError: (error) => {
      console.error('Error creating vehicle:', error);
      toast({
        title: "Erro ao cadastrar veículo",
        description: "Ocorreu um erro ao cadastrar o veículo. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormData) => {
    createVehicleMutation.mutate(data);
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
        title="Novo Veículo"
        description={`Cadastre um novo veículo para ${client?.name || "cliente"}`}
        actions={
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            Cancelar
          </Button>
        }
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Informações do Veículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Honda, Toyota, etc." />
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
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Civic, Corolla, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          placeholder="Ex: 2022"
                          min={1900}
                          max={new Date().getFullYear() + 1}
                        />
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
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder="Ex: Preto, Prata, etc." 
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
                      <FormLabel>Placa</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder="Ex: ABC-1234" 
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
                      <FormLabel>Chassi (VIN)</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest} 
                          value={value as string || ''} 
                          onChange={(e) => onChange(e.target.value)}
                          placeholder="Número do chassi" 
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
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createVehicleMutation.isPending}
            >
              {createVehicleMutation.isPending ? "Salvando..." : "Cadastrar Veículo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

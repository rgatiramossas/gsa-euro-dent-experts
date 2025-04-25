import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { insertClientSchema } from "@shared/schema";

// Extend the schema with more validations
const formSchema = insertClientSchema.extend({
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos"),
});

type FormData = z.infer<typeof formSchema>;

export default function NewClient() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
    },
  });
  
  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/clients', data);
      return res.json();
    },
    onSuccess: () => {
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
  
  const onSubmit = (data: FormData) => {
    createClientMutation.mutate(data);
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Novo Cliente"
        description="Cadastre um novo cliente"
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
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do cliente" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemplo.com" />
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
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(11) 98765-4321" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rua, número, complemento" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Estado" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00000-000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações adicionais sobre o cliente"
                        rows={3}
                      />
                    </FormControl>
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

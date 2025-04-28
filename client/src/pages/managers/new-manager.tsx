import React, { useState } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { insertUserSchema } from "@shared/schema.mysql";
import { ClientSelector } from "@/components/forms/ClientSelector";

// Extend the schema with more validations
const formSchema = insertUserSchema.extend({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
  // Aqui ajustamos: o active será 1 para true e 0 para false
  active: z.union([z.number(), z.boolean()]).transform(val => 
    typeof val === 'boolean' ? (val ? 1 : 0) : val
  ).default(1),
}).refine((data) => {
  return data.password === data.confirmPassword;
}, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface NewManagerProps {
  isEditMode?: boolean;
}

export default function NewManager({ isEditMode = false }: NewManagerProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Obter o ID do gestor da URL se estivermos no modo de edição
  const managerId = isEditMode ? location.split('/')[2] : null;
  
  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      role: "gestor", // Defina como gestor
      active: 1, // Use 1 (número) em vez de true (booleano)
    },
  });
  
  // Carregar dados do gestor quando estiver em modo de edição
  React.useEffect(() => {
    if (isEditMode && managerId) {
      setLoading(true);
      
      const fetchManagerData = async () => {
        try {
          const response = await fetch(`/api/users/${managerId}`);
          if (!response.ok) {
            throw new Error('Falha ao carregar dados do gestor');
          }
          
          const managerData = await response.json();
          
          // Preencher o formulário com os dados existentes
          form.reset({
            name: managerData.name || "",
            username: managerData.username || "",
            email: managerData.email || "",
            phone: managerData.phone || "",
            password: "",  // Deixe a senha em branco para edição
            confirmPassword: "",  // Deixe a confirmação de senha em branco
            role: "gestor",
            active: managerData.active,
          });
          
          // Carregar clientes atribuídos a este gestor
          if (managerData.client_ids && Array.isArray(managerData.client_ids)) {
            setSelectedClientIds(managerData.client_ids);
          }
        } catch (error: any) {
          console.error('Erro ao carregar gestor:', error);
          toast({
            title: "Erro",
            description: `Erro ao carregar dados do gestor: ${error.message}`,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchManagerData();
    }
  }, [isEditMode, managerId, form, toast]);
  
  // Mutation para criar ou atualizar gestor
  const managerMutation = useMutation({
    mutationFn: async (data: Omit<FormData, "confirmPassword"> & { client_ids?: number[] }) => {
      // Se estiver em modo de edição, atualiza o gestor existente
      if (isEditMode && managerId) {
        // Se a senha estiver vazia em modo de edição, remova-a para não atualizá-la
        if (!data.password) {
          const { password, ...restData } = data;
          return await apiRequest(`/api/users/${managerId}`, 'PATCH', restData);
        }
        
        return await apiRequest(`/api/users/${managerId}`, 'PATCH', data);
      }
      
      // Caso contrário, cria um novo gestor
      return await apiRequest('/api/users', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: isEditMode ? "Gestor atualizado" : "Gestor cadastrado",
        description: isEditMode 
          ? "O gestor foi atualizado com sucesso" 
          : "O gestor foi cadastrado com sucesso",
      });
      setLocation('/managers');
    },
    onError: (error) => {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} manager:`, error);
      toast({
        title: `Erro ao ${isEditMode ? 'atualizar' : 'cadastrar'} gestor`,
        description: `Ocorreu um erro ao ${isEditMode ? 'atualizar' : 'cadastrar'} o gestor. Verifique os dados e tente novamente.`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormData) => {
    // Remove confirmPassword from the data before sending to the API
    const { confirmPassword, ...managerData } = data;
    
    // Adicione cabeçalhos de autenticação e IDs dos clientes selecionados
    console.log("Enviando dados para API:", JSON.stringify({
      ...managerData,
      client_ids: selectedClientIds.length > 0 ? selectedClientIds : undefined
    }));
    
    managerMutation.mutate({ 
      ...managerData, 
      client_ids: selectedClientIds.length > 0 ? selectedClientIds : undefined 
    });
  };
  
  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Novo Gestor"
          description="Cadastre um novo gestor para gerenciar clientes"
        />
        
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-900">Acesso Restrito</h3>
            <p className="mt-2 text-gray-500">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={isEditMode ? "Editar Gestor" : "Novo Gestor"}
        description={isEditMode 
          ? "Atualize as informações do gestor e seus clientes atribuídos" 
          : "Cadastre um novo gestor para gerenciar clientes específicos"}
        actions={
          <Button variant="outline" onClick={() => setLocation('/managers')}>
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
                      <Input {...field} placeholder="Nome do gestor" />
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
              <CardTitle>Credenciais de Acesso</CardTitle>
              {isEditMode && (
                <CardDescription>
                  Deixe os campos de senha em branco para manter a senha atual
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="nome.usuario" />
                    </FormControl>
                    <FormDescription>
                      O nome de usuário será utilizado para login no sistema
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="********" />
                      </FormControl>
                      <FormDescription>
                        Mínimo de 8 caracteres
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="********" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Status da Conta
                      </FormLabel>
                      <FormDescription>
                        Ative para permitir acesso ao sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Atribuição de Clientes</CardTitle>
              <CardDescription>
                Selecione os clientes que este gestor poderá visualizar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientSelector 
                selectedClientIds={selectedClientIds}
                onSelectClient={setSelectedClientIds}
              />
            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setLocation('/managers')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={managerMutation.isPending}
            >
              {managerMutation.isPending 
                ? "Salvando..." 
                : isEditMode ? "Atualizar Gestor" : "Cadastrar Gestor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
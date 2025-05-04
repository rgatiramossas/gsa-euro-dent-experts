import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, patchApi } from "@/lib/queryClient";
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
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { insertUserSchema } from "@shared/schema.mysql";
import { User } from "@/types";

// Esquema de validação simplificado para edição de técnico
const formSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string().default("technician"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function EditTechnician() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  // Fetch technician data
  const { data: technician, isLoading: isLoadingTechnician } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do técnico');
      }
      return response.json();
    },
    enabled: !!id,
  });
  
  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: id,
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      role: "technician",
      active: true,
    },
  });
  
  // Update form when technician data is loaded
  useEffect(() => {
    if (technician) {
      form.reset({
        id: technician.id,
        username: technician.username,
        name: technician.name,
        email: technician.email || "",
        phone: technician.phone || "",
        role: "technician",
        password: "",
        confirmPassword: "",
        active: technician.active || false,
      });
    }
  }, [technician, form]);
  
  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log(`[DEBUG] Enviando PATCH para /api/users/${id} com dados:`, data);
      console.log(`[DEBUG] URL completa: /api/users/${id}`);
      console.log(`[DEBUG] Método: PATCH`);
      console.log(`[DEBUG] Dados convertidos para JSON:`, JSON.stringify(data));
      
      try {
        // Tentar usar fetch diretamente com todos os parâmetros necessários
        const response = await fetch(`/api/users/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        
        console.log("[DEBUG] Status da resposta:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[DEBUG] Erro na resposta:", errorText);
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log("[DEBUG] Resultado da atualização:", result);
        return result;
      } catch (error) {
        console.error("[DEBUG] Erro ao enviar requisição PATCH:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Técnico atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
      toast({
        title: "Técnico atualizado",
        description: "Os dados do técnico foram atualizados com sucesso",
      });
      setLocation('/technicians');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar técnico:', error);
      toast({
        title: "Erro ao atualizar técnico",
        description: error?.message || "Ocorreu um erro ao atualizar os dados do técnico. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = async (data: FormData) => {
    console.log("[DEBUG] INÍCIO - onSubmit chamado com dados:", data);
    console.log("[DEBUG] Estado do formulário:", form.formState);
    console.log("[DEBUG] Erros do formulário:", form.formState.errors);
    
    try {
      // Remove confirmPassword from the data before sending to the API
      const { confirmPassword, ...technicianDataRaw } = data;
      
      console.log("[DEBUG] Dados após remover confirmPassword:", technicianDataRaw);
      
      // Se a senha estiver vazia, não enviar esse campo para o servidor
      if (!technicianDataRaw.password) {
        delete technicianDataRaw.password;
        console.log("[DEBUG] Senha vazia removida dos dados");
      }
      
      // Converter o campo active de boolean para número (0/1) para compatibilidade com o MySQL
      const technicianData = {
        ...technicianDataRaw,
        active: technicianDataRaw.active ? 1 : 0 // Converte boolean para 0/1
      };
      
      console.log("[DEBUG] Dados finais para envio:", technicianData);
      console.log(`[DEBUG] Chamando mutação para atualizar técnico ID ${id}`);
      
      // Chamar a mutação para atualizar os dados
      updateTechnicianMutation.mutate(technicianData);
    } catch (error) {
      console.error("[DEBUG] ERRO ao processar formulário:", error);
      console.error("[DEBUG] Stack trace:", (error as Error).stack);
      toast({
        title: "Erro ao processar formulário",
        description: "Ocorreu um erro ao processar os dados do formulário. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      console.log("[DEBUG] FIM - onSubmit finalizado");
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Editar Técnico"
          description="Atualize os dados de um técnico existente"
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
  
  if (isLoadingTechnician) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Editar Técnico"
          description="Atualize os dados de um técnico existente"
        />
        
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
            <p className="mt-4 text-gray-500">Carregando dados do técnico...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Editar Técnico"
        description="Atualize os dados de um técnico existente"
        actions={
          <Button variant="outline" onClick={() => setLocation('/technicians')}>
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
                      <Input {...field} placeholder="Nome do técnico" />
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
                      <FormLabel>Nova Senha (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Deixe em branco para manter a senha atual" />
                      </FormControl>
                      <FormDescription>
                        Deixe em branco para manter a senha atual
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
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Confirme a nova senha" />
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
              onClick={() => setLocation('/technicians')}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              className="flex-1"
              disabled={updateTechnicianMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                console.log("[DEBUG] Botão Atualizar Técnico clicado");
                console.log("[DEBUG] Valores atuais do formulário:", form.getValues());
                
                // Forçar submissão direta para testar
                const formData = form.getValues();
                console.log("[DEBUG] Chamando onSubmit diretamente com dados:", formData);
                
                // Remover confirmPassword
                const { confirmPassword, ...userData } = formData;
                
                // Se a senha estiver vazia, não enviar
                if (!userData.password) {
                  delete userData.password;
                }
                
                // Converter active para 0/1
                const finalData = {
                  ...userData,
                  active: userData.active ? 1 : 0
                };
                
                console.log("[DEBUG] Dados finais processados:", finalData);
                
                // Chamar mutação diretamente
                updateTechnicianMutation.mutate(finalData);
              }}
            >
              {updateTechnicianMutation.isPending ? "Salvando..." : "Atualizar Técnico"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
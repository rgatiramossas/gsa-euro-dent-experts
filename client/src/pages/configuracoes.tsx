import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";

// Schema para validação do formulário de perfil
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Por favor, digite um e-mail válido" }),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Schema para validação da mudança de senha
const passwordFormSchema = z.object({
  currentPassword: z.string().min(8, { message: "A senha atual deve ter pelo menos 8 caracteres" }),
  newPassword: z.string().min(8, { message: "A nova senha deve ter pelo menos 8 caracteres" }),
  confirmPassword: z.string().min(8, { message: "Confirme a nova senha" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ConfiguracoesPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  // Formulário de perfil
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  // Formulário de senha
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      await apiRequest(`/api/users/${user?.id}`, 'PATCH', data);

      // Atualizar usuário no contexto de autenticação
      if (user) {
        updateUser({
          ...user,
          name: data.name,
          email: data.email,
          phone: data.phone,
        });
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar suas informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await apiRequest(`/api/users/${user?.id}/change-password`, 'POST', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // Limpar formulário
      passwordForm.reset();

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: "Erro ao alterar senha",
        description: "Ocorreu um erro ao alterar sua senha. Verifique se a senha atual está correta.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Configurações" 
        description="Gerencie as configurações da sua conta."
      />

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="password">Segurança</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>Opcional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={!profileForm.formState.isDirty}
                    >
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Altere sua senha para manter sua conta segura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha atual</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormDescription>
                          A senha deve ter pelo menos 8 caracteres.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirme a nova senha</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit">
                      Alterar senha
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
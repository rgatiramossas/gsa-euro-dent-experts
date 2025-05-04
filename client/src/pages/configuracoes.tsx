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
import { Link } from "wouter";
import { UserPlusIcon, Users, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DatabaseMaintenance } from "@/components/settings/DatabaseMaintenance";

// Schema para validação do formulário de perfil
const createProfileFormSchema = (t: any, language: string) => {
  return z.object({
    name: z.string().min(2, { 
      message: language === 'en' ? t("validation.minName") : "O nome deve ter pelo menos 2 caracteres" 
    }),
    email: z.string().email({ 
      message: language === 'en' ? t("validation.email") : "Por favor, digite um e-mail válido" 
    }),
  });
};

type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;

// Schema para validação da mudança de senha
const createPasswordFormSchema = (t: any, language: string) => {
  return z.object({
    currentPassword: z.string().min(8, { 
      message: language === 'en' ? t("validation.currentPassword") : "A senha atual deve ter pelo menos 8 caracteres" 
    }),
    newPassword: z.string().min(8, { 
      message: language === 'en' ? t("validation.newPassword") : "A nova senha deve ter pelo menos 8 caracteres" 
    }),
    confirmPassword: z.string().min(8, { 
      message: language === 'en' ? t("validation.confirmPassword") : "Confirme a nova senha" 
    }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: language === 'en' ? t("validation.passwordsDoNotMatch") : "As senhas não coincidem",
    path: ["confirmPassword"],
  });
};

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordFormSchema>>;

export default function ConfiguracoesPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isAdmin = user?.role === 'admin';
  
  // Força rerender quando o idioma é alterado
  const [currentLanguage, setCurrentLanguage] = React.useState(i18n.language);
  
  React.useEffect(() => {
    // Observer para mudanças de idioma
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };
    
    // Adiciona o listener de mudança de idioma
    i18n.on('languageChanged', handleLanguageChange);
    
    // Remove o listener quando o componente é desmontado
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  // Criando schemas baseado no idioma atual
  const profileFormSchema = createProfileFormSchema(t, currentLanguage);
  const passwordFormSchema = createPasswordFormSchema(t, currentLanguage);

  // Formulário de perfil
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
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
        });
      }

      toast({
        title: currentLanguage === 'en' ? t("notifications.profileUpdated") : "Perfil atualizado",
        description: currentLanguage === 'en' ? t("notifications.profileUpdateSuccess") : "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: currentLanguage === 'en' ? t("notifications.profileUpdateError") : "Erro ao atualizar perfil",
        description: currentLanguage === 'en' ? t("notifications.profileUpdateFailure") : "Ocorreu um erro ao atualizar suas informações. Tente novamente.",
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
        title: currentLanguage === 'en' ? t("notifications.passwordChanged") : "Senha alterada",
        description: currentLanguage === 'en' ? t("notifications.passwordChangeSuccess") : "Sua senha foi alterada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: currentLanguage === 'en' ? t("notifications.passwordChangeError") : "Erro ao alterar senha",
        description: currentLanguage === 'en' ? t("notifications.passwordChangeFailure") : "Ocorreu um erro ao alterar sua senha. Verifique se a senha atual está correta.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title={t("settings.title")} 
        description={currentLanguage === 'en' ? t("settings.description") : "Gerencie as configurações da sua conta."}
      />

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">{currentLanguage === 'en' ? t("settings.profile") : "Perfil"}</TabsTrigger>
          <TabsTrigger value="password">{currentLanguage === 'en' ? t("settings.security") : "Segurança"}</TabsTrigger>
          <TabsTrigger value="sync">{currentLanguage === 'en' ? "Sync & Storage" : "Sincronização"}</TabsTrigger>
          {user?.role === "technician" && (
            <TabsTrigger value="technician">{currentLanguage === 'en' ? t("settings.technician") : "Técnico"}</TabsTrigger>
          )}
          {user?.role === "gestor" && (
            <TabsTrigger value="manager">{currentLanguage === 'en' ? t("settings.manager") : "Gestor"}</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{currentLanguage === 'en' ? t("settings.profileInformation") : "Informações do Perfil"}</CardTitle>
              <CardDescription>
                {currentLanguage === 'en' ? t("settings.updateProfile") : "Atualize suas informações pessoais."}
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
                        <FormLabel>{currentLanguage === 'en' ? t("clients.name") : "Nome"}</FormLabel>
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
                  

                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={!profileForm.formState.isDirty}
                    >
                      {currentLanguage === 'en' ? t("settings.saveChanges") : "Salvar alterações"}
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
              <CardTitle>{currentLanguage === 'en' ? t("settings.changePassword") : "Alterar Senha"}</CardTitle>
              <CardDescription>
                {currentLanguage === 'en' ? t("settings.passwordRequirements") : "Altere sua senha para manter sua conta segura."}
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
                        <FormLabel>{currentLanguage === 'en' ? t("settings.currentPassword") : "Senha atual"}</FormLabel>
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
                        <FormLabel>{currentLanguage === 'en' ? t("settings.newPassword") : "Nova senha"}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormDescription>
                          {currentLanguage === 'en' ? t("settings.passwordRequirements") : "A senha deve ter pelo menos 8 caracteres."}
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
                        <FormLabel>{currentLanguage === 'en' ? t("settings.confirmPassword") : "Confirme a nova senha"}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit">
                      {currentLanguage === 'en' ? t("settings.changePassword") : "Alterar senha"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo da aba Técnico */}
        <TabsContent value="technician">
          <Card>
            <CardHeader>
              <CardTitle>{currentLanguage === 'en' ? t("settings.technicianSettings") : "Configurações de Técnico"}</CardTitle>
              <CardDescription>
                {currentLanguage === 'en' ? t("settings.manageTechnicianSettings") : "Gerencie suas configurações específicas como técnico."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{currentLanguage === 'en' ? t("settings.services") : "Serviços"}</h3>
                <p className="text-sm text-gray-500">
                  {currentLanguage === 'en' ? t("settings.viewServices") : "Visualize seus serviços atribuídos e gerencie seu calendário."}
                </p>
                <div className="flex gap-4">
                  <Link to="/services">
                    <Button variant="outline">
                      {currentLanguage === 'en' ? t("settings.myServices") : "Meus Serviços"}
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button variant="outline">
                      {currentLanguage === 'en' ? t("settings.myCalendar") : "Meu Calendário"}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo da aba Sincronização */}
        <TabsContent value="sync">
          <DatabaseMaintenance />
        </TabsContent>

        {/* Conteúdo da aba Gestor */}
        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <CardTitle>{currentLanguage === 'en' ? t("settings.managerSettings") : "Configurações de Gestor"}</CardTitle>
              <CardDescription>
                {currentLanguage === 'en' ? t("settings.manageManagerSettings") : "Gerencie suas configurações específicas como gestor."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{currentLanguage === 'en' ? t("settings.assignedClients") : "Clientes Atribuídos"}</h3>
                <p className="text-sm text-gray-500">
                  {currentLanguage === 'en' ? t("settings.viewClients") : "Visualize e gerencie os clientes que estão sob sua supervisão."}
                </p>
                <Link to="/my-clients">
                  <Button variant="outline">
                    {currentLanguage === 'en' ? t("settings.myClients") : "Meus Clientes"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {isAdmin && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{currentLanguage === 'en' ? t("settings.adminOptions") : "Opções de Administrador"}</CardTitle>
              <CardDescription>
                {currentLanguage === 'en' ? t("settings.manageSystem") : "Gerencie técnicos e gestores do sistema."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/technicians">
                  <Button className="w-full sm:w-auto">
                    <UserPlusIcon className="mr-2 h-4 w-4" />
                    {currentLanguage === 'en' ? t("settings.manageTechnicians") : "Gerenciar Técnicos"}
                  </Button>
                </Link>
                <Link to="/managers">
                  <Button className="w-full sm:w-auto">
                    <Users className="mr-2 h-4 w-4" />
                    {currentLanguage === 'en' ? t("settings.manageManagers") : "Gerenciar Gestores"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
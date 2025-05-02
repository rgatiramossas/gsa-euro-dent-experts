import React, { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

// Define schemas for the forms
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  phone: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Senha atual é obrigatória" }),
  newPassword: z.string().min(8, { message: "Nova senha deve ter no mínimo 8 caracteres" }),
  confirmPassword: z.string().min(8, { message: "Confirme a nova senha" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Dark mode toggle (just UI, no actual implementation required)
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: "",
    },
  });
  
  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Estado para armazenar a imagem de perfil selecionada
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user?.profile_image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handler para upload de imagem
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedImage(file);
      
      // Gerar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Update profile photo mutation
  const updateProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch(`/api/users/${user.id}/photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Falha ao enviar foto de perfil');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      console.error('Error updating profile photo:', error);
      toast({
        title: "Erro ao atualizar foto",
        description: "Não foi possível atualizar sua foto de perfil",
        variant: "destructive",
      });
    }
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!user) throw new Error("Usuário não autenticado");
      const res = await apiRequest('PATCH', `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar suas informações",
        variant: "destructive",
      });
    }
  });
  
  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      if (!user) throw new Error("Usuário não autenticado");
      const res = await apiRequest('PATCH', `/api/users/${user.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso",
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      console.error('Error updating password:', error);
      toast({
        title: "Erro ao atualizar senha",
        description: "Verifique se a senha atual está correta",
        variant: "destructive",
      });
    }
  });
  
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate(data);
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">{t("settings.profile")}</TabsTrigger>
            <TabsTrigger value="password">{t("settings.password")}</TabsTrigger>
            <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
            <TabsTrigger value="notifications">{t("settings.notifications")}</TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="technicians">{t("settings.technicians")}</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-1">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 mb-4 bg-red-200 text-red-800">
                        {imagePreview ? (
                          <AvatarImage src={imagePreview} alt={user?.name || "Perfil"} />
                        ) : (
                          <AvatarFallback className="text-2xl">{user ? getInitials(user.name) : "?"}</AvatarFallback>
                        )}
                      </Avatar>
                      
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </motion.div>
                      
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                    
                    {selectedImage && (
                      <Button 
                        onClick={() => updateProfilePhotoMutation.mutate(selectedImage)}
                        className="mb-4"
                        size="sm"
                        disabled={updateProfilePhotoMutation.isPending}
                      >
                        {updateProfilePhotoMutation.isPending ? "Enviando..." : "Salvar Foto"}
                      </Button>
                    )}
                    <h3 className="font-medium text-lg">{user?.name}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <div className="mt-2">
                      <Badge className={user?.role === "admin" ? "bg-primary text-white" : "bg-secondary text-white"}>
                        {user?.role === "admin" ? "Administrador" : "Técnico"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais
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
                            <FormLabel>Nome Completo</FormLabel>
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
                            <FormLabel>Email</FormLabel>
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
                              <Input {...field} placeholder="(11) 98765-4321" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="mt-2"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Defina uma nova senha para sua conta
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
                          <FormLabel>Senha Atual</FormLabel>
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
                          <FormLabel>Nova Senha</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormDescription>
                            Sua senha deve ter pelo menos 8 caracteres
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
                          <FormLabel>Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="mt-2"
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? "Salvando..." : "Alterar Senha"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-medium">Modo Escuro</h3>
                    <p className="text-sm text-gray-500">
                      Habilite o modo escuro para reduzir o cansaço visual
                    </p>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-base font-medium mb-4">Cores do Sistema</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary mb-2"></div>
                      <span className="text-xs text-gray-500">Principal</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-secondary mb-2"></div>
                      <span className="text-xs text-gray-500">Secundária</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#f39c12] mb-2"></div>
                      <span className="text-xs text-gray-500">Destaque</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#27ae60] mb-2"></div>
                      <span className="text-xs text-gray-500">Sucesso</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#e74c3c] mb-2"></div>
                      <span className="text-xs text-gray-500">Alerta</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-gray-500">
                  As configurações de aparência são salvas automaticamente
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como e quando você será notificado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-medium">Notificações do Sistema</h3>
                    <p className="text-sm text-gray-500">
                      Receba notificações sobre novos serviços e atualizações
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-base font-medium mb-4">Preferências de Email</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Novos Serviços</h4>
                        <p className="text-xs text-gray-500">Quando um novo serviço for atribuído a você</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Atualizações de Serviços</h4>
                        <p className="text-xs text-gray-500">Quando houver alterações em serviços existentes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Lembretes de Agenda</h4>
                        <p className="text-xs text-gray-500">Receba lembretes de serviços agendados</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Resumo Semanal</h4>
                        <p className="text-xs text-gray-500">Receba um resumo semanal das suas atividades</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Salvar Preferências</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {user?.role === "admin" && (
            <TabsContent value="technicians">
              <Card>
                <CardHeader>
                  <CardTitle>Gestão de Técnicos</CardTitle>
                  <CardDescription>
                    Gerencie os técnicos da sua equipe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 flex justify-between items-center">
                    <h3 className="text-lg font-medium">Técnicos Ativos</h3>
                    <Button size="sm" className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Adicionar Técnico
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Conteúdo dos técnicos vai aqui quando implementado */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <Avatar className="h-10 w-10 bg-red-200 text-red-800">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="col-span-3">
                          <p className="font-medium">João da Silva</p>
                          <p className="text-sm text-gray-500">joao@eurodent.com</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Ativo
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center">
                            <div className="mr-2 text-sm font-medium text-gray-700">
                              15 serviços
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3 flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-100">
                            Desativar
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <Avatar className="h-10 w-10 bg-red-200 text-red-800">
                            <AvatarFallback>PS</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="col-span-3">
                          <p className="font-medium">Pedro Santos</p>
                          <p className="text-sm text-gray-500">pedro@eurodent.com</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Ativo
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center">
                            <div className="mr-2 text-sm font-medium text-gray-700">
                              8 serviços
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3 flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-100">
                            Desativar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-6">
                  <p className="text-sm text-gray-500">
                    Mostrando 2 técnicos de um total de 2
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}



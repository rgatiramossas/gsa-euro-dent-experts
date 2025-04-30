import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { DollarSign, Calendar, Settings, LogIn, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InstallPWAButton } from "@/components/ui/install-pwa-button";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

// Componente de cabeçalho principal da aplicação
export function Header() {
  const { user, logout, login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t("auth.userLoggedOut"),
        description: t("auth.userLoggedOut"),
      });
      setLocation("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: t("error"),
        description: t("auth.logoutError", "Ocorreu um erro ao fazer logout. Tente novamente."),
        variant: "destructive",
      });
    }
  };

  // Verificar se o usuário é gestor (suporta tanto 'gestor' quanto 'manager')
  const isGestor = user?.role === 'gestor' || user?.role === 'manager';
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="flex items-center justify-center mr-2">
              <img 
                src="/images/logo.png" 
                alt="Euro Dent Experts" 
                className="h-10 w-auto"
              />
            </div>
            <span className="font-semibold text-lg hidden sm:block">Euro Dent Experts</span>
            <span className="font-semibold text-lg sm:hidden">EDE</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Seletor de idioma */}
          <LanguageSwitcher />
          {/* Botão de login/logout */}
          {!user && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white text-primary"
              onClick={() => setLocation("/login")}
            >
              <LogIn className="h-4 w-4 mr-1" />
              {t("auth.login")}
            </Button>
          )}
          
          {/* Ícone Financeiro - não disponível para gestores */}
          {!isGestor && (
            <div>
              <button 
                onClick={() => setLocation("/finances")}
                className="p-1 rounded-full hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
              >
                <DollarSign className="h-6 w-6" />
              </button>
            </div>
          )}
          
          {/* Ícone Eventos - disponível para todos */}
          <div>
            <button 
              onClick={() => setLocation("/eventos")}
              className="p-1 rounded-full hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
            >
              <Calendar className="h-6 w-6" />
            </button>
          </div>
          
          {/* Botão de instalação do PWA - aparece apenas quando disponível */}
          {user && <InstallPWAButton className="bg-white text-primary hover:bg-gray-100" />}
          
          {/* Recurso de notificações a ser implementado no futuro */}
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center focus:outline-none">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 bg-red-200 text-red-800">
                    {user.profile_image ? (
                      <AvatarImage src={user.profile_image} alt={user.name} />
                    ) : (
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="ml-2 hidden md:block text-sm font-medium">
                    {user.name}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="hidden md:block h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-gray-500">
                      {user.role === "admin" 
                        ? t("users.roles.admin")
                        : user.role === "gestor"
                          ? t("users.roles.gestor")
                          : t("users.roles.technician")
                      }
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLocation("/configuracoes")}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t("settings.title")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

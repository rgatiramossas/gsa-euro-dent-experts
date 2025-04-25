import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { DollarSign, CalendarClock, Bell, Settings } from "lucide-react";

// Não precisamos mais da interface HeaderProps já que não temos mais o sidebar
export function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      setLocation("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erro ao desconectar",
        description: "Ocorreu um erro ao fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="flex items-center justify-center mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="36" 
                height="36" 
                viewBox="0 0 110 110"
                className="fill-current"
              >
                <path d="M54.5 14.7s-4.1 10.5-10.7 11c-9.7.7-20.2-7.7-20.2-7.7L16 28s11.1 9 11.2 19-8.7 19.8-8.7 19.8l9.1 5.2s9.5-9.7 20-9c8.2.5 10.8 9.8 10.8 9.8l10.5-3.3s-5.4-12.5 1.5-21.3c5.3-6.7 15.8-5.6 15.8-5.6l1.7-10.2s-13.4-3.3-19.2-11c-5.2-7-3.9-17.7-3.9-17.7h-10.3z" fill="#ff3e33"/>
                <path d="M28 19.3c-2 1.1-4 2.3-5.9 3.7-12.4 9.1-17.9 25-13.6 39.9 4.3 14.9 17.8 25 33.1 25 4 0 8-.7 11.8-2" fill="none" stroke="#000" strokeWidth="2" strokeMiterlimit="10"/>
                <path d="M28 19.3C36.1 14.5 46 13 55.2 16.1c17.8 6 27.6 25.1 22 42.9-5.7 17.8-24.7 27.6-42.4 21.7-3.8-1.3-7.3-3.2-10.3-5.5" fill="none" stroke="#000" strokeWidth="2" strokeMiterlimit="10"/>
                <path d="M48.3 33.5c-1.7 3.3-5.8 4.6-9.1 2.9-3.3-1.7-4.6-5.8-2.9-9.1 1.7-3.3 5.8-4.6 9.1-2.9 3.3 1.7 4.6 5.8 2.9 9.1zM28.2 53.4c-1.7 3.3-5.8 4.6-9.1 2.9-3.3-1.7-4.6-5.8-2.9-9.1 1.7-3.3 5.8-4.6 9.1-2.9 3.3 1.7 4.6 5.8 2.9 9.1z" fill="#ff3e33"/>
                <path d="M75.9 39.2c-1.7 3.3-5.8 4.6-9.1 2.9-3.3-1.7-4.6-5.8-2.9-9.1 1.7-3.3 5.8-4.6 9.1-2.9 3.3 1.7 4.6 5.8 2.9 9.1zM55.7 59.1c-1.7 3.3-5.8 4.6-9.1 2.9-3.3-1.7-4.6-5.8-2.9-9.1 1.7-3.3 5.8-4.6 9.1-2.9 3.3 1.7 4.6 5.8 2.9 9.1z" fill="#ff3e33"/>
                <path d="M69.4 59.7c-1.7 3.3-5.8 4.6-9.1 2.9-3.3-1.7-4.6-5.8-2.9-9.1 1.7-3.3 5.8-4.6 9.1-2.9 3.3 1.7 4.6 5.8 2.9 9.1z" fill="#ff3e33"/>
              </svg>
            </div>
            <span className="font-semibold text-lg hidden sm:block">Euro Dent Experts</span>
            <span className="font-semibold text-lg sm:hidden">EDE</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Ícone Financeiro */}
          <div>
            <button 
              onClick={() => setLocation("/finances")}
              className="p-1 rounded-full hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
            >
              <DollarSign className="h-6 w-6" />
            </button>
          </div>
          
          {/* Ícone Agenda */}
          <div>
            <button 
              onClick={() => setLocation("/schedule")}
              className="p-1 rounded-full hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
            >
              <CalendarClock className="h-6 w-6" />
            </button>
          </div>
          
          {/* Botão de configurações removido a pedido do cliente */}
          
          {/* Ícone Notificações */}
          <div className="relative">
            <button className="p-1 rounded-full hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white">
              <Bell className="h-6 w-6" />
            </button>
          </div>
          
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
                    <span className="text-xs text-gray-500">{user.role === "admin" ? "Administrador" : "Técnico"}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLocation("/settings")}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

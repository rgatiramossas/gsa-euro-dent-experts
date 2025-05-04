import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOutIcon, ShieldIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

export function AuthSessionMaintenance() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const currentLanguage = i18n.language;

  // Função para limpar as sessões e tokens no navegador
  const handleClearSessions = async () => {
    try {
      // Confirmação
      if (!window.confirm(currentLanguage === 'en'
        ? "This will clear all authentication data and log you out. You'll need to login again. Continue?"
        : "Isso limpará todos os dados de autenticação e fará com que você seja deslogado. Você precisará fazer login novamente. Continuar?")) {
        return;
      }

      // Notificar o Service Worker para que não intercepte requisições de autenticação
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ENABLE_AUTH_SESSION_MAINTENANCE'
        });
      }

      // Limpar cookies (apenas os relacionados à sessão)
      document.cookie = 'eurodent.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Executar o logout
      await logout();
      
      toast({
        title: currentLanguage === 'en' ? "Session Reset" : "Sessão Redefinida",
        description: currentLanguage === 'en' ? "Authentication data cleared. You'll be redirected to login." : "Dados de autenticação limpos. Você será redirecionado para o login.",
      });
      
      // Esperar um momento e redirecionar para a página de login
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Erro ao limpar sessões:', error);
      toast({
        title: currentLanguage === 'en' ? "Error" : "Erro",
        description: currentLanguage === 'en' ? "An error occurred while clearing authentication data." : "Ocorreu um erro ao limpar os dados de autenticação.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          <ShieldIcon className="inline-block mr-2 h-5 w-5" />
          {currentLanguage === 'en' ? "Authentication & Session" : "Autenticação e Sessão"}
        </CardTitle>
        <CardDescription>
          {currentLanguage === 'en'
            ? "Manage your authentication and session data."
            : "Gerencie seus dados de autenticação e sessão."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">
              {currentLanguage === 'en' ? "Reset Authentication" : "Redefinir Autenticação"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {currentLanguage === 'en'
                ? "If you're experiencing authentication issues, you can reset your session. You'll need to login again."
                : "Se você estiver enfrentando problemas de autenticação, pode redefinir sua sessão. Você precisará fazer login novamente."}
            </p>
            <Button
              variant="destructive"
              onClick={handleClearSessions}
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              {currentLanguage === 'en' ? "Clear Session Data" : "Limpar Dados de Sessão"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
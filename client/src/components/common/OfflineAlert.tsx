import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface OfflineAlertProps {
  isVisible: boolean;
  onSubmitOffline: () => void;
  isPending: boolean;
}

export function OfflineAlert({ isVisible, onSubmitOffline, isPending }: OfflineAlertProps) {
  const [, setLocation] = useLocation();
  
  if (!isVisible) return null;
  
  const handleOfflineSave = () => {
    try {
      onSubmitOffline();
      
      // Exibir mensagem de sucesso
      toast({
        title: "Serviço salvo localmente",
        description: "Os dados foram salvos no dispositivo e serão sincronizados quando houver conexão.",
      });
      
      // Redirecionar após salvar localmente
      setLocation('/services');
    } catch (error) {
      console.error("Erro ao salvar offline:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados localmente. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center text-amber-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium">Modo Offline Detectado</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Você está offline. Deseja salvar este serviço localmente? Os dados serão sincronizados automaticamente quando a conexão for restabelecida.
        </p>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation('/services')}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            className="flex-1"
            disabled={isPending}
            onClick={handleOfflineSave}
          >
            {isPending ? "Salvando localmente..." : "Salvar Localmente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
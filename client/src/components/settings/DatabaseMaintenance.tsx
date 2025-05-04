import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DatabaseIcon, RefreshCw } from "lucide-react"; 
import { useTranslation } from "react-i18next";

// Este componente executa a limpeza do IndexedDB
export function DatabaseMaintenance() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  // Função para limpar o banco de dados IndexedDB
  const handleCleanIndexedDB = async () => {
    try {
      // Verificar se a função está disponível no escopo global
      if (!window.indexedDB) {
        toast({
          title: currentLanguage === 'en' ? "Database Error" : "Erro de Banco de Dados",
          description: currentLanguage === 'en' ? "IndexedDB is not supported in this browser." : "IndexedDB não é suportado neste navegador.",
          variant: "destructive",
        });
        return;
      }

      // Confirmação
      if (!window.confirm(currentLanguage === 'en' 
        ? "This will clean the local database cache and reset synchronization. The app will reload. Continue?" 
        : "Isso limpará o cache do banco de dados local e redefinirá a sincronização. O aplicativo será recarregado. Continuar?")) {
        return;
      }

      // Obter todos os bancos de dados
      const databases = await window.indexedDB.databases();
      console.log('Bancos de dados IndexedDB encontrados:', databases);

      // Procurar pelo banco de dados da aplicação
      const appDb = databases.find(db => db.name === 'EuroDentOfflineDB');
      
      if (appDb) {
        console.log(`Encontrado banco de dados: ${appDb.name}, versão: ${appDb.version}`);
        
        // Deletar o banco de dados
        const deleteRequest = window.indexedDB.deleteDatabase('EuroDentOfflineDB');
        
        deleteRequest.onsuccess = function() {
          console.log('Banco de dados IndexedDB excluído com sucesso!');
          
          toast({
            title: currentLanguage === 'en' ? "Database Reset" : "Banco de Dados Resetado",
            description: currentLanguage === 'en' ? "Local database has been reset. The app will reload." : "O banco de dados local foi resetado. O aplicativo será recarregado.",
          });
          
          // Esperar um momento e recarregar a página para reconstruir o banco
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        };
        
        deleteRequest.onerror = function(event: any) {
          console.error('Erro ao excluir o banco de dados:', event.target.error);
          toast({
            title: currentLanguage === 'en' ? "Error" : "Erro",
            description: currentLanguage === 'en' ? "Could not reset the database. Close other tabs and try again." : "Não foi possível resetar o banco de dados. Feche outras abas e tente novamente.",
            variant: "destructive",
          });
        };
        
        deleteRequest.onblocked = function() {
          console.warn('Exclusão do banco de dados bloqueada. Fechando todas as conexões...');
          toast({
            title: currentLanguage === 'en' ? "Blocked" : "Bloqueado",
            description: currentLanguage === 'en' ? "Database reset is blocked. Close all other tabs with this app and try again." : "O reset do banco de dados está bloqueado. Feche todas as outras abas com este aplicativo e tente novamente.",
            variant: "destructive",
          });
        };
      } else {
        console.log('Banco de dados da aplicação não encontrado. Nada a limpar.');
        toast({
          title: currentLanguage === 'en' ? "Nothing to Reset" : "Nada para Resetar",
          description: currentLanguage === 'en' ? "No local database found." : "Nenhum banco de dados local encontrado.",
        });
      }
    } catch (error) {
      console.error('Erro ao limpar IndexedDB:', error);
      toast({
        title: currentLanguage === 'en' ? "Error" : "Erro",
        description: currentLanguage === 'en' ? "An error occurred while resetting the database." : "Ocorreu um erro ao resetar o banco de dados.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <DatabaseIcon className="inline-block mr-2 h-5 w-5" />
          {currentLanguage === 'en' ? "Database Maintenance" : "Manutenção do Banco de Dados"}
        </CardTitle>
        <CardDescription>
          {currentLanguage === 'en' 
            ? "Manage the local database cache and synchronization." 
            : "Gerencie o cache do banco de dados local e a sincronização."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">
              {currentLanguage === 'en' ? "Reset Local Database" : "Resetar Banco de Dados Local"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {currentLanguage === 'en' 
                ? "If you're experiencing synchronization issues or data problems, you can reset the local database cache." 
                : "Se você estiver enfrentando problemas de sincronização ou de dados, você pode resetar o cache do banco de dados local."}
            </p>
            <Button 
              variant="destructive" 
              onClick={handleCleanIndexedDB}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {currentLanguage === 'en' ? "Reset Local Database" : "Resetar Banco Local"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
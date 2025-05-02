import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import offlineDb, { storeOfflineRequest } from "@/lib/offlineDb";

// Cliente de teste para criação
const TEST_CLIENT = {
  name: "Cliente de Teste Offline",
  phone: "123456789",
  email: "teste@offline.com",
  document: "123.456.789-00",
  address: "Rua de Teste, 123"
};

// Veículo de teste para criação
const TEST_VEHICLE = {
  client_id: 0, // Será substituído pelo ID do cliente de teste
  plate: "TST1234",
  model: "Modelo de Teste",
  brand: "Marca de Teste",
  year: "2023",
  color: "Azul"
};

// Orçamento de teste para criação
const TEST_BUDGET = {
  client_id: 0, // Será substituído pelo ID do cliente de teste
  vehicle_id: 0, // Será substituído pelo ID do veículo de teste
  total_value: 1500,
  description: "Orçamento criado pelo teste offline",
  service_type: "Amassado de Rua",
  status: "pending",
  date: new Date().toISOString().split('T')[0],
  vehicle_info: "Informações adicionais do veículo"
};

// Ordem de serviço de teste para criação
const TEST_SERVICE = {
  client_id: 0, // Será substituído pelo ID do cliente de teste
  vehicle_id: 0, // Será substituído pelo ID do veículo de teste
  total_value: 2000,
  description: "Serviço criado pelo teste offline",
  service_type: "Amassado de Rua",
  service_type_id: 1, // ID do tipo de serviço "Amassado de Rua"
  status: "pending",
  date: new Date().toISOString().split('T')[0],
  estimated_completion: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0] // 7 dias a partir de hoje
};

// Componente principal da página de testes
export default function TestPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [testClientId, setTestClientId] = useState<number | null>(null);
  const [testVehicleId, setTestVehicleId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Verificar quantidade de requisições pendentes
  useEffect(() => {
    const checkPendingRequests = async () => {
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
    };
    
    // Adicionar event listeners para status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar status inicial
    checkPendingRequests();
    
    // Limpar no unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Função para adicionar resultado aos logs de teste
  const addTestResult = (message: string) => {
    setTestResults(prev => [message, ...prev]);
  };

  // Função para simular modo offline
  const simulateOffline = () => {
    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    // Disparar evento offline
    window.dispatchEvent(new Event('offline'));
    addTestResult("Modo offline simulado");
    
    setIsOnline(false);
    
    toast({
      title: "Modo Offline Ativado",
      description: "Aplicação está simulando o modo offline",
    });
  };

  // Função para simular modo online
  const simulateOnline = () => {
    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    // Disparar evento online
    window.dispatchEvent(new Event('online'));
    addTestResult("Modo online simulado");
    
    setIsOnline(true);
    
    toast({
      title: "Modo Online Ativado",
      description: "Aplicação está simulando o modo online",
    });
  };

  // Função para criar cliente de teste offline
  const createTestClient = async () => {
    try {
      // Garantir que estamos no modo offline
      if (navigator.onLine) {
        addTestResult("AVISO: Criando cliente mesmo estando online (o ideal seria testar offline)");
      }
      
      // Gerar um ID temporário para o cliente (negativo para evitar conflitos)
      const tempId = -Math.floor(Math.random() * 10000);
      
      // Criar cópia do cliente de teste com ID temporário
      const clientData = {
        ...TEST_CLIENT,
        id: tempId,
        _isOffline: true,
        created_at: new Date().toISOString()
      };
      
      // Armazenar no banco de dados offline
      await storeOfflineRequest({
        id: `client-${tempId}`,
        url: '/api/clients',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: TEST_CLIENT,
        tableName: 'clients',
        timestamp: Date.now(),
        operationType: 'create'
      });
      
      // Atualizar a cache do React Query para mostrar imediatamente
      queryClient.setQueryData(['/api/clients'], (oldData: any[] = []) => {
        return [...oldData, clientData];
      });
      
      // Guardar o ID do cliente para uso em outros testes
      setTestClientId(tempId);
      
      addTestResult(`Cliente criado offline com ID temporário: ${tempId}`);
      
      toast({
        title: "Cliente Criado Offline",
        description: `Cliente de teste criado com ID: ${tempId}`,
      });
      
      // Atualizar contagem de requisições pendentes
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
      
      return tempId;
    } catch (error) {
      console.error("Erro ao criar cliente de teste:", error);
      addTestResult(`ERRO ao criar cliente: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Criar Cliente",
        description: "Ocorreu um erro ao tentar criar o cliente de teste",
      });
      
      return null;
    }
  };

  // Função para criar veículo de teste offline
  const createTestVehicle = async () => {
    try {
      // Verificar se temos um cliente
      const clientId = testClientId || await createTestClient();
      if (!clientId) {
        addTestResult("ERRO: Não foi possível criar o cliente para o veículo");
        return null;
      }
      
      // Gerar um ID temporário para o veículo
      const tempId = -Math.floor(Math.random() * 10000);
      
      // Criar cópia do veículo de teste com ID do cliente e ID temporário
      const vehicleData = {
        ...TEST_VEHICLE,
        id: tempId,
        client_id: clientId,
        _isOffline: true,
        created_at: new Date().toISOString()
      };
      
      // Preparar dados para requisição
      const requestData = {
        ...TEST_VEHICLE,
        client_id: clientId
      };
      
      // Armazenar no banco de dados offline
      await storeOfflineRequest({
        id: `vehicle-${tempId}`,
        url: '/api/vehicles',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestData,
        tableName: 'vehicles',
        timestamp: Date.now(),
        operationType: 'create'
      });
      
      // Atualizar a cache do React Query para mostrar imediatamente
      queryClient.setQueryData(['/api/vehicles'], (oldData: any[] = []) => {
        return [...oldData, vehicleData];
      });
      
      // Também atualizar a cache de veículos do cliente específico
      queryClient.setQueryData(['/api/clients', clientId, 'vehicles'], (oldData: any[] = []) => {
        return [...oldData, vehicleData];
      });
      
      // Guardar o ID do veículo para uso em outros testes
      setTestVehicleId(tempId);
      
      addTestResult(`Veículo criado offline com ID temporário: ${tempId} para o cliente ${clientId}`);
      
      toast({
        title: "Veículo Criado Offline",
        description: `Veículo de teste criado com ID: ${tempId}`,
      });
      
      // Atualizar contagem de requisições pendentes
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
      
      return tempId;
    } catch (error) {
      console.error("Erro ao criar veículo de teste:", error);
      addTestResult(`ERRO ao criar veículo: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Criar Veículo",
        description: "Ocorreu um erro ao tentar criar o veículo de teste",
      });
      
      return null;
    }
  };

  // Função para criar orçamento de teste offline
  const createTestBudget = async () => {
    try {
      // Verificar se temos um cliente e veículo
      const clientId = testClientId || await createTestClient();
      const vehicleId = testVehicleId || await createTestVehicle();
      
      if (!clientId || !vehicleId) {
        addTestResult("ERRO: Não foi possível criar cliente ou veículo para o orçamento");
        return null;
      }
      
      // Gerar um ID temporário para o orçamento
      const tempId = -Math.floor(Math.random() * 10000);
      
      // Criar cópia do orçamento de teste
      const budgetData = {
        ...TEST_BUDGET,
        id: tempId,
        client_id: clientId,
        vehicle_id: vehicleId,
        _isOffline: true,
        created_at: new Date().toISOString()
      };
      
      // Preparar dados para requisição
      const requestData = {
        ...TEST_BUDGET,
        client_id: clientId,
        vehicle_id: vehicleId
      };
      
      // Armazenar no banco de dados offline
      await storeOfflineRequest({
        id: `budget-${tempId}`,
        url: '/api/budgets',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestData,
        tableName: 'budgets',
        timestamp: Date.now(),
        operationType: 'create'
      });
      
      // Atualizar a cache do React Query para mostrar imediatamente
      queryClient.setQueryData(['/api/budgets'], (oldData: any[] = []) => {
        return [...oldData, budgetData];
      });
      
      addTestResult(`Orçamento criado offline com ID temporário: ${tempId}`);
      
      toast({
        title: "Orçamento Criado Offline",
        description: `Orçamento de teste criado com ID: ${tempId}`,
      });
      
      // Atualizar contagem de requisições pendentes
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
      
      return tempId;
    } catch (error) {
      console.error("Erro ao criar orçamento de teste:", error);
      addTestResult(`ERRO ao criar orçamento: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Criar Orçamento",
        description: "Ocorreu um erro ao tentar criar o orçamento de teste",
      });
      
      return null;
    }
  };

  // Função para criar ordem de serviço de teste offline
  const createTestService = async () => {
    try {
      // Verificar se temos um cliente e veículo
      const clientId = testClientId || await createTestClient();
      const vehicleId = testVehicleId || await createTestVehicle();
      
      if (!clientId || !vehicleId) {
        addTestResult("ERRO: Não foi possível criar cliente ou veículo para a ordem de serviço");
        return null;
      }
      
      // Gerar um ID temporário para a ordem de serviço
      const tempId = -Math.floor(Math.random() * 10000);
      
      // Criar cópia da ordem de serviço de teste
      const serviceData = {
        ...TEST_SERVICE,
        id: tempId,
        client_id: clientId,
        vehicle_id: vehicleId,
        _isOffline: true,
        created_at: new Date().toISOString()
      };
      
      // Preparar dados para requisição
      const requestData = {
        ...TEST_SERVICE,
        client_id: clientId,
        vehicle_id: vehicleId
      };
      
      // Armazenar no banco de dados offline
      await storeOfflineRequest({
        id: `service-${tempId}`,
        url: '/api/services',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestData,
        tableName: 'services',
        timestamp: Date.now(),
        operationType: 'create'
      });
      
      // Atualizar a cache do React Query para mostrar imediatamente
      queryClient.setQueryData(['/api/services'], (oldData: any[] = []) => {
        return [...oldData, serviceData];
      });
      
      // Atualizar estatísticas do dashboard
      queryClient.setQueryData(['/api/dashboard/stats'], (oldData: any = {}) => {
        const stats = { ...oldData };
        stats.totalPendingServices = (stats.totalPendingServices || 0) + 1;
        return stats;
      });
      
      addTestResult(`Ordem de serviço criada offline com ID temporário: ${tempId}`);
      
      toast({
        title: "Ordem de Serviço Criada Offline",
        description: `Ordem de serviço de teste criada com ID: ${tempId}`,
      });
      
      // Atualizar contagem de requisições pendentes
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
      
      return tempId;
    } catch (error) {
      console.error("Erro ao criar ordem de serviço de teste:", error);
      addTestResult(`ERRO ao criar ordem de serviço: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Criar Ordem de Serviço",
        description: "Ocorreu um erro ao tentar criar a ordem de serviço de teste",
      });
      
      return null;
    }
  };

  // Função para forçar sincronização
  const forceSyncronization = async () => {
    try {
      // Verificar se estamos online
      if (!navigator.onLine) {
        addTestResult("AVISO: Não é possível sincronizar no modo offline. Ative o modo online primeiro.");
        
        toast({
          variant: "destructive",
          title: "Sincronização Falhou",
          description: "Não é possível sincronizar no modo offline. Ative o modo online primeiro.",
        });
        
        return;
      }
      
      // Buscar requisições pendentes
      const pending = await offlineDb.getAllPendingRequests();
      addTestResult(`Iniciando sincronização de ${pending.length} requisições pendentes...`);
      
      // Processar requisições pendentes
      const results = await offlineDb.processPendingRequests();
      
      addTestResult(`Sincronização concluída: ${results.success} sucesso, ${results.failed} falhas`);
      
      if (results.success > 0) {
        toast({
          title: "Sincronização Concluída",
          description: `${results.success} requisições sincronizadas com sucesso`,
        });
      }
      
      if (results.failed > 0) {
        toast({
          variant: "destructive",
          title: "Alguns Itens Falharam",
          description: `${results.failed} requisições não puderam ser sincronizadas`,
        });
      }
      
      // Atualizar contagem de requisições pendentes
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
      
      // Limpar os caches do React Query
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Erro ao sincronizar requisições pendentes:", error);
      addTestResult(`ERRO ao sincronizar: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: "Ocorreu um erro ao tentar sincronizar requisições pendentes",
      });
    }
  };

  // Função para limpar todas as requisições pendentes
  const clearPendingRequests = async () => {
    try {
      const count = await offlineDb.countPendingRequests();
      
      if (count === 0) {
        addTestResult("Não há requisições pendentes para limpar.");
        
        toast({
          title: "Nenhuma Ação Necessária",
          description: "Não há requisições pendentes para limpar",
        });
        
        return;
      }
      
      await offlineDb.clearPendingRequests();
      addTestResult(`Todas as requisições pendentes foram removidas`);
      
      toast({
        title: "Requisições Limpas",
        description: `${count} requisições pendentes foram removidas`,
      });
      
      // Atualizar contagem
      setPendingRequests(0);
      
      // Limpar os caches do React Query
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Erro ao limpar requisições pendentes:", error);
      addTestResult(`ERRO ao limpar requisições pendentes: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Limpar Requisições",
        description: "Ocorreu um erro ao tentar limpar as requisições pendentes",
      });
    }
  };

  return (
    <div className="container py-6">
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Painel de Testes Offline</CardTitle>
          <CardDescription>
            Ferramenta para testar funcionalidades offline da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className={`border rounded-lg p-4 ${isOnline ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
              <h5 className="mb-1 font-medium leading-none tracking-tight">
                Status da Conexão: {' '}
                {isOnline ? (
                  <Badge className="bg-green-600">Online</Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </h5>
              <div className="text-sm text-muted-foreground">
                {isOnline 
                  ? "Aplicação está operando no modo online com conexão ao servidor" 
                  : "Aplicação está operando no modo offline sem conexão ao servidor"}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-background">
              <h5 className="mb-1 font-medium leading-none tracking-tight">
                Requisições Pendentes: {' '}
                <Badge variant={pendingRequests > 0 ? "secondary" : "outline"}>
                  {pendingRequests}
                </Badge>
              </h5>
              <div className="text-sm text-muted-foreground">
                {pendingRequests > 0 
                  ? `Existem ${pendingRequests} operações offline pendentes de sincronização` 
                  : "Não há operações pendentes de sincronização"}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={isOnline ? "outline" : "default"}
                onClick={simulateOffline}
                disabled={!isOnline}
              >
                Simular Offline
              </Button>
              
              <Button 
                variant={!isOnline ? "outline" : "default"}
                onClick={simulateOnline}
                disabled={isOnline}
              >
                Simular Online
              </Button>
              
              <Button 
                variant="outline" 
                onClick={forceSyncronization}
                disabled={!isOnline || pendingRequests === 0}
              >
                Sincronizar Agora
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={clearPendingRequests}
                disabled={pendingRequests === 0}
              >
                Limpar Pendentes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Criar Dados de Teste Offline</CardTitle>
            <CardDescription>
              Criar entidades de teste quando estiver no modo offline
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={createTestClient} className="w-full">
              Criar Cliente de Teste
            </Button>
            
            <Button onClick={createTestVehicle} className="w-full">
              Criar Veículo de Teste
            </Button>
            
            <Button onClick={createTestBudget} className="w-full">
              Criar Orçamento de Teste
            </Button>
            
            <Button onClick={createTestService} className="w-full">
              Criar Ordem de Serviço de Teste
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Log de Testes</CardTitle>
            <CardDescription>
              Resultado das operações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto bg-muted/20">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nenhuma operação realizada ainda...</p>
              ) : (
                <ul className="space-y-2">
                  {testResults.map((result, index) => (
                    <li key={index} className="text-sm border-b pb-2 border-muted last:border-0">
                      {result}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Como Testar Funcionalidades Offline</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Clique em "Simular Offline" para colocar a aplicação em modo offline.</li>
                <li>Crie um cliente, veículo, orçamento ou ordem de serviço de teste.</li>
                <li>Verifique se o item aparece imediatamente na interface.</li>
                <li>Clique em "Simular Online" para restaurar a conexão.</li>
                <li>Use "Sincronizar Agora" para enviar as operações pendentes ao servidor.</li>
              </ol>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-2">O que Observar</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Os itens criados offline devem aparecer imediatamente nas listagens mesmo sem conexão.</li>
                <li>Os IDs temporários (negativos) são substituídos por IDs reais após a sincronização.</li>
                <li>Clientes criados offline devem aparecer nos seletores de outras entidades.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
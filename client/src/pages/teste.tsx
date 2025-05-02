import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { offlineStatusStore } from "@/lib/stores";
import { useSnapshot } from "valtio";
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
  status: "pending"
};

// Ordem de serviço de teste para criação
const TEST_SERVICE = {
  client_id: 0, // Será substituído pelo ID do cliente de teste
  vehicle_id: 0, // Será substituído pelo ID do veículo de teste
  total_value: 2000,
  description: "Serviço criado pelo teste offline",
  service_type: "Amassado de Rua",
  status: "pending"
};

// Componente principal da página de testes
export default function TestPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [testClientId, setTestClientId] = useState<number | null>(null);
  const [testVehicleId, setTestVehicleId] = useState<number | null>(null);
  const offlineStatus = useSnapshot(offlineStatusStore);

  // Verificar quantidade de requisições pendentes ao carregar
  useEffect(() => {
    const checkPendingRequests = async () => {
      const count = await offlineDb.countPendingRequests();
      setPendingRequests(count);
    };
    
    checkPendingRequests();
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
    
    // Atualizar store de estado offline
    offlineStatusStore.setOnline(false);
    
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
    
    // Atualizar store de estado offline
    offlineStatusStore.setOnline(true);
    
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
      
      addTestResult("Iniciando sincronização forçada...");
      
      // Enviar mensagem para o service worker iniciar sincronização
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_REQUEST'
        });
        
        addTestResult("Solicitação de sincronização enviada ao Service Worker");
        
        toast({
          title: "Sincronização Iniciada",
          description: "A sincronização dos dados offline foi iniciada",
        });
      } else {
        addTestResult("ERRO: Service Worker não está disponível para sincronização");
        
        toast({
          variant: "destructive",
          title: "Sincronização Falhou",
          description: "Service Worker não está disponível para sincronização",
        });
      }
      
      // Atualizar contagem após um breve delay para dar tempo da sincronização iniciar
      setTimeout(async () => {
        const count = await offlineDb.countPendingRequests();
        setPendingRequests(count);
      }, 3000);
    } catch (error) {
      console.error("Erro ao iniciar sincronização:", error);
      addTestResult(`ERRO ao iniciar sincronização: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: "Ocorreu um erro ao tentar iniciar a sincronização",
      });
    }
  };

  // Função para listar requisições pendentes
  const listPendingRequests = async () => {
    try {
      // Buscar todas as requisições pendentes
      const requests = await offlineDb.getPendingRequests();
      
      if (requests.length === 0) {
        addTestResult("Não há requisições pendentes no banco de dados offline");
        
        toast({
          title: "Nenhuma Requisição Pendente",
          description: "Não há operações offline pendentes de sincronização",
        });
        
        return;
      }
      
      // Listar todas as requisições pendentes nos resultados
      addTestResult(`Total de ${requests.length} requisições pendentes:`);
      
      requests.forEach((req, index) => {
        addTestResult(`${index + 1}. [${req.method}] ${req.url} (${new Date(req.timestamp).toLocaleString()})`);
      });
      
      toast({
        title: "Requisições Pendentes Listadas",
        description: `Foram encontradas ${requests.length} operações pendentes`,
      });
    } catch (error) {
      console.error("Erro ao listar requisições pendentes:", error);
      addTestResult(`ERRO ao listar requisições pendentes: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        variant: "destructive",
        title: "Erro ao Listar Requisições",
        description: "Ocorreu um erro ao tentar listar as requisições pendentes",
      });
    }
  };

  // Função para limpar todas as requisições pendentes
  const clearPendingRequests = async () => {
    try {
      // Confirmar antes de limpar
      if (!window.confirm("ATENÇÃO: Isso irá remover TODAS as operações offline pendentes. Continuar?")) {
        addTestResult("Operação de limpeza cancelada pelo usuário");
        return;
      }
      
      // Obter todas as requisições pendentes
      const requests = await offlineDb.getPendingRequests();
      
      // Excluir cada uma delas
      for (const req of requests) {
        await offlineDb._db?.delete('pendingRequests', req.id);
      }
      
      addTestResult(`${requests.length} requisições pendentes foram removidas`);
      
      // Atualizar contagem
      setPendingRequests(0);
      
      toast({
        title: "Requisições Pendentes Removidas",
        description: `${requests.length} operações offline foram removidas com sucesso`,
      });
      
      // Limpar IDs temporários
      setTestClientId(null);
      setTestVehicleId(null);
      
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
            <Alert variant={offlineStatus.online ? "default" : "destructive"}>
              <AlertTitle>
                Status da Conexão: {' '}
                {offlineStatus.online ? (
                  <Badge className="bg-green-600">Online</Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </AlertTitle>
              <AlertDescription>
                {offlineStatus.online 
                  ? "Aplicação está operando no modo online com conexão ao servidor" 
                  : "Aplicação está operando no modo offline sem conexão ao servidor"}
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertTitle>
                Requisições Pendentes: {' '}
                <Badge variant={pendingRequests > 0 ? "secondary" : "outline"}>
                  {pendingRequests}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                {pendingRequests > 0 
                  ? `Existem ${pendingRequests} operações offline pendentes de sincronização` 
                  : "Não existem operações pendentes de sincronização"}
              </AlertDescription>
            </Alert>
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Conexão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <Button 
                      onClick={simulateOffline} 
                      variant="destructive"
                      disabled={!offlineStatus.online}
                    >
                      Simular Modo Offline
                    </Button>
                    <Button 
                      onClick={simulateOnline}
                      variant="default"
                      disabled={offlineStatus.online}
                    >
                      Simular Modo Online
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Sincronização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <Button 
                      onClick={forceSyncronization}
                      variant="default"
                      disabled={!offlineStatus.online}
                    >
                      Forçar Sincronização
                    </Button>
                    <Button 
                      onClick={listPendingRequests}
                      variant="secondary"
                    >
                      Listar Requisições Pendentes
                    </Button>
                    <Button 
                      onClick={clearPendingRequests}
                      variant="outline"
                      className="text-red-500 hover:text-red-700"
                      disabled={pendingRequests === 0}
                    >
                      Limpar Todas as Requisições
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Criar Entidades Offline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <Button 
                      onClick={createTestClient}
                      variant="secondary"
                    >
                      Criar Cliente de Teste
                    </Button>
                    <Button 
                      onClick={createTestVehicle}
                      variant="secondary"
                    >
                      Criar Veículo de Teste
                    </Button>
                    <Button 
                      onClick={createTestBudget}
                      variant="secondary"
                    >
                      Criar Orçamento de Teste
                    </Button>
                    <Button 
                      onClick={createTestService}
                      variant="secondary"
                    >
                      Criar Ordem de Serviço de Teste
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Resultados dos Testes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] overflow-y-auto p-4 border rounded-md bg-muted text-sm">
                    {testResults.length === 0 ? (
                      <p className="text-muted-foreground">Os resultados dos testes aparecerão aqui...</p>
                    ) : (
                      testResults.map((result, index) => (
                        <div key={index} className="mb-1">
                          {result.includes("ERRO") ? (
                            <p className="text-red-500">{result}</p>
                          ) : result.includes("AVISO") ? (
                            <p className="text-amber-500">{result}</p>
                          ) : (
                            <p>{result}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
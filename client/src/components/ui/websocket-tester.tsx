import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import socketService from '@/lib/socketService';
import { Loader2 } from 'lucide-react';

/**
 * Componente para testar a conexão WebSocket
 */
export default function WebSocketTester() {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState<string>("");

  useEffect(() => {
    // Ouvir eventos de conexão
    const handleConnection = () => {
      setConnected(true);
      setLoading(false);
      addLog('Conexão estabelecida');
    };

    // Ouvir eventos de desconexão
    const handleDisconnection = (data: any) => {
      setConnected(false);
      setLoading(false);
      addLog(`Desconexão: Código ${data.code} - ${data.reason || 'Sem motivo'}`);
    };

    // Ouvir eventos de erro
    const handleError = () => {
      setConnected(false);
      setLoading(false);
      addLog('Erro na conexão WebSocket');
    };

    // Ouvir respostas do servidor
    const handleResponse = (data: any) => {
      addLog(`Resposta: ${JSON.stringify(data)}`);
    };

    // Registrar listeners
    socketService.addListener('connection', handleConnection);
    socketService.addListener('disconnection', handleDisconnection);
    socketService.addListener('error', handleError);
    socketService.addListener('response', handleResponse);

    // Verificar estado inicial da conexão
    if (socketService.isConnected()) {
      setConnected(true);
      addLog('Já conectado ao servidor WebSocket');
    }

    // Limpeza ao desmontar
    return () => {
      socketService.removeListener('connection', handleConnection);
      socketService.removeListener('disconnection', handleDisconnection);
      socketService.removeListener('error', handleError);
      socketService.removeListener('response', handleResponse);
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-10));
  };

  const handleConnect = () => {
    setLoading(true);
    addLog('Iniciando conexão...');
    socketService.connect();
  };

  const handleDisconnect = () => {
    addLog('Desconectando...');
    socketService.disconnect();
  };

  const handleSendTest = () => {
    if (!connected) {
      addLog('Não conectado. Não é possível enviar mensagem.');
      return;
    }

    addLog(`Enviando mensagem de teste: "${testMessage || 'Teste de WebSocket'}""`);
    socketService.send({
      type: 'test',
      message: testMessage || 'Teste de WebSocket',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm space-y-4 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Teste de WebSocket</h3>
        <Badge 
          variant={connected ? "success" : "destructive"} 
          className={connected ? "bg-green-500" : "bg-red-500"}
        >
          {connected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={handleConnect}
          disabled={connected || loading}
          className="w-1/2"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Conectar
        </Button>
        <Button
          variant="outline"
          onClick={handleDisconnect}
          disabled={!connected || loading}
          className="w-1/2"
        >
          Desconectar
        </Button>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Mensagem de teste"
          className="border rounded p-2 flex-grow dark:bg-gray-700 dark:border-gray-600"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
        />
        <Button 
          onClick={handleSendTest} 
          disabled={!connected}
        >
          Enviar
        </Button>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Logs:</h4>
        <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded h-40 overflow-y-auto text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400 p-2">Sem logs para exibir</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
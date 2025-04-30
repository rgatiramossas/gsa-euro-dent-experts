// Utilidades para comunicação via WebSocket 
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

/**
 * Configurar servidor WebSocket com funcionalidades de broadcast
 * @param server Servidor HTTP para anexar o WebSocket
 * @returns O servidor WebSocket configurado e uma função de broadcast
 */
export function setupWebSocketServer(server: Server) {
  // Configurar WebSocket Server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });
  
  // Mapa para armazenar conexões ativas
  const clients = new Map<number, WebSocket>();
  
  // Contador para IDs de clientes
  let clientIdCounter = 1;
  
  // Função para broadcast para todos os clientes conectados
  const broadcastMessage = (message: any) => {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };
  
  // Evento de nova conexão
  wss.on('connection', (ws) => {
    console.log('WebSocket: Nova conexão estabelecida');
    
    // Gerar ID único para o cliente
    const clientId = clientIdCounter++;
    clients.set(clientId, ws);
    
    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Conexão WebSocket estabelecida com sucesso',
      clientId: clientId
    }));
    
    // Eventos da conexão
    ws.on('message', (message) => {
      try {
        console.log('WebSocket: Mensagem recebida:', message.toString());
        const data = JSON.parse(message.toString());
        
        // Verificar se é uma mensagem de notificação para broadcast
        if (data.type === 'notification' && data.broadcast === true) {
          // Remover a flag de broadcast antes de enviar
          const { broadcast, ...messageWithoutBroadcast } = data;
          broadcastMessage(messageWithoutBroadcast);
          return;
        }
        
        // Verificar se é uma mensagem de teste
        if (data.type === 'test') {
          // Responder com uma notificação de teste
          broadcastMessage({
            type: 'notification',
            title: 'Notificação de Teste',
            message: data.message || 'Esta é uma notificação de teste do servidor',
            notificationType: 'info',
            id: Date.now().toString()
          });
          return;
        }
        
        // Resposta padrão
        ws.send(JSON.stringify({
          type: 'response',
          message: 'Mensagem recebida pelo servidor',
          received: data
        }));
      } catch (error) {
        console.error('WebSocket: Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Erro ao processar mensagem'
        }));
      }
    });
    
    // Evento de fechamento da conexão
    ws.on('close', (code, reason) => {
      console.log(`WebSocket: Conexão fechada - Código: ${code}, Motivo: ${reason.toString()}`);
      clients.delete(clientId);
    });
    
    // Evento de erro
    ws.on('error', (error) => {
      console.error('WebSocket: Erro na conexão:', error);
      clients.delete(clientId);
    });
  });
  
  // Expor a função de broadcast para uso em outras partes da aplicação
  (global as any).websocketBroadcast = broadcastMessage;
  
  return { wss, broadcastMessage };
}

/**
 * Enviar uma notificação global para todos os clientes WebSocket conectados
 * @param title Título da notificação
 * @param message Mensagem da notificação
 * @param type Tipo da notificação ('info', 'success', 'warning', 'error')
 */
export function sendGlobalNotification(
  title: string, 
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  if (!(global as any).websocketBroadcast) {
    console.error('WebSocket: Broadcast não disponível');
    return;
  }
  
  (global as any).websocketBroadcast({
    type: 'notification',
    title,
    message,
    notificationType: type,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Enviar uma notificação para um cliente específico
 * (Esta função é um placeholder - implementação completa requer armazenamento de IDs de usuário)
 */
export function sendUserNotification(
  userId: number,
  title: string, 
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  // Por enquanto, isso apenas enviará a todos - precisaria de uma estrutura mais avançada
  // para mapear IDs de usuário para suas conexões WebSocket
  sendGlobalNotification(title, message, type);
}
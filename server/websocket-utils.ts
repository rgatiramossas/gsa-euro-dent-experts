// Utilidades para comunicação via WebSocket 
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

/**
 * Configurar servidor WebSocket com funcionalidades de broadcast
 * @param server Servidor HTTP para anexar o WebSocket
 * @returns O servidor WebSocket configurado e uma função de broadcast
 */
export function setupWebSocketServer(server: Server) {
  console.log('[WebSocket] Inicializando servidor WebSocket no caminho /ws');
  
  // Configurar WebSocket Server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });
  
  // Log quando o servidor WebSocket estiver pronto
  wss.on('listening', () => {
    console.log('[WebSocket] Servidor WebSocket está ouvindo conexões');
  });
  
  // Log de erros no servidor WebSocket
  wss.on('error', (error) => {
    console.error('[WebSocket] Erro no servidor WebSocket:', error);
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
  
  // Configurar intervalo de ping para todos os clientes (a cada 30 segundos)
  const pingInterval = setInterval(() => {
    console.log('[WebSocket] Enviando ping para manter conexões ativas');
    
    wss.clients.forEach((client) => {
      // Verificar se o cliente ainda está ativo
      // @ts-ignore - Propriedade adicionada por nós
      if (client.isAlive === false) {
        console.log('[WebSocket] Terminando conexão inativa');
        client.terminate();
        return;
      }
      
      // Marcar como inativo até que responda com pong
      // @ts-ignore
      client.isAlive = false;
      
      if (client.readyState === WebSocket.OPEN) {
        try {
          // Enviar ping nativo do WebSocket
          client.ping();
          
          // Enviar também um "ping" como mensagem para clientes que processam mensagens
          client.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: new Date().toISOString() 
          }));
        } catch (err) {
          console.error('[WebSocket] Erro ao enviar ping:', err);
        }
      }
    });
  }, 30000); // 30 segundos
  
  // Limpar intervalo quando o servidor for fechado
  wss.on('close', () => {
    console.log('[WebSocket] Servidor WebSocket fechado, limpando intervalos');
    clearInterval(pingInterval);
  });

  // Evento de nova conexão
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || 'desconhecido';
    console.log(`WebSocket: Nova conexão estabelecida de ${ip}`);
    
    // Verificar se o objeto WebSocket está OK
    if (!ws || typeof ws.send !== 'function') {
      console.error('[WebSocket] Objeto de conexão inválido');
      return;
    }
    
    // Configurar heartbeat para esta conexão
    // @ts-ignore - Adicionamos esta propriedade para rastrear a última atividade
    ws.isAlive = true;
    
    // Configurar handler para pong (resposta ao ping)
    ws.on('pong', () => {
      // @ts-ignore
      ws.isAlive = true;
    });
    
    // Gerar ID único para o cliente
    const clientId = clientIdCounter++;
    clients.set(clientId, ws);
    
    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Conexão WebSocket estabelecida com sucesso',
      clientId: clientId,
      timestamp: new Date().toISOString()
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
// Utilidades para comunicação via WebSocket 
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';

/**
 * Configurar servidor WebSocket com funcionalidades de broadcast
 * @param server Servidor HTTP para anexar o WebSocket
 * @returns O servidor WebSocket configurado e uma função de broadcast
 */
export function setupWebSocketServer(server: Server) {
  console.log('[WebSocket] Inicializando servidor WebSocket no caminho /ws');
  
  // Configurar WebSocket Server com opções mais relaxadas
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    // A configuração abaixo permite origens cruzadas (CORS para WebSockets)
    verifyClient: (info) => {
      // Registrar tentativas de conexão
      console.log(`[WebSocket] Tentativa de conexão de ${info.req.socket.remoteAddress} - Origem: ${info.origin || 'Desconhecida'}`);
      
      // Aceitar todas as conexões
      return true;
    },
    // Aumentar os timeouts
    clientTracking: true, // Rastrear clientes automaticamente
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
    const connectionId = randomUUID().substring(0, 8);
    
    console.log(`[WebSocket] Nova conexão estabelecida de ${ip} (ID: ${connectionId})`);
    
    // Verificar se o objeto WebSocket está OK
    if (!ws || typeof ws.send !== 'function') {
      console.error('[WebSocket] Objeto de conexão inválido');
      return;
    }
    
    // Configurar heartbeat para esta conexão
    // @ts-ignore - Adicionamos esta propriedade para rastrear a última atividade
    ws.isAlive = true;
    // @ts-ignore - ID para rastreamento em logs
    ws.connectionId = connectionId;
    
    // Configurar handler para pong (resposta ao ping)
    ws.on('pong', () => {
      // @ts-ignore
      ws.isAlive = true;
      console.log(`[WebSocket] Recebido pong da conexão ${connectionId} (nativo)`);
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
        // @ts-ignore
        const connId = ws.connectionId || 'desconhecido';
        const messageStr = message.toString();
        
        // Tentativa de parsing/tratamento da mensagem
        try {
          const data = JSON.parse(messageStr);
          
          // Tratar resposta de ping/pong
          if (data.type === 'pong') {
            // @ts-ignore
            ws.isAlive = true;
            console.log(`[WebSocket] Recebido pong da conexão ${connId} (via JSON)`);
            return;
          }
          
          console.log(`[WebSocket] Mensagem recebida da conexão ${connId}:`, 
            JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''));
          
          // Verificar se é uma mensagem de notificação para broadcast
          if (data.type === 'notification' && data.broadcast === true) {
            // Remover a flag de broadcast antes de enviar
            const { broadcast, ...messageWithoutBroadcast } = data;
            broadcastMessage(messageWithoutBroadcast);
            return;
          }
          
          // Verificar se é uma mensagem de teste
          if (data.type === 'test') {
            console.log(`[WebSocket] Mensagem de teste recebida de ${connId}, enviando notificação`);
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
            received: data,
            timestamp: new Date().toISOString()
          }));
        } catch (jsonError) {
          // Se não for JSON válido, apenas registrar a mensagem
          console.log(`[WebSocket] Mensagem não-JSON recebida da conexão ${connId}:`, messageStr);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Formato de mensagem inválido - esperado JSON',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('[WebSocket] Erro ao processar mensagem:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Erro ao processar mensagem',
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.error('[WebSocket] Erro ao enviar resposta de erro:', e);
        }
      }
    });
    
    // Evento de fechamento da conexão
    ws.on('close', (code, reason) => {
      // @ts-ignore
      const connId = ws.connectionId || 'desconhecido';
      console.log(`[WebSocket] Conexão ${connId} fechada - Código: ${code}, Motivo: ${reason.toString() || 'Não fornecido'}`);
      
      let explanationMsg = '';
      
      // Explicações para os códigos comuns
      switch (code) {
        case 1000:
          explanationMsg = 'Fechamento normal';
          break;
        case 1001:
          explanationMsg = 'Endpoint desligando (indo embora)';
          break;
        case 1002:
          explanationMsg = 'Erro de protocolo';
          break;
        case 1003:
          explanationMsg = 'Tipo de dados não aceito';
          break;
        case 1005:
          explanationMsg = 'Sem código de status (fechamento anormal)';
          break;
        case 1006:
          explanationMsg = 'Fechamento anormal (sem evento de fechamento)';
          break;
        case 1007:
          explanationMsg = 'Dados inválidos (não UTF-8)';
          break;
        case 1008:
          explanationMsg = 'Violação de política';
          break;
        case 1009:
          explanationMsg = 'Mensagem muito grande';
          break;
        case 1010:
          explanationMsg = 'Cliente esperava uma extensão não negociada';
          break;
        case 1011:
          explanationMsg = 'Erro interno do servidor';
          break;
        case 1012:
          explanationMsg = 'Servidor reiniciando';
          break;
        case 1013:
          explanationMsg = 'Servidor temporariamente indisponível';
          break;
        case 1014:
          explanationMsg = 'Servidor atuando como gateway ou proxy recebeu resposta inválida';
          break;
        case 1015:
          explanationMsg = 'Falha na verificação TLS';
          break;
        default:
          explanationMsg = 'Código de fechamento não padronizado';
      }
      
      console.log(`[WebSocket] Explicação do código ${code}: ${explanationMsg}`);
      clients.delete(clientId);
    });
    
    // Evento de erro
    ws.on('error', (error) => {
      // @ts-ignore
      const connId = ws.connectionId || 'desconhecido';
      console.error(`[WebSocket] Erro na conexão ${connId}:`, error);
      clients.delete(clientId);
      
      // Tentamos enviar uma mensagem antes de desconectar
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Erro na conexão WebSocket',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (e) {
        console.error('[WebSocket] Erro ao enviar mensagem de erro:', e);
      }
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
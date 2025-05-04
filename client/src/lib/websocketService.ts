/**
 * Serviço WebSocket para comunicação em tempo real
 * Permite receber notificações do servidor para atualizações em tempo real
 */

import { queryClient } from '@/lib/queryClient';

// Tipos para mensagens WebSocket
export type WebSocketMessageType = 
  | 'CONNECTION_ESTABLISHED' 
  | 'SERVICE_CREATED' 
  | 'SERVICE_UPDATED' 
  | 'SERVICE_DELETED' 
  | 'REQUEST_REFRESH' 
  | 'REFRESH_COMMAND';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: any;
  message?: string;
  timestamp: string;
}

// Estado do WebSocket
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 segundos

// Eventos para os quais é possível se registrar
export type WebSocketEventType = WebSocketMessageType | 'connection_open' | 'connection_error' | 'connection_close';

// Armazenamento dos callbacks
const eventListeners: Record<WebSocketEventType, Array<(data?: any) => void>> = {
  CONNECTION_ESTABLISHED: [],
  SERVICE_CREATED: [],
  SERVICE_UPDATED: [],
  SERVICE_DELETED: [],
  REQUEST_REFRESH: [],
  REFRESH_COMMAND: [],
  connection_open: [],
  connection_error: [],
  connection_close: []
};

/**
 * Inicializa a conexão WebSocket
 */
export function initWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket já está conectado');
    return;
  }
  
  try {
    // Determinar o protocolo correto (ws ou wss) baseado no protocolo atual da página
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Conectando WebSocket em ${wsUrl}`);
    socket = new WebSocket(wsUrl);
    
    // Configurar os manipuladores de eventos do WebSocket
    socket.onopen = () => {
      console.log('Conexão WebSocket estabelecida');
      reconnectAttempts = 0;
      triggerEvent('connection_open');
    };
    
    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Mensagem WebSocket recebida:', message);
        
        if (message.type) {
          // Invalidar o cache do React Query para atualizar a UI com novos dados
          handleCacheInvalidation(message);
          
          // Acionar eventos registrados
          triggerEvent(message.type, message.data);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('Erro na conexão WebSocket:', error);
      triggerEvent('connection_error', error);
    };
    
    socket.onclose = () => {
      console.log('Conexão WebSocket fechada');
      triggerEvent('connection_close');
      
      // Tentar reconectar se não excedemos o número máximo de tentativas
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Tentando reconectar (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(initWebSocket, RECONNECT_DELAY);
      } else {
        console.log('Número máximo de tentativas de reconexão excedido');
      }
    };
  } catch (error) {
    console.error('Falha ao configurar WebSocket:', error);
  }
}

/**
 * Fecha a conexão WebSocket
 */
export function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Envia uma mensagem através do WebSocket
 */
export function sendMessage(type: WebSocketMessageType, data?: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message: Partial<WebSocketMessage> = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(message));
  } else {
    console.error('WebSocket não está conectado. Impossível enviar mensagem.');
  }
}

/**
 * Registra um callback para um evento WebSocket específico
 */
export function addEventListener(eventType: WebSocketEventType, callback: (data?: any) => void) {
  if (eventListeners[eventType]) {
    eventListeners[eventType].push(callback);
  } else {
    console.error(`Tipo de evento não suportado: ${eventType}`);
  }
  
  // Retorna uma função para remover o listener
  return () => {
    const index = eventListeners[eventType].indexOf(callback);
    if (index !== -1) {
      eventListeners[eventType].splice(index, 1);
    }
  };
}

/**
 * Aciona todos os callbacks registrados para um evento
 */
function triggerEvent(eventType: WebSocketEventType, data?: any) {
  if (eventListeners[eventType]) {
    eventListeners[eventType].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro ao executar callback para evento ${eventType}:`, error);
      }
    });
  }
}

/**
 * Gerencia a invalidação de cache do React Query baseado nas mensagens recebidas
 */
function handleCacheInvalidation(message: WebSocketMessage) {
  switch (message.type) {
    case 'SERVICE_CREATED':
    case 'SERVICE_UPDATED':
      // Invalidar a lista de serviços e o serviço específico
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      if (message.data?.service?.id) {
        queryClient.invalidateQueries({queryKey: [`/api/services/${message.data.service.id}`]});
      }
      
      // Se o serviço estiver associado a um cliente, invalidar seus dados também
      if (message.data?.service?.client_id) {
        queryClient.invalidateQueries({queryKey: [`/api/clients/${message.data.service.client_id}`]});
        queryClient.invalidateQueries({queryKey: [`/api/clients/${message.data.service.client_id}/services`]});
      }
      
      // Invalidar estatísticas do dashboard
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/technician-performance']});
      break;
      
    case 'SERVICE_DELETED':
      queryClient.invalidateQueries({queryKey: ['/api/services']});
      
      // Se houver ID do serviço na mensagem
      if (message.data?.serviceId) {
        queryClient.invalidateQueries({queryKey: [`/api/services/${message.data.serviceId}`]});
      }
      
      // Invalidar estatísticas do dashboard
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/technician-performance']});
      break;
      
    case 'REFRESH_COMMAND':
      // Invalidar todos os dados
      queryClient.invalidateQueries();
      break;
  }
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '@/lib/socketService';

// Tipo para o context
type WebSocketContextType = {
  isConnected: boolean;
  lastMessage: any | null;
  send: (data: any) => boolean;
  addListener: (type: string, callback: (data: any) => void) => void;
  removeListener: (type: string, callback: (data: any) => void) => void;
};

// Criar o contexto
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Provider que encapsula o WebSocket
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  // Mapear estado de conexão
  useEffect(() => {
    const handleConnection = () => {
      setIsConnected(true);
    };

    const handleDisconnection = () => {
      setIsConnected(false);
    };

    const handleMessage = (data: any) => {
      setLastMessage(data);
    };

    // Adicionar listeners
    socketService.addListener('connection', handleConnection);
    socketService.addListener('disconnection', handleDisconnection);
    socketService.addListener('message', handleMessage);

    // Verificar estado atual
    setIsConnected(socketService.isConnected());

    return () => {
      // Remover listeners ao desmontar
      socketService.removeListener('connection', handleConnection);
      socketService.removeListener('disconnection', handleDisconnection);
      socketService.removeListener('message', handleMessage);
    };
  }, []);

  // Função para enviar mensagens
  const send = (data: any): boolean => {
    return socketService.send(data);
  };

  // Função para adicionar listeners específicos
  const addListener = (type: string, callback: (data: any) => void): void => {
    socketService.addListener(type, callback);
  };

  // Função para remover listeners
  const removeListener = (type: string, callback: (data: any) => void): void => {
    socketService.removeListener(type, callback);
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastMessage,
        send,
        addListener,
        removeListener,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook personalizado para acessar o contexto
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket deve ser usado dentro de um WebSocketProvider');
  }
  return context;
}
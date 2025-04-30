import React, { useEffect, useState } from 'react';
import { useWebSocket } from './websocket-provider';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
};

export function RealtimeNotifications() {
  const { isConnected, lastMessage, addListener, removeListener } = useWebSocket();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [open, setOpen] = useState(false);

  // Processar notificações recebidas via WebSocket
  useEffect(() => {
    const handleNotification = (data: any) => {
      if (data.type === 'notification') {
        // Criar nova notificação
        const newNotification: Notification = {
          id: data.id || Date.now().toString(),
          title: data.title || 'Nova notificação',
          message: data.message,
          type: data.notificationType || 'info',
          timestamp: new Date(),
          read: false
        };

        // Adicionar à lista
        setNotifications(prev => [newNotification, ...prev]);
        setHasUnread(true);

        // Mostrar toast
        toast({
          title: newNotification.title,
          description: newNotification.message,
          variant: newNotification.type === 'error' ? 'destructive' : 'default',
        });
      }
    };

    // Registrar listener para notificações
    addListener('notification', handleNotification);

    // Remover listener ao desmontar
    return () => {
      removeListener('notification', handleNotification);
    };
  }, [addListener, removeListener, toast]);

  // Marcar todas como lidas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setHasUnread(false);
  };

  // Testar enviando uma notificação (apenas para desenvolvimento)
  const testNotification = () => {
    if (isConnected) {
      // Enviar teste para o servidor
      const testData = {
        type: 'test',
        message: 'Testando notificação em tempo real'
      };
      
      // Use o hook useWebSocket para enviar
      //send(testData);
      
      // Para teste local sem passar pelo servidor:
      const newNotification: Notification = {
        id: Date.now().toString(),
        title: 'Notificação de teste',
        message: 'Esta é uma notificação de teste para verificar o sistema.',
        type: 'info',
        timestamp: new Date(),
        read: false
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setHasUnread(true);
    } else {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível enviar a notificação. WebSocket desconectado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-10 w-10",
            hasUnread && "after:absolute after:top-1 after:right-1 after:h-2 after:w-2 after:rounded-full after:bg-destructive"
          )}
          onClick={() => {
            if (open && hasUnread) {
              markAllAsRead();
            }
          }}
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Notificações</h2>
          {isConnected ? (
            <div className="flex items-center">
              <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="mr-2 h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-xs text-muted-foreground">Offline</span>
            </div>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-center text-muted-foreground">
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    "border-b px-4 py-3 hover:bg-muted",
                    !notification.read && "bg-muted/50"
                  )}
                >
                  <div className="flex justify-between">
                    <h3 className="font-medium">{notification.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{notification.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={!hasUnread}
          >
            Marcar todas como lidas
          </Button>
          {/* Botão de teste - remover em produção */}
          {process.env.NODE_ENV !== 'production' && (
            <Button variant="outline" size="sm" onClick={testNotification}>
              Testar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
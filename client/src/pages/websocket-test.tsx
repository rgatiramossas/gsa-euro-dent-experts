import React from 'react';
import WebSocketTester from '@/components/ui/websocket-tester';

export default function WebSocketTestPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Teste de WebSocket</h1>
        <p className="text-muted-foreground">
          Use esta página para testar a conexão WebSocket e o envio de mensagens em tempo real.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-1">
        <WebSocketTester />
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-2">Sobre o WebSocket</h2>
        <p className="mb-4">
          Os WebSockets permitem uma comunicação bidirecional em tempo real entre o navegador e o servidor.
          Esta funcionalidade é usada no sistema para notificações em tempo real e atualizações automáticas
          quando outros usuários fazem alterações.
        </p>
        
        <h3 className="text-md font-semibold mb-2">Como usar:</h3>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>Clique em <strong>Conectar</strong> para estabelecer a conexão WebSocket</li>
          <li>Observe a indicação <strong>Conectado</strong> quando a conexão for estabelecida</li>
          <li>Digite uma mensagem de teste e clique em <strong>Enviar</strong></li>
          <li>Veja as mensagens de resposta do servidor nos logs abaixo</li>
          <li>Se necessário, clique em <strong>Desconectar</strong> para encerrar a conexão</li>
        </ol>
        
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          As conexões WebSocket são automaticamente restabelecidas se forem perdidas devido a problemas 
          de rede ou quando o servidor é reiniciado.
        </p>
      </div>
    </div>
  );
}
// Serviço de WebSocket para Euro Dent Experts
// Este módulo controla a comunicação em tempo real com o servidor

class SocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private messageListeners: Map<string, ((data: any) => void)[]> = new Map();
  private isConnecting = false;

  // Conectar ao servidor WebSocket
  public connect(): void {
    // Evitar tentativas de conexão simultâneas
    if (this.isConnecting || this.socket?.readyState === WebSocket.CONNECTING) {
      console.log('Conexão WebSocket já está em andamento');
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('Conexão WebSocket já está aberta');
      return;
    }

    this.isConnecting = true;

    try {
      // Configurar protocolo correto
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      
      // Hostname e porta
      const hostname = window.location.hostname;
      let port = window.location.port;
      
      // Para ambiente Replit não usar porta pode ser melhor
      if (hostname.includes('.replit.dev') || hostname.includes('.repl.co')) {
        port = '';
      }
      
      // Montar URL - ou com porta ou sem porta dependendo das configurações
      const portPart = port ? `:${port}` : '';
      const wsUrl = `${protocol}://${hostname}${portPart}/ws`;
      
      console.log(`[WebSocket] Tentando conexão em: ${wsUrl}`);
      
      // Criar nova conexão
      this.socket = new WebSocket(wsUrl);
      
      // Definir timeout para a tentativa (5 segundos)
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          console.log('[WebSocket] Timeout de conexão');
          
          // Limpar handlers
          if (this.socket) {
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            
            try {
              this.socket.close();
            } catch (e) {
              console.error('[WebSocket] Erro ao fechar conexão em timeout:', e);
            }
            
            this.socket = null;
          }
          
          this.isConnecting = false;
          this.scheduleReconnect();
        }
      }, 5000);
      
      // Configurar evento de abertura de conexão
      this.socket.onopen = (event) => {
        clearTimeout(connectionTimeout);
        this.handleOpen(event);
      };
      
      // Configurar evento de mensagem
      this.socket.onmessage = this.handleMessage.bind(this);
      
      // Configurar evento de fechamento
      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.handleClose(event);
      };
      
      // Configurar evento de erro
      this.socket.onerror = (event) => {
        clearTimeout(connectionTimeout);
        this.handleError(event);
        
        if (this.socket?.readyState !== WebSocket.OPEN) {
          this.isConnecting = false;
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Erro ao inicializar WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Evento: Conexão estabelecida
  private handleOpen(event: Event): void {
    console.log('%c[WebSocket] Conexão estabelecida com sucesso', 'color: green; font-weight: bold');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Log informações da conexão
    const wsProtocol = this.socket?.protocol || '(sem protocolo)';
    const wsUrl = this.socket?.url || '(sem URL)';
    console.log(`[WebSocket] Detalhes da conexão: URL=${wsUrl}, Protocolo=${wsProtocol}`);
    
    // Notificar que a conexão foi estabelecida
    this.notifyListeners('connection', { status: 'connected' });
  }

  // Evento: Mensagem recebida
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Tratar mensagens de ping de maneira especial
      if (data && data.type === 'ping') {
        // Responder com um pong
        this.send({
          type: 'pong',
          timestamp: new Date().toISOString(),
          echo: data.timestamp // ecoar o timestamp do ping para debug
        });
        
        // Não registrar cada ping/pong para não poluir o console
        return;
      }
      
      // Log apenas para mensagens que não são ping
      console.log('Mensagem WebSocket recebida:', data);
      
      // Notificar listeners baseado no tipo de mensagem
      if (data && data.type) {
        this.notifyListeners(data.type, data);
      }
      
      // Também notificar listeners gerais
      this.notifyListeners('message', data);
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  // Evento: Conexão fechada
  private handleClose(event: CloseEvent): void {
    console.log(`%c[WebSocket] Conexão fechada: ${event.code} - ${event.reason || 'Sem motivo'}`, 
      event.wasClean ? 'color: orange' : 'color: red; font-weight: bold');
    
    // Log de diagnóstico detalhado
    console.log(`[WebSocket] Detalhes do fechamento:
      - Código: ${event.code}
      - Motivo: ${event.reason || 'Não fornecido'}
      - Fechamento limpo: ${event.wasClean ? 'Sim' : 'Não'}
      - Timestamp: ${new Date().toISOString()}
    `);
    
    this.isConnecting = false;
    this.socket = null;
    
    // Notificar que a conexão foi fechada
    this.notifyListeners('disconnection', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    // Analisar códigos específicos de fechamento
    if (event.code === 1006) {
      console.warn('[WebSocket] Conexão fechada anormalmente (código 1006). Possível problema na conexão ou servidor indisponível.');
    } else if (event.code === 1001) {
      console.log('[WebSocket] Endpoint indo embora (código 1001). Servidor está sendo desligado ou reiniciado.');
    } else if (event.code === 1011) {
      console.error('[WebSocket] Erro interno do servidor (código 1011). Verificar logs do servidor.');
    }
    
    // Tentar reconectar se o fechamento não foi limpo ou foi código 1006 (fechamento anormal)
    if (!event.wasClean || event.code === 1006) {
      this.scheduleReconnect();
    }
  }

  // Evento: Erro na conexão
  private handleError(event: Event): void {
    console.error('%c[WebSocket] Erro na conexão:', 'color: red; font-weight: bold', event);
    this.isConnecting = false;
    
    // Log adicional com mais informações
    console.error(`[WebSocket] Estado atual: ${this.socket ? this.getReadyStateAsString() : 'Socket não inicializado'}`);
    if (this.socket) {
      console.error(`[WebSocket] URL: ${this.socket.url}`);
    }
    
    // Notificar sobre o erro
    this.notifyListeners('error', { event });
  }
  
  // Converter o estado numérico do WebSocket para string
  private getReadyStateAsString(): string {
    if (!this.socket) return 'Socket não inicializado';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING (0) - Conexão em andamento';
      case WebSocket.OPEN:
        return 'OPEN (1) - Conexão estabelecida';
      case WebSocket.CLOSING:
        return 'CLOSING (2) - Conexão fechando';
      case WebSocket.CLOSED:
        return 'CLOSED (3) - Conexão fechada';
      default:
        return `Desconhecido (${this.socket.readyState})`;
    }
  }

  // Agendar reconexão após falha
  private scheduleReconnect(): void {
    // Limitar tentativas de reconexão
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Número máximo de tentativas de reconexão atingido');
      return;
    }

    // Cancelar qualquer timeout existente
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
    }

    // Delay exponencial entre tentativas
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Tentando reconectar em ${delay / 1000} segundos...`);
    
    this.reconnectAttempts++;
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Enviar mensagem para o servidor
  public send(data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Não é possível enviar mensagem: WebSocket não está conectado');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem WebSocket:', error);
      return false;
    }
  }

  // Fechar conexão
  public disconnect(): void {
    if (!this.socket) {
      return;
    }

    try {
      this.socket.close(1000, 'Desconexão normal');
    } catch (error) {
      console.error('Erro ao fechar conexão WebSocket:', error);
    }
  }

  // Adicionar listener para um tipo específico de mensagem
  public addListener(type: string, callback: (data: any) => void): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, []);
    }
    
    const listeners = this.messageListeners.get(type)!;
    if (!listeners.includes(callback)) {
      listeners.push(callback);
    }
  }

  // Remover listener
  public removeListener(type: string, callback: (data: any) => void): void {
    if (!this.messageListeners.has(type)) {
      return;
    }
    
    const listeners = this.messageListeners.get(type)!;
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // Notificar todos os listeners de um tipo específico
  private notifyListeners(type: string, data: any): void {
    const listeners = this.messageListeners.get(type) || [];
    
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Erro em listener de WebSocket para "${type}":`, error);
      }
    }
  }

  // Verificar se está conectado
  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Criar instância única para toda a aplicação
const socketService = new SocketService();

export default socketService;
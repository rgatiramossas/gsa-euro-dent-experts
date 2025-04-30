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
      // Configurar a URL do WebSocket dependendo do ambiente (HTTP/HTTPS)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Obter a porta correta do ambiente
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
      // Usar hostname (sem porta) + a porta explícita
      const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws`;
      
      console.log(`Tentando conectar ao WebSocket em: ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      // Configurar eventos
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Erro ao inicializar WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Evento: Conexão estabelecida
  private handleOpen(event: Event): void {
    console.log('Conexão WebSocket estabelecida com sucesso');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Notificar que a conexão foi estabelecida
    this.notifyListeners('connection', { status: 'connected' });
  }

  // Evento: Mensagem recebida
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
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
    console.log(`Conexão WebSocket fechada: ${event.code} - ${event.reason}`);
    this.isConnecting = false;
    this.socket = null;
    
    // Notificar que a conexão foi fechada
    this.notifyListeners('disconnection', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    // Tentar reconectar se o fechamento não foi limpo
    if (!event.wasClean) {
      this.scheduleReconnect();
    }
  }

  // Evento: Erro na conexão
  private handleError(event: Event): void {
    console.error('Erro na conexão WebSocket:', event);
    this.isConnecting = false;
    
    // Notificar sobre o erro
    this.notifyListeners('error', { event });
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
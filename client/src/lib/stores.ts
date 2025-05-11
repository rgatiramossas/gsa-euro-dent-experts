// Este arquivo continha código para gerenciar estado offline, removido para evitar problemas com Windows Defender
// Módulo simplificado para compatibilidade

type Listener = () => void;

// Implementação de store simplificada - sempre retorna como online
class OnlineStatusStore {
  private listeners: Listener[] = [];

  // Adicionar um listener para mudanças de estado (mantido para compatibilidade)
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar todos os listeners de mudanças (sem uso, mantido para compatibilidade)
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Obter o estado atual - sempre retorna online
  getState(): { isOnline: boolean; isSyncing: boolean; pendingCount: number } {
    return {
      isOnline: true,  // Sempre online
      isSyncing: false,
      pendingCount: 0
    };
  }
  
  // Método público para verificar se está online - sempre retorna true
  getOnlineStatus(): boolean {
    return true;
  }
  
  // Método público para verificar se está sincronizando - sempre false
  getSyncingStatus(): boolean {
    return false;
  }
  
  // Método público para obter a contagem de requisições pendentes - sempre 0
  getPendingCount(): number {
    return 0;
  }

  // Métodos de atualização mantidos por compatibilidade, mas sem efeito
  setOnline(status: boolean): void {
    // Sem efeito, sempre online
  }

  setSyncing(status: boolean): void {
    // Sem efeito
  }

  setPendingCount(count: number): void {
    // Sem efeito
  }
}

// Criar e exportar a instância da store
export const offlineStatusStore = new OnlineStatusStore();
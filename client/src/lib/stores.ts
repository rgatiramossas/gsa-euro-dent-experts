// Store para gerenciar o estado offline da aplicação

type Listener = () => void;

// Store simples para gerenciar estado offline
class OfflineStatusStore {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private listeners: Listener[] = [];

  constructor() {
    // Verificar estado inicial
    this.isOnline = navigator.onLine;
  }

  // Adicionar um listener para mudanças de estado
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar todos os listeners de mudanças
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Obter o estado atual
  getState(): { isOnline: boolean; isSyncing: boolean; pendingCount: number } {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount
    };
  }

  // Atualizar status online
  setOnline(status: boolean): void {
    if (this.isOnline !== status) {
      this.isOnline = status;
      this.notify();
    }
  }

  // Atualizar status de sincronização
  setSyncing(status: boolean): void {
    if (this.isSyncing !== status) {
      this.isSyncing = status;
      this.notify();
    }
  }

  // Atualizar contagem de requisições pendentes
  setPendingCount(count: number): void {
    if (this.pendingCount !== count) {
      this.pendingCount = count;
      this.notify();
    }
  }
}

// Criar e exportar a instância da store
export const offlineStatusStore = new OfflineStatusStore();

// Hook React para usar o estado offline (importado no componente)
// O uso seria assim:
/*
import { useOfflineStatus } from '@/lib/stores';

function Component() {
  const { isOnline, isSyncing, pendingCount } = useOfflineStatus();
  
  return (
    <div>
      {isOnline ? 'Online' : 'Offline'}
      {isSyncing && 'Sincronizando...'}
      {pendingCount > 0 && `${pendingCount} requisições pendentes`}
    </div>
  );
}
*/
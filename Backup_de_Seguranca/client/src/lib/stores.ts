// Store para gerenciar o estado offline da aplicação

type Listener = () => void;

// Store simples para gerenciar estado offline
class OfflineStatusStore {
  private _isOnline: boolean = navigator.onLine;
  private _isSyncing: boolean = false;
  private _pendingCount: number = 0;
  private listeners: Listener[] = [];

  constructor() {
    // Verificar estado inicial
    this._isOnline = navigator.onLine;
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
      isOnline: this._isOnline,
      isSyncing: this._isSyncing,
      pendingCount: this._pendingCount
    };
  }
  
  // Método público para verificar se está online
  getOnlineStatus(): boolean {
    return this._isOnline;
  }
  
  // Método público para verificar se está sincronizando
  getSyncingStatus(): boolean {
    return this._isSyncing;
  }
  
  // Método público para obter a contagem de requisições pendentes
  getPendingCount(): number {
    return this._pendingCount;
  }

  // Atualizar status online
  setOnline(status: boolean): void {
    if (this._isOnline !== status) {
      this._isOnline = status;
      this.notify();
    }
  }

  // Atualizar status de sincronização
  setSyncing(status: boolean): void {
    if (this._isSyncing !== status) {
      this._isSyncing = status;
      this.notify();
    }
  }

  // Atualizar contagem de requisições pendentes
  setPendingCount(count: number): void {
    if (this._pendingCount !== count) {
      this._pendingCount = count;
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
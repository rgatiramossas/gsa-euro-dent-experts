/**
 * Stores centralizadas para o estado da aplicação
 */

type Listener = () => void;

/**
 * OfflineStatusStore - Gerencia o estado de conectividade da aplicação
 * 
 * Esta store mantém estado sobre:
 * - Se o aplicativo está online
 * - Se há sincronização em andamento
 * - Quantos pedidos estão pendentes de sincronização
 */
class OfflineStatusStore {
  private _isOnline: boolean;
  private _isSyncing: boolean;
  private _pendingCount: number;
  private listeners: Set<Listener>;

  constructor() {
    this._isOnline = navigator.onLine;
    this._isSyncing = false;
    this._pendingCount = 0;
    this.listeners = new Set();
  }

  // Getters
  get isOnline(): boolean {
    return this._isOnline;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  get pendingCount(): number {
    return this._pendingCount;
  }

  // Setters que notificam os listeners
  setOnline(isOnline: boolean): void {
    if (this._isOnline !== isOnline) {
      this._isOnline = isOnline;
      this.notifyListeners();
    }
  }

  setSyncing(isSyncing: boolean): void {
    if (this._isSyncing !== isSyncing) {
      this._isSyncing = isSyncing;
      this.notifyListeners();
    }
  }

  setPendingCount(count: number): void {
    if (this._pendingCount !== count) {
      this._pendingCount = count;
      this.notifyListeners();
    }
  }

  // Sistema de inscrição para manter componentes atualizados
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    // Retorna função para cancelar inscrição
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton para estado de conectividade
export const offlineStatusStore = new OfflineStatusStore();
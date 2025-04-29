import { Workbox } from 'workbox-window';
import { offlineDb, syncPendingData, startPeriodicSync } from './offlineDb';

// Classe para gerenciar o PWA e sincronização offline
class PWAManager {
  private wb: Workbox | null = null;
  private isRegistered = false;

  // Inicialização do service worker e sistemas offline
  public async init(): Promise<void> {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');
      
      // Detectar quando um novo service worker está instalado
      this.wb.addEventListener('installed', event => {
        if (event.isUpdate) {
          // Nova versão disponível, mas não mostramos para o usuário conforme solicitado
          // Vamos atualizar em segundo plano
          console.log('Nova versão do aplicativo disponível, atualizando em segundo plano...');
          this.wb?.messageSkipWaiting();
        }
      });

      // Tratamento para quando o service worker controla a página
      this.wb.addEventListener('controlling', () => {
        // Service worker atualizado está controlando a página
        console.log('Service worker atualizado está controlando a página');
      });

      // Iniciar o service worker
      try {
        await this.wb.register();
        this.isRegistered = true;
        console.log('Service Worker registrado com sucesso');
        
        // Iniciar sincronização periódica
        this.setupSync();
      } catch (error) {
        console.error('Erro ao registrar o Service Worker:', error);
      }
    }
  }

  // Configurar sistema de sincronização
  private setupSync(): void {
    // Iniciar sincronização periódica
    startPeriodicSync(30000); // A cada 30 segundos
    
    // Tentar sincronizar imediatamente se online
    if (navigator.onLine) {
      syncPendingData();
    }
    
    // Configurar verificação de estado de conexão
    this.setupConnectionMonitoring();
  }

  // Monitorar estado da conexão
  private setupConnectionMonitoring(): void {
    // Já adicionado na função startPeriodicSync
    
    // Outra estratégia é usar o objeto NetworkInformation se disponível
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        connection.addEventListener('change', () => {
          const isOnline = navigator.onLine;
          const connectionType = connection.type;
          
          console.log(`Estado da conexão alterado: ${isOnline ? 'Online' : 'Offline'}, Tipo: ${connectionType}`);
          
          if (isOnline && (connectionType === 'wifi' || connectionType === 'ethernet')) {
            // Conexão forte, sincronizar imediatamente
            syncPendingData();
          }
        });
      }
    }
  }

  // Verificar se o aplicativo está instalado como PWA
  public isInstalledAsPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }

  // Verificar se o aplicativo pode ser instalado
  public async canBeInstalled(): Promise<boolean> {
    return !!this.getInstallPromptEvent();
  }

  // Armazenar o evento beforeinstallprompt para uso posterior
  private installPromptEvent: any = null;

  // Configurar detector de evento de instalação
  public setupInstallDetection(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que o navegador mostre a interface de instalação
      e.preventDefault();
      
      // Armazenar o evento para uso posterior
      this.installPromptEvent = e;
    });
    
    // Detectar quando o PWA é instalado
    window.addEventListener('appinstalled', () => {
      console.log('Aplicação instalada com sucesso');
      this.installPromptEvent = null;
    });
  }

  // Obter o evento de instalação
  public getInstallPromptEvent(): any {
    return this.installPromptEvent;
  }

  // Mostrar prompt de instalação programaticamente
  public async promptInstall(): Promise<boolean> {
    const promptEvent = this.getInstallPromptEvent();
    
    if (!promptEvent) {
      return false;
    }
    
    // Mostrar o prompt
    promptEvent.prompt();
    
    // Aguardar pela escolha do usuário
    const choiceResult = await promptEvent.userChoice;
    
    // Limpar o evento
    this.installPromptEvent = null;
    
    return choiceResult.outcome === 'accepted';
  }
}

// Criar e exportar uma instância única do gerenciador
export const pwaManager = new PWAManager();

// Exportar função para inicialização em app.tsx
export function initPWA(): void {
  pwaManager.init();
  pwaManager.setupInstallDetection();
}
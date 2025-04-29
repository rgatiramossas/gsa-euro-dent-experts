// PWA Manager para Euro Dent Experts

// Verifica se o navegador suporta Service Workers
export const isPWASupported = () => {
  return 'serviceWorker' in navigator;
};

// Registra o service worker
export const registerServiceWorker = async () => {
  if (!isPWASupported()) {
    console.error('Service Workers não são suportados neste navegador.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('Service Worker registrado com sucesso');

    // Configurar atualização automática quando houver nova versão
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Há uma nova versão pronta para ser usada
            if (window.confirm('Uma nova versão está disponível. Atualizar agora?')) {
              // Enviar mensagem para o service worker atualizar imediatamente
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Recarregar a página para usar o novo service worker
              window.location.reload();
            }
          }
        });
      }
    });

    // Verificar atualizações a cada hora (3600000 ms)
    setInterval(() => {
      registration.update();
    }, 3600000);

    return true;
  } catch (error) {
    console.error('Falha ao registrar o Service Worker:', error);
    return false;
  }
};

// Verificar estado da conexão
export const checkNetworkStatus = () => {
  const isOnline = navigator.onLine;
  
  // Atualizar o estado do aplicativo com base na conectividade
  if (isOnline) {
    document.body.classList.remove('offline-mode');
    triggerSyncIfNeeded();
  } else {
    document.body.classList.add('offline-mode');
  }
  
  return isOnline;
};

// Solicitar sincronização quando online
export const triggerSyncIfNeeded = async () => {
  if (!navigator.onLine) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register('sync-pending-requests');
    }
  } catch (error) {
    console.error('Erro ao registrar sincronização:', error);
  }
};

// Inicializar PWA
export const initPWA = () => {
  // Registrar o service worker
  registerServiceWorker();
  
  // Configurar monitoramento de estado da rede
  window.addEventListener('online', checkNetworkStatus);
  window.addEventListener('offline', checkNetworkStatus);
  
  // Verificar estado inicial da rede
  checkNetworkStatus();
};

// Verificar se o aplicativo está sendo executado no modo instalado (PWA)
export const isRunningAsInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone || 
         document.referrer.includes('android-app://');
};

// Verificar se o aplicativo pode ser instalado
export const canInstallPWA = () => {
  return !!window.deferredPrompt;
};

// Armazenar o evento beforeinstallprompt para uso posterior
export let deferredPrompt: any = null;

// Configurar captura do evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que o Chrome mostre automaticamente o prompt
  e.preventDefault();
  // Armazenar o evento para uso posterior
  deferredPrompt = e;
});

// Solicitar a instalação do PWA
export const promptInstall = async () => {
  if (!deferredPrompt) {
    console.log('O aplicativo não pode ser instalado agora');
    return false;
  }
  
  // Mostrar o prompt de instalação
  deferredPrompt.prompt();
  
  // Aguardar a resposta do usuário
  const choiceResult = await deferredPrompt.userChoice;
  
  // Limpar o prompt armazenado - só pode ser usado uma vez
  deferredPrompt = null;
  
  return choiceResult.outcome === 'accepted';
};

// Limpar o prompt de instalação após a instalação
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('PWA foi instalado com sucesso!');
});
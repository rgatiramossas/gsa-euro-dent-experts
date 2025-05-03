// Script para auxiliar na limpeza do banco de dados IndexedDB do navegador
// Execute este script no console do navegador

function clearIndexedDB() {
  return new Promise((resolve, reject) => {
    const DBDeleteRequest = window.indexedDB.deleteDatabase('EuroDentOfflineDB');
    
    DBDeleteRequest.onerror = (event) => {
      console.error("Erro ao excluir banco de dados IndexedDB:", event);
      reject(new Error("Não foi possível excluir o banco de dados"));
    };
    
    DBDeleteRequest.onsuccess = (event) => {
      console.log("Banco de dados IndexedDB excluído com sucesso!");
      resolve(true);
    };
  });
}

// Função para limpar todo o cache do navegador
async function clearAllOfflineData() {
  try {
    // Limpar IndexedDB
    await clearIndexedDB();
    
    // Limpar localStorage
    localStorage.clear();
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    // Limpar cache do Service Worker
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log("Cache do Service Worker limpo com sucesso");
    }
    
    console.log("Todos os dados offline foram limpos com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao limpar todos os dados offline:", error);
    return false;
  }
}

// Executar limpeza completa
clearAllOfflineData()
  .then(success => {
    if (success) {
      console.log("Limpeza concluída! Recarregue a página para aplicar as alterações.");
      alert("Banco de dados offline foi limpo com sucesso! Por favor, recarregue a página.");
    } else {
      console.log("Falha na limpeza. Verifique os erros no console.");
      alert("Erro ao limpar banco de dados offline. Verifique o console para mais detalhes.");
    }
  });

// Nota: Para uma limpeza mais completa, você pode adicionar:
// 1. await navigator.serviceWorker.getRegistrations().then(registrations => { for(let registration of registrations) { registration.unregister(); } });
// 2. window.location.reload();
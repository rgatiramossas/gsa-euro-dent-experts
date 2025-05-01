import { useEffect } from 'react';

/**
 * Hook para assinar a um evento/loja e receber atualizações
 * @param store O armazenamento/loja que emite eventos
 * @param callback A função de callback a ser chamada quando o evento for acionado
 */
export function useSubscribe<T extends { subscribe: (callback: () => void) => () => void }>(
  store: T,
  callback: () => void
) {
  useEffect(() => {
    // Inscrever-se para atualizações
    const unsubscribe = store.subscribe(callback);
    
    // Limpar a inscrição quando o componente for desmontado
    return () => {
      unsubscribe();
    };
  }, [store, callback]);
}
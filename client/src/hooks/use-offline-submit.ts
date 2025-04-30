import { useState, useEffect, useRef, useCallback } from 'react';
import { checkNetworkStatus } from '@/lib/pwaManager';

/**
 * Hook personalizado aprimorado para lidar com o estado de submissão de formulários,
 * especialmente no modo offline.
 * 
 * Características:
 * - Detecta automaticamente estado online/offline
 * - Timeout de segurança reduzido para 5 segundos
 * - Melhor detecção de eventos para garantir que o estado seja sempre resetado
 * 
 * Exemplo de uso:
 * ```
 * const { isSubmitting, startSubmitting, resetSubmitting } = useOfflineSubmit();
 * 
 * // No início da submissão do formulário
 * const onSubmit = () => {
 *   startSubmitting();
 *   // Enviar dados...
 * }
 * 
 * // No botão de submissão
 * <Button disabled={isSubmitting}>
 *   {isSubmitting ? "Salvando..." : "Salvar"}
 * </Button>
 * ```
 */
export function useOfflineSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Função para iniciar o estado de submissão
  const startSubmitting = useCallback(() => {
    console.log('[useOfflineSubmit] Iniciando estado de submissão');
    setIsSubmitting(true);
    
    // Se estiver offline, já configura um timeout mais curto
    if (!checkNetworkStatus()) {
      console.log('[useOfflineSubmit] Modo offline detectado, configurando timeout automático');
      // Limpar qualquer timeout anterior que possa existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Configurar novo timeout (mais curto em modo offline)
      timeoutRef.current = setTimeout(() => {
        console.log('[useOfflineSubmit] Offline safety timeout: resetting isSubmitting');
        setIsSubmitting(false);
        
        // Notificar a aplicação que a submissão offline foi concluída
        window.dispatchEvent(new CustomEvent('form-save-completed', {
          detail: { source: 'safety-timeout' }
        }));
      }, 5000); // Reduzido para 5 segundos em vez de 10
    }
  }, []);
  
  // Função para resetar manualmente o estado de submissão
  const resetSubmitting = useCallback(() => {
    console.log('[useOfflineSubmit] Resetting submission state manually');
    
    // Limpar qualquer timeout pendente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsSubmitting(false);
  }, []);
  
  // Efeito para adicionar listeners para eventos de salvamento concluído
  useEffect(() => {
    // Função de tratamento de eventos combinada
    const handleFormSaveCompleted = (event: Event) => {
      console.log('[useOfflineSubmit] Form save completion event received', event.type);
      
      // Limpar timeout de segurança ao receber o evento
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsSubmitting(false);
    };
    
    // Adicionar listeners para ambos os tipos de eventos
    window.addEventListener('form-save-completed', handleFormSaveCompleted);
    window.addEventListener('offline-save-completed', handleFormSaveCompleted);
    
    // Limpar listeners na desmontagem do componente
    return () => {
      window.removeEventListener('form-save-completed', handleFormSaveCompleted);
      window.removeEventListener('offline-save-completed', handleFormSaveCompleted);
      
      // Garantir que o timeout seja limpo
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Timeout de segurança geral - reseta isSubmitting após 8 segundos em qualquer situação
  useEffect(() => {
    let generalTimeout: ReturnType<typeof setTimeout>;
    
    if (isSubmitting) {
      generalTimeout = setTimeout(() => {
        console.log('[useOfflineSubmit] General safety timeout: forcing reset of isSubmitting');
        setIsSubmitting(false);
        
        // Disparar evento de forma explícita para garantir que a UI se atualize
        window.dispatchEvent(new CustomEvent('force-reset-submit-state', { 
          detail: { source: 'general-safety-timeout' }
        }));
        
        // SOLUÇÃO CRÍTICA: Forçar atualização da UI com evento DOM padrão
        try {
          // Criar e disparar um evento "submit" cancelado para forçar atualização da UI
          const resetEvent = new Event('reset', { bubbles: true, cancelable: true });
          document.dispatchEvent(resetEvent);
          
          // Criar e disparar um evento "click" para forçar atualização dos handlers
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          document.dispatchEvent(clickEvent);
        } catch (e) {
          console.error('[useOfflineSubmit] Erro ao tentar forçar reset da UI:', e);
        }
      }, 3000); // Reduzido para 3 segundos para resposta mais rápida
    }
    
    return () => {
      if (generalTimeout) clearTimeout(generalTimeout);
    };
  }, [isSubmitting]);
  
  return { isSubmitting, startSubmitting, resetSubmitting };
}

export default useOfflineSubmit;
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para lidar com o estado de submissão de formulários no modo offline
 * 
 * Este hook adiciona um listener para o evento 'form-save-completed' que é disparado
 * quando uma operação offline é concluída (com sucesso ou erro).
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
  
  // Efeito para adicionar listener para o evento de salvamento concluído
  useEffect(() => {
    // Função de tratamento de evento para resetar o estado de submissão
    const handleFormSaveCompleted = () => {
      console.log('Form-save-completed event received, resetting isSubmitting');
      setIsSubmitting(false);
    };
    
    // Adicionar listener ao evento "form-save-completed"
    window.addEventListener('form-save-completed', handleFormSaveCompleted);
    
    // Adicionar também listener ao evento antigo "offline-save-completed" para compatibilidade
    window.addEventListener('offline-save-completed', handleFormSaveCompleted);
    
    // Limpar listeners na desmontagem do componente
    return () => {
      window.removeEventListener('form-save-completed', handleFormSaveCompleted);
      window.removeEventListener('offline-save-completed', handleFormSaveCompleted);
    };
  }, []);
  
  // Função para iniciar o estado de submissão
  const startSubmitting = () => setIsSubmitting(true);
  
  // Função para resetar manualmente o estado de submissão (se necessário)
  const resetSubmitting = () => setIsSubmitting(false);
  
  // Timeout de segurança - reseta isSubmitting após 10 segundos caso nenhum evento ocorra
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (isSubmitting) {
      timeout = setTimeout(() => {
        console.log('Safety timeout: resetting isSubmitting after 10 seconds');
        setIsSubmitting(false);
      }, 10000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isSubmitting]);
  
  return { isSubmitting, startSubmitting, resetSubmitting };
}

export default useOfflineSubmit;
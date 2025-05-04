import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

/**
 * Componente para detectar sessões expiradas ou inválidas
 * Redireciona para a página de login se detectar que a sessão está inválida
 */
export const SessionExpiredHandler: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Se não estiver carregando e não tiver usuário, consideramos a sessão como expirada
    const checkSession = () => {
      if (!isLoading && !user) {
        console.log('Sessão expirada ou inválida, redirecionando para login...');
        
        // Armazenar a página atual para redirecionamento após login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          logout(); // Limpar quaisquer dados de sessão corrompidos
          navigate(`/login?returnTo=${encodeURIComponent(currentPath)}`);
        }
      }
    };

    // Verificar imediatamente
    checkSession();

    // Verificar também em intervalos regulares
    const sessionCheckInterval = setInterval(checkSession, 60000); // Verifica a cada minuto

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(sessionCheckInterval);
  }, [user, isLoading, logout, navigate]);

  // Este componente não renderiza nada visualmente
  return null;
};

export default SessionExpiredHandler;
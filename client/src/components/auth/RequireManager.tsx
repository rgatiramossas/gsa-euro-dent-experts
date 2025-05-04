import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export function RequireManager({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== 'gestor' && user.role !== 'manager') {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (!user || (user.role !== 'gestor' && user.role !== 'manager')) {
    return null;
  }

  return <>{children}</>;
}
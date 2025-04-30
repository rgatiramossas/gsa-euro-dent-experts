import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw } from 'lucide-react';
import { checkNetworkStatus } from '@/lib/pwaManager';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Componente que mostra uma indicação quando o aplicativo está offline
 * e também indica quando está sincronizando dados com o servidor
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  // O cliente pediu para remover as notificações de modo offline completamente
  // Esse componente agora não renderiza nada, mas mantemos ele para não quebrar
  // outras partes da aplicação que o utilizam
  return null;
}

/**
 * Componente que adiciona uma marcação visual para itens criados/modificados offline
 */
export function OfflineItemIndicator({ 
  className,
  createdOffline = false,
  modifiedOffline = false
}: { 
  className?: string,
  createdOffline?: boolean,
  modifiedOffline?: boolean
}) {
  if (!createdOffline && !modifiedOffline) return null;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-xs rounded px-1.5 py-0.5",
        createdOffline 
          ? "bg-orange-100 text-orange-800 border border-orange-300" 
          : "bg-yellow-100 text-yellow-800 border border-yellow-300",
        className
      )}
      title={createdOffline 
        ? "Criado offline, será sincronizado quando conectado" 
        : "Modificado offline, será sincronizado quando conectado"
      }
    >
      <WifiOff className="h-3 w-3" />
      {createdOffline ? "Novo" : "Modificado"}
    </span>
  );
}
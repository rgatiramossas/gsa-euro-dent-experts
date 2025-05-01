import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ServiceStatus } from "@/types";
import { useTranslation } from "react-i18next";

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

export function ServiceStatusBadge({ status, className }: ServiceStatusBadgeProps) {
  const { t, i18n } = useTranslation();
  
  // Função para garantir que recebemos uma string traduzida
  const getTranslatedStatus = (status: ServiceStatus): string => {
    // Mapeamento direto de status para valores de tradução específicos para cada idioma
    // para evitar o problema de "key returned an object instead of string"
    if (i18n.language === 'de') {
      const germanStatusMap: Record<ServiceStatus, string> = {
        "pending": "Ausstehend",
        "in_progress": "In Bearbeitung",
        "completed": "Abgeschlossen",
        "canceled": "Storniert",
        "aguardando_aprovacao": "Genehmigung ausstehend",
        "faturado": "In Rechnung gestellt",
        "pago": "Bezahlt"
      };
      
      const germanTranslation = germanStatusMap[status];
      if (germanTranslation) {
        return germanTranslation;
      }
    }
    
    // Tratamento específico para espanhol
    if (i18n.language === 'es') {
      const spanishStatusMap: Record<ServiceStatus, string> = {
        "pending": "Pendiente",
        "in_progress": "En Progreso",
        "completed": "Completado",
        "canceled": "Cancelado",
        "aguardando_aprovacao": "Esperando Aprobación",
        "faturado": "Facturado",
        "pago": "Pagado"
      };
      
      const spanishTranslation = spanishStatusMap[status];
      if (spanishTranslation) {
        return spanishTranslation;
      }
    }
    
    // Tratamento específico para francês
    if (i18n.language === 'fr') {
      const frenchStatusMap: Record<ServiceStatus, string> = {
        "pending": "En attente",
        "in_progress": "En cours",
        "completed": "Terminé",
        "canceled": "Annulé",
        "aguardando_aprovacao": "En attente d'approbation",
        "faturado": "Facturé",
        "pago": "Payé"
      };
      
      const frenchTranslation = frenchStatusMap[status];
      if (frenchTranslation) {
        return frenchTranslation;
      }
    }
    
    // Tratamento específico para italiano
    if (i18n.language === 'it') {
      const italianStatusMap: Record<ServiceStatus, string> = {
        "pending": "In attesa",
        "in_progress": "In corso",
        "completed": "Completato",
        "canceled": "Annullato",
        "aguardando_aprovacao": "In attesa di approvazione",
        "faturado": "Fatturato",
        "pago": "Pagato"
      };
      
      const italianTranslation = italianStatusMap[status];
      if (italianTranslation) {
        return italianTranslation;
      }
    }
    
    // Tratamento específico para inglês
    if (i18n.language === 'en') {
      const englishStatusMap: Record<ServiceStatus, string> = {
        "pending": "Pending",
        "in_progress": "In Progress",
        "completed": "Completed",
        "canceled": "Canceled",
        "aguardando_aprovacao": "Waiting for Approval",
        "faturado": "Invoiced",
        "pago": "Paid"
      };
      
      const englishTranslation = englishStatusMap[status];
      if (englishTranslation) {
        return englishTranslation;
      }
    }
    
    // Para outros idiomas, usar o mapeamento normal
    const statusKeyMap: Record<ServiceStatus, string> = {
      "pending": "services.status.pending",
      "in_progress": "services.status.in_progress",
      "completed": "services.status.completed",
      "canceled": "services.status.canceled",
      "aguardando_aprovacao": "services.status.aguardando_aprovacao",
      "faturado": "services.status.faturado",
      "pago": "services.status.pago"
    };
    
    // Obter a chave de tradução para o status
    const translationKey = statusKeyMap[status] || status;
    
    // Forçar o retorno de uma string (mesmo que seja a chave de tradução)
    let translatedText = "";
    try {
      // Verificar se temos uma tradução para este status na linguagem atual
      translatedText = t(translationKey, {defaultValue: status});
      
      // Se a tradução retornar um objeto, usamos uma string de fallback
      if (typeof translatedText !== 'string') {
        // Fallback para tradução em inglês ou o status original
        console.warn(`Translation key '${translationKey}' returned an object instead of a string`);
        translatedText = status;
      }
    } catch (error) {
      // Em caso de erro, apenas retornar o status original
      console.warn(`Translation error for status '${status}':`, error);
      translatedText = status;
    }
    
    return translatedText;
  };
  
  const getStatusConfig = (status: ServiceStatus) => {
    const translatedLabel = getTranslatedStatus(status);
    
    switch (status) {
      case "pending":
        return {
          label: translatedLabel,
          variant: "bg-blue-100 text-blue-800",
        };
      case "in_progress":
        return {
          label: translatedLabel,
          variant: "bg-orange-100 text-orange-800",
        };
      case "completed":
        return {
          label: translatedLabel,
          variant: "bg-green-100 text-green-800",
        };
      case "canceled":
        return {
          label: translatedLabel,
          variant: "bg-red-100 text-red-800",
        };
      case "aguardando_aprovacao":
        return {
          label: translatedLabel,
          variant: "bg-yellow-100 text-yellow-800",
        };
      case "faturado":
        return {
          label: translatedLabel,
          variant: "bg-purple-100 text-purple-800",
        };
      case "pago":
        return {
          label: translatedLabel,
          variant: "bg-teal-100 text-teal-800",
        };
      default:
        return {
          label: translatedLabel,
          variant: "bg-gray-100 text-gray-800",
        };
    }
  };

  const { label, variant } = getStatusConfig(status);

  return (
    <Badge className={cn("px-2 py-1 font-medium rounded-full", variant, className)}>
      {label}
    </Badge>
  );
}

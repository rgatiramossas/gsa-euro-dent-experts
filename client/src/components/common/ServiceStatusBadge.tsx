import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ServiceStatus } from "@/types";

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

export function ServiceStatusBadge({ status, className }: ServiceStatusBadgeProps) {
  const getStatusConfig = (status: ServiceStatus) => {
    switch (status) {
      case "pending":
        return {
          label: "Pendente",
          variant: "bg-blue-100 text-blue-800",
        };
      case "completed":
        return {
          label: "Concluída",
          variant: "bg-green-100 text-green-800",
        };
      case "aguardando_aprovacao":
        return {
          label: "Aguardando Aprovação",
          variant: "bg-yellow-100 text-yellow-800",
        };
      case "faturado":
        return {
          label: "Faturado",
          variant: "bg-purple-100 text-purple-800",
        };
      case "pago":
        return {
          label: "Pago",
          variant: "bg-teal-100 text-teal-800",
        };
      default:
        return {
          label: status,
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

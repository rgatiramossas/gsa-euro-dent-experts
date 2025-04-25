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
      case "scheduled":
        return {
          label: "Agendado",
          variant: "bg-blue-100 text-blue-800",
        };
      case "in_progress":
        return {
          label: "Em andamento",
          variant: "bg-yellow-100 text-yellow-800",
        };
      case "completed":
        return {
          label: "Concluído",
          variant: "bg-green-100 text-green-800",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          variant: "bg-red-100 text-red-800",
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

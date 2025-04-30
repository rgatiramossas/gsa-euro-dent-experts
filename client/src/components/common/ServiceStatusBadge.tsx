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
  const { t } = useTranslation();
  
  const getStatusConfig = (status: ServiceStatus) => {
    switch (status) {
      case "pending":
        return {
          label: t("services.status.pending"),
          variant: "bg-blue-100 text-blue-800",
        };
      case "in_progress":
        return {
          label: t("services.status.in_progress"),
          variant: "bg-orange-100 text-orange-800",
        };
      case "completed":
        return {
          label: t("services.status.completed"),
          variant: "bg-green-100 text-green-800",
        };
      case "canceled":
        return {
          label: t("services.status.canceled"),
          variant: "bg-red-100 text-red-800",
        };
      case "aguardando_aprovacao":
        return {
          label: t("services.status.aguardando_aprovacao"),
          variant: "bg-yellow-100 text-yellow-800",
        };
      case "faturado":
        return {
          label: t("services.status.faturado"),
          variant: "bg-purple-100 text-purple-800",
        };
      case "pago":
        return {
          label: t("services.status.pago"),
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

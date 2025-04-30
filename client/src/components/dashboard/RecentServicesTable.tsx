import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceListItem } from "@/types";
import { useTranslation } from "react-i18next";

interface RecentServicesTableProps {
  services: ServiceListItem[];
  isLoading?: boolean;
}

export function RecentServicesTable({ services, isLoading = false }: RecentServicesTableProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{t("dashboard.recentServices")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("services.client")}</TableHead>
                <TableHead>{t("services.vehicle")}</TableHead>
                <TableHead>{t("services.technician")}</TableHead>
                <TableHead>{t("services.status")}</TableHead>
                <TableHead>{t("services.scheduledDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 w-24 bg-gray-200 rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-32 bg-gray-200 rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-20 bg-gray-200 rounded"></div></TableCell>
                  <TableCell><div className="h-6 w-20 bg-gray-200 rounded-full"></div></TableCell>
                  <TableCell><div className="h-4 w-16 bg-gray-200 rounded"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-medium">{t("dashboard.recentServices")}</CardTitle>
        <Link href="/services" className="text-sm font-medium text-primary hover:text-primary/80">
          {t("common.viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>{t("services.client")}</TableHead>
              <TableHead>{t("services.vehicle")}</TableHead>
              <TableHead>{t("services.technician")}</TableHead>
              <TableHead>{t("services.status")}</TableHead>
              <TableHead>{t("services.scheduledDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  {t("common.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link href={`/services/${service.id}`} className="hover:text-primary">
                      {service.client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {service.vehicle.make} {service.vehicle.model} {service.vehicle.year}
                    {service.vehicle.license_plate && ` - ${service.vehicle.license_plate}`}
                  </TableCell>
                  <TableCell>
                    {service.technician?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <ServiceStatusBadge status={service.status} />
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(service.scheduled_date || service.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return "0,00 €";
  
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol"
  }).format(value);
}

export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  
  if (isToday(date)) {
    return `Hoje, ${format(date, "HH:mm", { locale: ptBR })}`;
  }
  
  if (isYesterday(date)) {
    return `Ontem, ${format(date, "HH:mm", { locale: ptBR })}`;
  }
  
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

// Função separada para exibir sempre a data completa (sem "Hoje" ou "Ontem")
export function formatCompleteDateOnly(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelativeDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  });
}

export function formatVehicleDisplay(vehicle: { make: string; model: string; year: number; color?: string; license_plate?: string; }): string {
  let display = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  
  if (vehicle.color) {
    display += ` - ${vehicle.color}`;
  }
  
  if (vehicle.license_plate) {
    display += ` - ${vehicle.license_plate}`;
  }
  
  return display;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

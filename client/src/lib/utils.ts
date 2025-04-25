import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return "R$ 0,00";
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return `Hoje, ${format(date, "HH:mm", { locale: ptBR })}`;
  }
  
  if (isYesterday(date)) {
    return `Ontem, ${format(date, "HH:mm", { locale: ptBR })}`;
  }
  
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelativeDate(dateString: string | undefined): string {
  if (!dateString) return "";
  
  return formatDistanceToNow(new Date(dateString), {
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

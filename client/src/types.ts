// Tipos para serviços
export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'canceled' | 'aguardando_aprovacao' | 'aguardando_pagamento' | 'faturado' | 'pago';

export interface ServiceListItem {
  id: number;
  client_id: number;
  vehicle_id: number;
  service_type_id: number;
  technician_id?: number;
  status: ServiceStatus;
  description?: string;
  scheduled_date?: string | Date;
  created_at?: string | Date;
  price: number;
  administrative_fee: number;
  total: number;
  location_type?: 'client_location' | 'workshop';
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  photos_count?: number;
  
  // Relacionamentos (eager loaded)
  client: {
    id: number;
    name: string;
    phone?: string;
  };
  vehicle: {
    id: number;
    make: string;
    model: string;
    license_plate?: string;
  };
  service_type: {
    id: number;
    name: string;
    default_price: number;
  };
  technician?: {
    id: number;
    name: string;
    role: string;
  };
  
  // Propriedades do modo offline
  _isOffline?: boolean;
  _pendingSync?: boolean;
  _localId?: string;
  _syncError?: string;
  _syncAttempts?: number;
}

// Tipos para clientes
export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string | Date;
  deleted?: number; // Campo para indicar se o cliente está excluído (1 = excluído, 0 ou null = ativo)
}

// Tipos para veículos
export interface Vehicle {
  id: number;
  client_id: number;
  make: string;
  model: string;
  year?: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  notes?: string;
  
  // Relacionamentos
  client?: Client;
}

// Tipos para tipos de serviço
export interface ServiceType {
  id: number;
  name: string;
  description?: string;
  default_price: number;
}

// Tipos para usuários/técnicos
export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'technician' | 'manager';
  active?: boolean;
  profile_image?: string;
  created_at?: string;
}

// Tipos para estatísticas do dashboard
export interface DashboardStats {
  totalPendingServices: number;
  totalInProgressServices: number;
  totalCompletedServices: number;
  totalRevenue: number;
}

// Tipos para performance dos técnicos
export interface TechnicianPerformance {
  id: number;
  name: string;
  servicesCompleted: number;
  averageRating?: number;
  totalRevenue: number;
}
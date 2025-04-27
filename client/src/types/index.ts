// User types
export type UserRole = 'admin' | 'technician' | 'gestor' | 'manager';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  active: boolean;
  created_at?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  profile_image?: string;
}

// Client types
export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  created_at?: string;
}

// Vehicle types
export interface Vehicle {
  id: number;
  client_id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  notes?: string;
  created_at?: string;
}

// Service types
export interface ServiceType {
  id: number;
  name: string;
  description?: string;
  base_price?: number;
}

export type ServiceStatus = 'pending' | 'completed' | 'aguardando_aprovacao' | 'faturado' | 'pago';
export type LocationType = 'client_location' | 'workshop';

export interface Service {
  id: number;
  client_id: number;
  vehicle_id: number;
  service_type_id: number;
  technician_id?: number;
  status: ServiceStatus;
  description?: string;
  scheduled_date?: string;
  start_date?: string;
  completion_date?: string;
  location_type: LocationType;
  address?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  /* Taxa de deslocamento removida */
  administrative_fee?: number;
  total?: number;
  notes?: string;
  created_at?: string;
}

export interface ServicePhoto {
  id: number;
  service_id: number;
  photo_type: 'before' | 'after' | 'service';
  photo_url: string;
  created_at?: string;
}

// Extended interfaces with related entities
export interface ServiceWithDetails extends Service {
  client?: Client;
  vehicle?: Vehicle;
  serviceType?: ServiceType;
  technician?: User;
  photos?: {
    before: ServicePhoto[];
    after: ServicePhoto[];
    service: ServicePhoto[];
  };
}

export interface VehicleWithClient extends Vehicle {
  client: Client;
}

export interface ServiceListItem {
  id: number;
  status: ServiceStatus;
  client: { id: number; name: string };
  vehicle: { id: number; make: string; model: string; year: number; license_plate?: string };
  serviceType: { id: number; name: string };
  technician?: { id: number; name: string };
  scheduled_date?: string;
  completion_date?: string;
  price?: number;
  administrative_fee?: number;
  total?: number;
  created_at?: string;
}

// Dashboard types
export interface DashboardStats {
  totalPendingServices: number;   // Total de OS pendentes
  totalInProgressServices: number; // Total de OS em andamento
  totalCompletedServices: number;  // Total de OS concluídas (todas)
  totalRevenue: number;           // Faturamento total (todas as OS concluídas em €)
}

export interface TechnicianPerformance {
  id: number;
  name: string;
  completionRate: number;
  servicesCount: number;
  completedCount: number;
}

import { users, clients, vehicles, serviceTypes, services, servicePhotos } from "@shared/schema";
import type { 
  User, InsertUser, 
  Client, InsertClient, 
  Vehicle, InsertVehicle, 
  ServiceType, InsertServiceType, 
  Service, InsertService, 
  ServicePhoto, InsertServicePhoto 
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  listUsers(role?: string): Promise<User[]>;

  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  searchClients(query: string): Promise<Client[]>;

  // Vehicle methods
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  listVehiclesByClient(clientId: number): Promise<Vehicle[]>;

  // Service Type methods
  getServiceType(id: number): Promise<ServiceType | undefined>;
  createServiceType(serviceType: InsertServiceType): Promise<ServiceType>;
  listServiceTypes(): Promise<ServiceType[]>;

  // Service methods
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined>;
  listServices(filters?: Partial<{ status: string, technicianId: number, clientId: number }>): Promise<Service[]>;
  getServiceDetails(id: number): Promise<any>; // Returns service with related entities

  // Service Photos methods
  addServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto>;
  getServicePhotos(serviceId: number, type?: string): Promise<ServicePhoto[]>;

  // Dashboard data
  getDashboardStats(): Promise<any>;
  getTechnicianPerformance(): Promise<any>;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private clientsData: Map<number, Client>;
  private vehiclesData: Map<number, Vehicle>;
  private serviceTypesData: Map<number, ServiceType>;
  private servicesData: Map<number, Service>;
  private servicePhotosData: Map<number, ServicePhoto>;
  
  private userCurrentId: number;
  private clientCurrentId: number;
  private vehicleCurrentId: number;
  private serviceTypeCurrentId: number;
  private serviceCurrentId: number;
  private servicePhotoCurrentId: number;

  constructor() {
    this.usersData = new Map();
    this.clientsData = new Map();
    this.vehiclesData = new Map();
    this.serviceTypesData = new Map();
    this.servicesData = new Map();
    this.servicePhotosData = new Map();
    
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.vehicleCurrentId = 1;
    this.serviceTypeCurrentId = 1;
    this.serviceCurrentId = 1;
    this.servicePhotoCurrentId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Create admin user
    this.createUser({
      username: "admin",
      password: "$2b$12$rWwTdl5Tc9g9XH4.GyZAWehOM3gJWtfzQDzGq.LEeUz3B3G9JHP7S", // "password123"
      name: "Admin User",
      email: "admin@eurodent.com",
      role: "admin",
      active: true
    });

    // Create technician users
    this.createUser({
      username: "joao",
      password: "$2b$12$rWwTdl5Tc9g9XH4.GyZAWehOM3gJWtfzQDzGq.LEeUz3B3G9JHP7S",
      name: "João Pereira",
      email: "joao@eurodent.com",
      phone: "(11) 97654-3210",
      role: "technician",
      active: true
    });

    this.createUser({
      username: "pedro",
      password: "$2b$12$rWwTdl5Tc9g9XH4.GyZAWehOM3gJWtfzQDzGq.LEeUz3B3G9JHP7S",
      name: "Pedro Santos",
      email: "pedro@eurodent.com",
      phone: "(11) 97654-3210",
      role: "technician",
      active: true
    });

    // Create service types
    this.createServiceType({
      name: "Martelinho de Ouro - Pequeno",
      description: "Reparo de amassados pequenos sem pintura",
      base_price: 150
    });

    this.createServiceType({
      name: "Martelinho de Ouro - Médio",
      description: "Reparo de amassados médios sem pintura",
      base_price: 250
    });

    this.createServiceType({
      name: "Martelinho de Ouro - Grande",
      description: "Reparo de amassados grandes sem pintura",
      base_price: 350
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      created_at: now
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  async listUsers(role?: string): Promise<User[]> {
    const users = Array.from(this.usersData.values());
    if (role) {
      return users.filter(user => user.role === role);
    }
    return users;
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clientsData.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientCurrentId++;
    const now = new Date();
    const client: Client = { 
      ...insertClient, 
      id,
      created_at: now
    };
    this.clientsData.set(id, client);
    return client;
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const client = this.clientsData.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...clientData };
    this.clientsData.set(id, updatedClient);
    return updatedClient;
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clientsData.values());
  }

  async searchClients(query: string): Promise<Client[]> {
    const clients = Array.from(this.clientsData.values());
    if (!query) return clients;
    
    const lowerQuery = query.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(lowerQuery) ||
      client.email.toLowerCase().includes(lowerQuery) ||
      (client.phone && client.phone.includes(query))
    );
  }

  // Vehicle methods
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehiclesData.get(id);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.vehicleCurrentId++;
    const now = new Date();
    const vehicle: Vehicle = { 
      ...insertVehicle, 
      id,
      created_at: now
    };
    this.vehiclesData.set(id, vehicle);
    return vehicle;
  }

  async listVehiclesByClient(clientId: number): Promise<Vehicle[]> {
    const vehicles = Array.from(this.vehiclesData.values());
    return vehicles.filter(vehicle => vehicle.client_id === clientId);
  }

  // Service Type methods
  async getServiceType(id: number): Promise<ServiceType | undefined> {
    return this.serviceTypesData.get(id);
  }

  async createServiceType(insertServiceType: InsertServiceType): Promise<ServiceType> {
    const id = this.serviceTypeCurrentId++;
    const serviceType: ServiceType = { 
      ...insertServiceType, 
      id
    };
    this.serviceTypesData.set(id, serviceType);
    return serviceType;
  }

  async listServiceTypes(): Promise<ServiceType[]> {
    return Array.from(this.serviceTypesData.values());
  }

  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    return this.servicesData.get(id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.serviceCurrentId++;
    const now = new Date();
    const service: Service = { 
      ...insertService, 
      id,
      created_at: now
    };
    this.servicesData.set(id, service);
    return service;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const service = this.servicesData.get(id);
    if (!service) return undefined;

    const updatedService = { ...service, ...serviceData };
    this.servicesData.set(id, updatedService);
    return updatedService;
  }

  async listServices(filters?: Partial<{ status: string, technicianId: number, clientId: number }>): Promise<Service[]> {
    let services = Array.from(this.servicesData.values());
    
    if (filters) {
      if (filters.status) {
        services = services.filter(service => service.status === filters.status);
      }
      if (filters.technicianId) {
        services = services.filter(service => service.technician_id === filters.technicianId);
      }
      if (filters.clientId) {
        services = services.filter(service => service.client_id === filters.clientId);
      }
    }
    
    return services;
  }

  async getServiceDetails(id: number): Promise<any> {
    const service = this.servicesData.get(id);
    if (!service) return null;

    const client = this.clientsData.get(service.client_id);
    const vehicle = this.vehiclesData.get(service.vehicle_id);
    const serviceType = this.serviceTypesData.get(service.service_type_id);
    const technician = service.technician_id ? this.usersData.get(service.technician_id) : null;
    
    const photos = Array.from(this.servicePhotosData.values())
      .filter(photo => photo.service_id === id);
    
    const beforePhotos = photos.filter(photo => photo.photo_type === 'before');
    const afterPhotos = photos.filter(photo => photo.photo_type === 'after');

    return {
      ...service,
      client,
      vehicle,
      serviceType,
      technician,
      photos: {
        before: beforePhotos,
        after: afterPhotos
      }
    };
  }

  // Service Photos methods
  async addServicePhoto(insertPhoto: InsertServicePhoto): Promise<ServicePhoto> {
    const id = this.servicePhotoCurrentId++;
    const now = new Date();
    const photo: ServicePhoto = { 
      ...insertPhoto, 
      id,
      created_at: now
    };
    this.servicePhotosData.set(id, photo);
    return photo;
  }

  async getServicePhotos(serviceId: number, type?: string): Promise<ServicePhoto[]> {
    const photos = Array.from(this.servicePhotosData.values())
      .filter(photo => photo.service_id === serviceId);
    
    if (type) {
      return photos.filter(photo => photo.photo_type === type);
    }
    
    return photos;
  }

  // Dashboard data
  async getDashboardStats(): Promise<any> {
    const services = Array.from(this.servicesData.values());
    
    const pending = services.filter(service => service.status === 'pending').length;
    const inProgress = services.filter(service => service.status === 'in_progress').length;
    
    // Completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = services.filter(service => 
      service.status === 'completed' && 
      service.completion_date && 
      new Date(service.completion_date) >= today
    ).length;
    
    // Monthly revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = services
      .filter(service => 
        service.status === 'completed' && 
        service.completion_date && 
        new Date(service.completion_date) >= firstDayOfMonth
      )
      .reduce((sum, service) => sum + (service.total || 0), 0);
    
    return {
      pendingServices: pending,
      inProgressServices: inProgress,
      completedToday,
      monthlyRevenue
    };
  }

  async getTechnicianPerformance(): Promise<any> {
    const technicians = Array.from(this.usersData.values())
      .filter(user => user.role === 'technician');
    
    const services = Array.from(this.servicesData.values());
    
    const performance = technicians.map(technician => {
      const technicianServices = services.filter(
        service => service.technician_id === technician.id
      );
      
      const completed = technicianServices.filter(
        service => service.status === 'completed'
      ).length;
      
      const total = technicianServices.length || 1; // Avoid division by zero
      
      const completionRate = Math.round((completed / total) * 100);
      
      return {
        id: technician.id,
        name: technician.name,
        completionRate,
        servicesCount: total,
        completedCount: completed
      };
    });
    
    return performance.sort((a, b) => b.completionRate - a.completionRate);
  }
}

export const storage = new MemStorage();

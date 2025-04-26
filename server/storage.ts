import { users, clients, vehicles, serviceTypes, services, servicePhotos, eventTypes, events } from "@shared/schema";
import type { 
  User, InsertUser, 
  Client, InsertClient, 
  Vehicle, InsertVehicle, 
  ServiceType, InsertServiceType, 
  Service, InsertService, 
  ServicePhoto, InsertServicePhoto,
  EventType, InsertEventType,
  Event, InsertEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

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
  
  // Event Type methods
  getEventType(id: number): Promise<EventType | undefined>;
  createEventType(eventType: InsertEventType): Promise<EventType>;
  listEventTypes(): Promise<EventType[]>;
  
  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  listEvents(filters?: Partial<{ technician_id: number, date: string }>): Promise<Event[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session' 
    });
    this.initializeSampleData();
  }
  
  private async initializeSampleData(): Promise<void> {
    // Check if we already have users
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      console.log("Initializing sample data...");
      
      // Create admin user
      const adminPassword = await bcrypt.hash("password123", 12);
      await this.createUser({
        username: "admin",
        password: adminPassword,
        name: "Admin User",
        email: "admin@eurodent.com",
        role: "admin",
        active: true
      });
      
      // Create technician users
      await this.createUser({
        username: "joao",
        password: adminPassword,
        name: "João Pereira",
        email: "joao@eurodent.com",
        phone: "(11) 97654-3210",
        role: "technician",
        active: true
      });
      
      await this.createUser({
        username: "pedro",
        password: adminPassword,
        name: "Pedro Santos",
        email: "pedro@eurodent.com",
        phone: "(11) 97654-3210",
        role: "technician",
        active: true
      });
      
      // Create service types
      await this.createServiceType({
        name: "Martelinho de Ouro - Pequeno",
        description: "Reparo de amassados pequenos sem pintura",
        base_price: 150
      });
      
      await this.createServiceType({
        name: "Martelinho de Ouro - Médio",
        description: "Reparo de amassados médios sem pintura",
        base_price: 250
      });
      
      await this.createServiceType({
        name: "Martelinho de Ouro - Grande",
        description: "Reparo de amassados grandes sem pintura",
        base_price: 350
      });
      
      // Criar tipos de eventos iniciais
      await this.createEventType({
        name: "Reunião",
        color: "#4f46e5" // Azul
      });
      
      await this.createEventType({
        name: "Visita Técnica",
        color: "#16a34a" // Verde
      });
      
      await this.createEventType({
        name: "Avaliação",
        color: "#ea580c" // Laranja
      });
      
      await this.createEventType({
        name: "Serviço",
        color: "#dc2626" // Vermelho
      });
      
      console.log("Sample data initialized successfully!");
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return db.select().from(users).where(eq(users.role, role));
    }
    return db.select().from(users);
  }
  
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }
  
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await db.update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }
  
  async listClients(): Promise<Client[]> {
    return db.select().from(clients);
  }
  
  async searchClients(query: string): Promise<Client[]> {
    return db.select().from(clients).where(
      like(clients.name, `%${query}%`)
    );
  }
  
  // Vehicle methods
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }
  
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }
  
  async listVehiclesByClient(clientId: number): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.client_id, clientId));
  }
  
  // Service Type methods
  async getServiceType(id: number): Promise<ServiceType | undefined> {
    const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
    return serviceType;
  }
  
  async createServiceType(insertServiceType: InsertServiceType): Promise<ServiceType> {
    const [serviceType] = await db.insert(serviceTypes).values(insertServiceType).returning();
    return serviceType;
  }
  
  async listServiceTypes(): Promise<ServiceType[]> {
    return db.select().from(serviceTypes);
  }
  
  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
  
  async createService(insertService: InsertService): Promise<Service> {
    // Clone o objeto para não modificar o original
    const serviceData = { ...insertService };
    
    // Converter campos de data de string para Date para o PostgreSQL
    if (serviceData.scheduled_date && typeof serviceData.scheduled_date === 'string') {
      serviceData.scheduled_date = new Date(serviceData.scheduled_date);
    }
    
    if (serviceData.start_date && typeof serviceData.start_date === 'string') {
      serviceData.start_date = new Date(serviceData.start_date);
    }
    
    if (serviceData.completion_date && typeof serviceData.completion_date === 'string') {
      serviceData.completion_date = new Date(serviceData.completion_date);
    }
    
    console.log("Dados formatados para DB:", serviceData);
    
    const [service] = await db.insert(services).values(serviceData).returning();
    return service;
  }
  
  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    // Clone o objeto para não modificar o original
    const updatedData = { ...serviceData };
    
    // Converter campos de data de string para Date para o PostgreSQL
    if (updatedData.scheduled_date && typeof updatedData.scheduled_date === 'string') {
      updatedData.scheduled_date = new Date(updatedData.scheduled_date);
    }
    
    if (updatedData.start_date && typeof updatedData.start_date === 'string') {
      updatedData.start_date = new Date(updatedData.start_date);
    }
    
    if (updatedData.completion_date && typeof updatedData.completion_date === 'string') {
      updatedData.completion_date = new Date(updatedData.completion_date);
    }
    
    const [updatedService] = await db.update(services)
      .set(updatedData)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }
  
  async listServices(filters?: Partial<{ status: string, technicianId: number, clientId: number }>): Promise<Service[]> {
    let query = db.select().from(services)
      // Sempre filtra os serviços com status "deleted"
      .where(sql`${services.status} != 'deleted'`);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(services.status, filters.status));
      }
      
      if (filters.technicianId) {
        query = query.where(eq(services.technician_id, filters.technicianId));
      }
      
      if (filters.clientId) {
        query = query.where(eq(services.client_id, filters.clientId));
      }
    }
    
    return query.orderBy(desc(services.created_at));
  }
  
  async getServiceDetails(id: number): Promise<any> {
    const service = await this.getService(id);
    
    if (!service) {
      return null;
    }
    
    const client = await this.getClient(service.client_id);
    const vehicle = await this.getVehicle(service.vehicle_id);
    const serviceType = await this.getServiceType(service.service_type_id);
    let technician = null;
    
    if (service.technician_id) {
      technician = await this.getUser(service.technician_id);
    }
    
    const photos = await this.getServicePhotos(id);
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
    const [photo] = await db.insert(servicePhotos).values(insertPhoto).returning();
    return photo;
  }
  
  async getServicePhotos(serviceId: number, type?: string): Promise<ServicePhoto[]> {
    if (type) {
      return db.select()
        .from(servicePhotos)
        .where(
          and(
            eq(servicePhotos.service_id, serviceId),
            eq(servicePhotos.photo_type, type)
          )
        );
    }
    
    return db.select()
      .from(servicePhotos)
      .where(eq(servicePhotos.service_id, serviceId));
  }
  
  // Dashboard data
  async getDashboardStats(): Promise<any> {
    // Count pending services
    const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.status, 'pending'),
          sql`${services.status} != 'deleted'`
        )
      );
    
    // Count in-progress services
    const [inProgressResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.status, 'in_progress'),
          sql`${services.status} != 'deleted'`
        )
      );
    
    // Count services completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [completedTodayResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.status, 'completed'),
          sql`DATE(${services.completion_date}) = CURRENT_DATE`,
          sql`${services.status} != 'deleted'`
        )
      );
    
    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [revenueResult] = await db.select({ 
      sum: sql<number>`COALESCE(SUM(${services.total}), 0)` 
    })
    .from(services)
    .where(
      and(
        eq(services.status, 'completed'),
        sql`${services.completion_date} >= ${thirtyDaysAgo}`,
        sql`${services.status} != 'deleted'`
      )
    );
    
    return {
      pendingServices: pendingResult.count,
      inProgressServices: inProgressResult.count,
      completedToday: completedTodayResult.count,
      monthlyRevenue: revenueResult.sum
    };
  }
  
  async getTechnicianPerformance(): Promise<any> {
    const technicians = await this.listUsers('technician');
    
    const results = await Promise.all(
      technicians.map(async (tech) => {
        // All services assigned to this technician (excluding deleted)
        const allServices = await db.select().from(services)
          .where(
            and(
              eq(services.technician_id, tech.id),
              sql`${services.status} != 'deleted'`
            )
          );
        
        // Completed services by this technician
        const completedServices = allServices.filter(
          service => service.status === 'completed'
        );
        
        const servicesCount = allServices.length;
        const completedCount = completedServices.length;
        const completionRate = servicesCount > 0 
          ? Math.round((completedCount / servicesCount) * 100) 
          : 0;
        
        return {
          id: tech.id,
          name: tech.name,
          servicesCount,
          completedCount,
          completionRate
        };
      })
    );
    
    return results;
  }

  // Event Type methods
  async getEventType(id: number): Promise<EventType | undefined> {
    const [eventType] = await db.select().from(eventTypes).where(eq(eventTypes.id, id));
    return eventType;
  }
  
  async createEventType(insertEventType: InsertEventType): Promise<EventType> {
    const [eventType] = await db.insert(eventTypes).values(insertEventType).returning();
    return eventType;
  }
  
  async listEventTypes(): Promise<EventType[]> {
    return db.select().from(eventTypes);
  }
  
  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }
  
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }
  
  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db.update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }
  
  async listEvents(filters?: Partial<{ technician_id: number, date: string }>): Promise<Event[]> {
    // Consulta base para eventos com join para tipo de evento e técnico
    let query = db.select({
      ...events,
      event_type: {
        name: eventTypes.name,
        color: eventTypes.color
      },
      technician: {
        name: users.name
      }
    })
    .from(events)
    .leftJoin(eventTypes, eq(events.event_type_id, eventTypes.id))
    .leftJoin(users, eq(events.technician_id, users.id));
    
    // Aplicar filtros se existirem
    if (filters) {
      if (filters.technician_id) {
        query = query.where(eq(events.technician_id, filters.technician_id));
      }
      
      if (filters.date) {
        query = query.where(eq(events.date, filters.date));
      }
    }
    
    return query.orderBy(events.date, events.time);
  }
}

export const storage = new DatabaseStorage();
import { users, clients, vehicles, serviceTypes, services, servicePhotos, eventTypes, events, paymentRequests, paymentRequestItems, expenses } from "@shared/schema";
import type { 
  User, InsertUser, 
  Client, InsertClient, 
  Vehicle, InsertVehicle, 
  ServiceType, InsertServiceType, 
  Service, InsertService, 
  ServicePhoto, InsertServicePhoto,
  EventType, InsertEventType,
  Event, InsertEvent,
  PaymentRequest, PaymentRequestItem,
  Expense, InsertExpense
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, or, sql } from "drizzle-orm";
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
  
  // Payment Request methods
  createPaymentRequest(technicianId: number, serviceIds: number[]): Promise<PaymentRequest>;
  getPaymentRequest(id: number): Promise<any>;
  listPaymentRequests(technicianId?: number): Promise<any[]>;
  updatePaymentRequestStatus(id: number, status: string): Promise<PaymentRequest | undefined>;
  
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
    // Verificar se o serviço existe
    const service = await this.getService(id);
    if (!service) {
      return undefined;
    }
    
    // Verificar se há dados para atualizar
    if (!serviceData || Object.keys(serviceData).length === 0) {
      console.log(`Nenhum dado fornecido para atualizar o serviço ID: ${id}. Retornando serviço atual.`);
      return service;
    }
    
    // Verificar se o serviço está em um estado que não permite alterações (aguardando_aprovacao, faturado, pago)
    if (['aguardando_aprovacao', 'faturado', 'pago'].includes(service.status)) {
      // Permitir apenas atualizações de status pelo fluxo automático
      if (serviceData.status && serviceData.status !== service.status) {
        // Se for uma atualização de status, permitir apenas o que segue o fluxo:
        // aguardando_aprovacao -> faturado -> pago
        const statusFlow = {
          'aguardando_aprovacao': ['faturado'],
          'faturado': ['pago']
        };
        
        // @ts-ignore - Estamos verificando se o status existe acima
        if (!statusFlow[service.status]?.includes(serviceData.status)) {
          console.log(`Transição de status inválida para serviço em pedido de pagamento: ${service.status} -> ${serviceData.status}`);
          throw new Error(`Este serviço está em um pedido de pagamento e não pode mudar para o status ${serviceData.status}`);
        }
        
        // Se chegar aqui, é uma transição de status válida
        // Permitir apenas a atualização do status, removendo todas as outras propriedades
        serviceData = { status: serviceData.status };
      } else if (Object.keys(serviceData).length > 0 && !serviceData.status) {
        // Se não for atualização de status, não permitir nenhuma alteração
        console.log(`Tentativa de atualizar serviço com ID ${id} que está em um pedido de pagamento (${service.status})`);
        throw new Error(`Este serviço está em um pedido de pagamento e não pode ser alterado`);
      }
    }
    
    console.log(`Atualizando serviço ID ${id} com dados:`, serviceData);
    
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
    
    // Garantir que os campos numéricos sejam do tipo number
    if (updatedData.price !== undefined) {
      const price = Number(updatedData.price);
      console.log(`Convertendo preço de ${updatedData.price} (${typeof updatedData.price}) para ${price} (number)`);
      updatedData.price = price;
    }
    
    if (updatedData.displacement_fee !== undefined) {
      const fee = Number(updatedData.displacement_fee);
      console.log(`Convertendo taxa de deslocamento de ${updatedData.displacement_fee} (${typeof updatedData.displacement_fee}) para ${fee} (number)`);
      updatedData.displacement_fee = fee;
    }
    
    if (updatedData.total !== undefined) {
      updatedData.total = Number(updatedData.total);
    }
    
    try {
      const [updatedService] = await db.update(services)
        .set(updatedData)
        .where(eq(services.id, id))
        .returning();
      return updatedService;
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      throw error;
    }
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
  async getDashboardStats(technicianId?: number): Promise<any> {
    // Condições base para todos os filtros (excluir serviços deletados)
    const baseConditions = [sql`${services.status} != 'deleted'`];
    
    // O administrador deve ver TODOS os serviços, enquanto os técnicos veem apenas os seus próprios
    if (technicianId) {
      console.log('Aplicando filtro de técnico ID:', technicianId);
      baseConditions.push(eq(services.technician_id, technicianId));
    } else {
      // Se não tem technicianId, significa que é um administrador vendo todos os dados
      console.log('Administrador visualizando estatísticas de todos os técnicos');
    }
    
    // 1. Total de OS pendentes
    const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.status, 'pending'),
          ...baseConditions
        )
      );
    
    // 2. Total de OS em andamento
    const [inProgressResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.status, 'in_progress'),
          ...baseConditions
        )
      );
    
    // 3. Total de OS concluídas (todas, em qualquer período)
    const [completedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          or(
            eq(services.status, 'completed'),
            eq(services.status, 'aguardando_aprovacao'),
            eq(services.status, 'faturado'),
            eq(services.status, 'pago')
          ),
          ...baseConditions
        )
      );
    
    // 4. Faturamento total (todas as OS concluídas, em qualquer período)
    // Admin vê valor total, técnico vê apenas seu valor
    console.log('Calculando faturamento para:', technicianId ? `Técnico ID ${technicianId}` : 'Admin');
    const valueField = technicianId ? services.price : services.total;
    
    const [revenueResult] = await db.select({ 
      sum: sql<number>`COALESCE(SUM(${valueField}), 0)` 
    })
    .from(services)
    .where(
      and(
        or(
          eq(services.status, 'completed'),
          eq(services.status, 'aguardando_aprovacao'),
          eq(services.status, 'faturado'),
          eq(services.status, 'pago')
        ),
        ...baseConditions
      )
    );
    
    // Converter para o formato esperado pelo frontend
    const totalPendingServices = typeof pendingResult.count === 'string' 
      ? parseInt(pendingResult.count) 
      : (pendingResult.count || 0);
    
    const totalInProgressServices = typeof inProgressResult.count === 'string' 
      ? parseInt(inProgressResult.count) 
      : (inProgressResult.count || 0);
    
    const totalCompletedServices = typeof completedResult.count === 'string' 
      ? parseInt(completedResult.count) 
      : (completedResult.count || 0);
    
    const totalRevenue = revenueResult.sum || 0;
    
    const stats = {
      totalPendingServices,
      totalInProgressServices,
      totalCompletedServices,
      totalRevenue
    };
    
    console.log('Stats formatados para envio:', stats);
    return stats;
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
  
  // Payment Request methods
  async createPaymentRequest(technicianId: number | null, serviceIds: number[]): Promise<PaymentRequest> {
    // Use a transaction to ensure all operations succeed or fail together
    const tx = await db.transaction(async (tx) => {
      // First create the payment request
      const [paymentRequest] = await tx
        .insert(paymentRequests)
        .values({ 
          technician_id: technicianId,
          status: "aguardando_aprovacao" 
        })
        .returning();
      
      // Then add all the service items
      if (serviceIds.length > 0) {
        await tx
          .insert(paymentRequestItems)
          .values(
            serviceIds.map(serviceId => ({
              payment_request_id: paymentRequest.id,
              service_id: serviceId,
            }))
          );
        
        // Update all the services to "aguardando_aprovacao" status
        for (const serviceId of serviceIds) {
          await tx
            .update(services)
            .set({ status: "aguardando_aprovacao" })
            .where(eq(services.id, serviceId));
        }
      }
      
      return paymentRequest;
    });
    
    return tx;
  }
  
  async getPaymentRequest(id: number): Promise<any> {
    const paymentRequest = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id))
      .limit(1);
    
    if (!paymentRequest.length) {
      return undefined;
    }
    
    // Buscar os IDs dos serviços associados a este pedido
    const itemsData = await db
      .select({
        id: paymentRequestItems.id,
        service_id: paymentRequestItems.service_id,
      })
      .from(paymentRequestItems)
      .where(eq(paymentRequestItems.payment_request_id, id));
    
    // Buscar detalhes completos de cada serviço
    const serviceIds = itemsData.map(item => item.service_id);
    const servicesDetails = [];
    
    for (const serviceId of serviceIds) {
      const service = await this.getService(serviceId);
      if (service) {
        const client = await this.getClient(service.client_id);
        const serviceType = await this.getServiceType(service.service_type_id);
        
        servicesDetails.push({
          ...service,
          client: {
            id: client?.id,
            name: client?.name
          },
          serviceType: {
            id: serviceType?.id,
            name: serviceType?.name
          }
        });
      }
    }
    
    const technician = await db
      .select()
      .from(users)
      .where(eq(users.id, paymentRequest[0].technician_id))
      .limit(1);
    
    // Calcular valores totais
    const serviceTotalValue = servicesDetails.reduce((sum, service) => 
      sum + (service.total || 0), 0);
    
    const technicianTotalValue = servicesDetails.reduce((sum, service) => 
      sum + (service.price || 0), 0);
    
    return {
      ...paymentRequest[0],
      technician: technician[0] || null,
      services: servicesDetails,
      totalValue: technicianTotalValue, // Valor do técnico que é o valor a ser pago
      serviceTotalValue: serviceTotalValue, // Valor total para referência do admin
      technicianValue: technicianTotalValue // Valor para o técnico
    };
  }
  
  async listPaymentRequests(technicianId?: number): Promise<any[]> {
    let query = db
      .select({
        id: paymentRequests.id,
        created_at: paymentRequests.created_at,
        status: paymentRequests.status,
        technician_id: paymentRequests.technician_id,
        technician: users,
      })
      .from(paymentRequests)
      .leftJoin(users, eq(paymentRequests.technician_id, users.id));
    
    if (technicianId) {
      query = query.where(eq(paymentRequests.technician_id, technicianId));
    }
    
    const results = await query.orderBy(desc(paymentRequests.created_at));
    
    // Add the associated services to each payment request
    for (const req of results) {
      // Buscar os IDs dos serviços associados a este pedido
      const itemsData = await db
        .select({
          id: paymentRequestItems.id,
          service_id: paymentRequestItems.service_id,
        })
        .from(paymentRequestItems)
        .where(eq(paymentRequestItems.payment_request_id, req.id));
      
      // Buscar detalhes completos de cada serviço
      const serviceIds = itemsData.map(item => item.service_id);
      const servicesDetails = [];
      
      for (const serviceId of serviceIds) {
        const service = await this.getService(serviceId);
        if (service) {
          const client = await this.getClient(service.client_id);
          const serviceType = await this.getServiceType(service.service_type_id);
          
          servicesDetails.push({
            ...service,
            client: {
              id: client?.id,
              name: client?.name
            },
            serviceType: {
              id: serviceType?.id,
              name: serviceType?.name
            }
          });
        }
      }
      
      req.services = servicesDetails;
      
      // CORREÇÃO: sempre usar o valor do técnico (price) nos pedidos de pagamento
      // Este é o valor que o técnico receberá, não o valor total incluindo taxas administrativas
      const technicianTotalValue = servicesDetails.reduce((sum, service) => 
        sum + (service.price || 0), 0);
      
      // Para o admin, também calculamos o valor total (com taxas) para referência
      const serviceTotalValue = servicesDetails.reduce((sum, service) => 
        sum + (service.total || 0), 0);
      
      // Sempre mostramos o valor do técnico para pagamento
      req.totalValue = technicianTotalValue;
      // Mas mantemos ambos os valores disponíveis para referência do admin
      req.serviceTotalValue = serviceTotalValue; // Valor total (admin)
      req.technicianValue = technicianTotalValue; // Valor do técnico
    }
    
    return results;
  }
  
  async updatePaymentRequestStatus(id: number, status: string, paymentDetails?: any): Promise<PaymentRequest | undefined> {
    console.log(`Atualizando pedido ${id} para status ${status}`);
    console.log(`Detalhes de pagamento:`, paymentDetails);
    
    // Incluir detalhes de pagamento se fornecidos
    const updateData: any = { status };
    if (paymentDetails && status === "pago") {
      // Converter detalhes de pagamento para JSON string para evitar erros
      updateData.payment_details = JSON.stringify(paymentDetails);
      updateData.payment_date = new Date();
      console.log("Dados a serem atualizados:", updateData);
    }
    
    const [updatedRequest] = await db
      .update(paymentRequests)
      .set(updateData)
      .where(eq(paymentRequests.id, id))
      .returning();
    
    console.log("Retorno da atualização:", updatedRequest);
    
    // If approved, update all associated services to "faturado"
    if (status === "aprovado") {
      const items = await db
        .select({
          service_id: paymentRequestItems.service_id,
        })
        .from(paymentRequestItems)
        .where(eq(paymentRequestItems.payment_request_id, id));
      
      console.log(`Encontrados ${items.length} serviços para status "faturado"`);
      
      // Atualizar status das ordens de serviço para "faturado"
      for (const item of items) {
        await db
          .update(services)
          .set({ status: "faturado" })
          .where(eq(services.id, item.service_id));
          
        // Atualizar transações relacionadas a este serviço de "aguardando aprovação" para "faturado"
        // Buscar todas as transações com status "aguardando_aprovacao" para este serviço
        const servicesToUpdate = await db
          .select()
          .from(services)
          .where(eq(services.id, item.service_id));
        
        if (servicesToUpdate.length > 0) {
          const service = servicesToUpdate[0];
          // Atualizar as transações relacionadas ao cliente e veículo deste serviço
          await db
            .update(services)
            .set({ status: "faturado" })
            .where(
              and(
                eq(services.client_id, service.client_id),
                eq(services.status, "aguardando_aprovacao")
              )
            );
        }
      }
    }
    
    // If paid, update all associated services to "pago"
    if (status === "pago") {
      const items = await db
        .select({
          service_id: paymentRequestItems.service_id,
        })
        .from(paymentRequestItems)
        .where(eq(paymentRequestItems.payment_request_id, id));
      
      console.log(`Encontrados ${items.length} serviços para status "pago"`);
      
      // Atualizar status das ordens de serviço para "pago"
      for (const item of items) {
        await db
          .update(services)
          .set({ status: "pago" })
          .where(eq(services.id, item.service_id));
          
        // Atualizar transações relacionadas a este serviço de "faturado" para "pago"
        // Buscar todas as transações com status "faturado" para este serviço
        const servicesToUpdate = await db
          .select()
          .from(services)
          .where(eq(services.id, item.service_id));
        
        if (servicesToUpdate.length > 0) {
          const service = servicesToUpdate[0];
          // Atualizar as transações relacionadas ao cliente e veículo deste serviço
          await db
            .update(services)
            .set({ status: "pago" })
            .where(
              and(
                eq(services.client_id, service.client_id),
                eq(services.status, "faturado")
              )
            );
        }
      }
      
      try {
        // Registrar despesa automaticamente
        if (updatedRequest) {
          // Primeiro, obter o técnico associado e os serviços pagos
          const [paymentRequestInfo] = await db
            .select({
              technician_id: paymentRequests.technician_id
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id));
            
          if (!paymentRequestInfo) {
            console.log("Informações do pedido não encontradas");
            return updatedRequest;
          }
            
          // Buscar informações do técnico
          const [technicianInfo] = await db
            .select()
            .from(users)
            .where(eq(users.id, paymentRequestInfo.technician_id));
            
          const technicianName = technicianInfo ? technicianInfo.name : 'N/A';
          
          // Buscar IDs dos serviços associados
          const serviceItems = await db
            .select({
              service_id: paymentRequestItems.service_id
            })
            .from(paymentRequestItems)
            .where(eq(paymentRequestItems.payment_request_id, id));
            
          const serviceIds = serviceItems.map(item => item.service_id);
          
          // Calcular valor técnico total
          let technicianValue = 0;
          const serviceDetails = [];
          
          for (const serviceId of serviceIds) {
            const [serviceData] = await db
              .select()
              .from(services)
              .where(eq(services.id, serviceId));
              
            if (serviceData) {
              technicianValue += serviceData.price || 0;
              serviceDetails.push(serviceId);
            }
          }
          
          console.log("Valor total para o técnico:", technicianValue);
          
          // Criar descrição com detalhes das OS
          const osNumbers = serviceDetails.map(id => `#${id}`).join(", ");
          const description = `Pagamento ao técnico ${technicianName} - Pedido #${id} - OS ${osNumbers}`;
          
          // Registrar despesa como salário se o valor for maior que zero
          if (technicianValue > 0) {
            console.log("Registrando despesa:", description);
            
            // Extrair detalhes do pagamento
            console.log("Detalhes de pagamento recebidos:", JSON.stringify(paymentDetails));
            let paymentMethod = "outro";
            let paymentNotes = "";
            
            // Verificar a estrutura dos detalhes do pagamento
            if (typeof paymentDetails === 'string') {
              try {
                // Tentar fazer o parse se for uma string JSON
                const parsed = JSON.parse(paymentDetails);
                paymentMethod = parsed?.payment_method || "outro";
                paymentNotes = parsed?.payment_notes || "";
              } catch (e) {
                console.log("Erro ao fazer parse dos detalhes do pagamento:", e);
                paymentNotes = paymentDetails; // Usar como observação se não for JSON
              }
            } else if (paymentDetails && typeof paymentDetails === 'object') {
              // Se já for um objeto
              paymentMethod = paymentDetails.payment_method || "outro";
              paymentNotes = paymentDetails.payment_notes || "";
            }
            
            // Inserir na tabela de despesas
            await db
              .insert(expenses)
              .values({
                type: "salario",
                amount: technicianValue,
                date: new Date(),
                description: description,
                payment_method: paymentMethod,
                notes: paymentNotes,
              });
              
            console.log("Despesa registrada com sucesso");
          } else {
            console.log("Nenhuma despesa registrada - valor zero");
          }
        }
      } catch (error) {
        console.error("Erro ao registrar despesa:", error);
        // Continuar mesmo com erro no registro da despesa
      }
    }
    
    // If rejected, update all associated services back to "completed"
    if (status === "rejeitado") {
      const items = await db
        .select({
          service_id: paymentRequestItems.service_id,
        })
        .from(paymentRequestItems)
        .where(eq(paymentRequestItems.payment_request_id, id));
      
      console.log(`Encontrados ${items.length} serviços para retornar ao status "completed"`);
      
      for (const item of items) {
        await db
          .update(services)
          .set({ status: "completed" })
          .where(eq(services.id, item.service_id));
          
        // Também atualizar transações relacionadas para "completed"
        const servicesToUpdate = await db
          .select()
          .from(services)
          .where(eq(services.id, item.service_id));
        
        if (servicesToUpdate.length > 0) {
          const service = servicesToUpdate[0];
          // Atualizar as transações relacionadas ao cliente e veículo deste serviço
          await db
            .update(services)
            .set({ status: "completed" })
            .where(
              and(
                eq(services.client_id, service.client_id),
                or(
                  eq(services.status, "aguardando_aprovacao"),
                  eq(services.status, "faturado")
                )
              )
            );
        }
      }
    }
    
    return updatedRequest;
  }
}

export const storage = new DatabaseStorage();
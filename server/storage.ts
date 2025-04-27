import { 
  users, clients, vehicles, serviceTypes, services, servicePhotos, 
  eventTypes, events, paymentRequests, paymentRequestItems, expenses,
  managerClientAssignments, budgets
} from "@shared/schema";
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
  Expense, InsertExpense,
  ManagerClientAssignment, InsertManagerClientAssignment,
  Budget, InsertBudget
} from "@shared/schema";
import { initDb } from "./db-mysql";
import { eq, and, like, desc, or, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import session from "express-session";
import memorystore from "memorystore";

// Inicializamos a conexão e o DB durante a inicialização
let db: any;
let pool: any;

// Esta função deve ser chamada no inicio do servidor
export const initializeDatabase = async () => {
  const connection = await initDb();
  db = connection.db;
  pool = connection.pool;
  console.log("Database initialized successfully");
  return { db, pool };
};

// Usar MemoryStore como alternativa temporária para sessões até configurar MySQL
const MemoryStore = memorystore(session);

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
  listServices(filters?: Partial<{ status: string, technicianId: number, clientId: number, clientIds?: number[] }>): Promise<Service[]>;
  getServiceDetails(id: number): Promise<any>; // Returns service with related entities

  // Service Photos methods
  addServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto>;
  getServicePhotos(serviceId: number, type?: string): Promise<ServicePhoto[]>;
  removeServicePhoto(photoId: number): Promise<boolean>;

  // Dashboard data
  getDashboardStats(technicianId?: number): Promise<any>;
  getDashboardStatsForManager(clientIds: number[]): Promise<any>;
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
  
  // Manager-Client methods
  assignClientToManager(managerId: number, clientId: number): Promise<ManagerClientAssignment>;
  removeClientFromManager(managerId: number, clientId: number): Promise<boolean>;
  getManagerClients(managerId: number): Promise<Client[]>;
  getClientManagers(clientId: number): Promise<User[]>;
  
  // Budget methods
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  listBudgets(): Promise<Budget[]>;
  
  // Session store
  sessionStore: any; // Usar tipagem any para evitar erros com session.SessionStore
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Corrigir erro de tipagem do session.SessionStore
  
  constructor() {
    // Usar MemoryStore como armazenamento temporário de sessão
    // Isso é apenas para desenvolvimento, em produção vamos configurar o MySQL para sessões
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Não inicializamos dados de exemplo no construtor
    // Isso será feito após a conexão com o banco ser estabelecida
  }
  
  // Método para inicializar dados após a conexão ser estabelecida
  async initialize() {
    if (db) {
      await this.initializeSampleData();
    } else {
      console.warn("Database not initialized yet. Sample data will not be created.");
    }
  }
  
  // Budget methods
  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    
    if (budget) {
      // Buscar informações adicionais do cliente
      const [client] = await db.select().from(clients).where(eq(clients.id, budget.client_id));
      
      return {
        ...budget,
        client_name: client?.name || 'Cliente não encontrado'
      } as any;
    }
    
    return budget;
  }
  
  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const [budget] = await db.insert(budgets).values(insertBudget).returning();
    return budget;
  }
  
  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db.update(budgets)
      .set(budgetData)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  async listBudgets(): Promise<Budget[]> {
    // Buscar orçamentos com informações dos clientes
    const budgetsList = await db.select({
      id: budgets.id,
      client_id: budgets.client_id,
      vehicle_info: budgets.vehicle_info,
      date: budgets.date,
      total_aw: budgets.total_aw,
      total_value: budgets.total_value,
      photo_url: budgets.photo_url,
      note: budgets.note,
      plate: budgets.plate,
      created_at: budgets.created_at,
      client_name: clients.name
    })
    .from(budgets)
    .leftJoin(clients, eq(budgets.client_id, clients.id))
    .orderBy(desc(budgets.date));
    
    return budgetsList;
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
      
      // Create manager user
      await this.createUser({
        username: "gestor",
        password: adminPassword,
        name: "Carlos Oliveira",
        email: "gestor@eurodent.com",
        phone: "(11) 98765-4321",
        role: "gestor",
        active: true
      });
      
      // Create service types
      await this.createServiceType({
        name: "Amassado de Rua",
        description: "Reparo de amassados de rua sem pintura",
        base_price: 150
      });
      
      await this.createServiceType({
        name: "Granizo",
        description: "Reparo de danos causados por granizo",
        base_price: 250
      });
      
      await this.createServiceType({
        name: "Outros",
        description: "Outros tipos de reparos sem pintura",
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
    try {
      // No MySQL não temos o método returning()
      await db.update(users)
        .set(userData)
        .where(eq(users.id, id));
      
      // Buscamos o usuário atualizado
      return this.getUser(id);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return undefined;
    }
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
    try {
      // No MySQL o método returning() não é suportado
      const result = await db.insert(clients).values(insertClient);
      // Obter o ID do cliente recém-criado
      const clientId = Number(result.insertId);
      // Buscar o cliente pelo ID
      const client = await this.getClient(clientId);
      
      if (!client) {
        throw new Error(`Cliente criado mas não encontrado com ID ${clientId}`);
      }
      
      return client;
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      throw error;
    }
  }
  
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    try {
      // No MySQL não temos o método returning()
      await db.update(clients)
        .set(clientData)
        .where(eq(clients.id, id));
      
      // Buscar o cliente atualizado
      return this.getClient(id);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      return undefined;
    }
  }
  
  async listClients(): Promise<Client[]> {
    try {
      // Precisamos selecionar apenas campos que existem no MySQL
      // e ajustar o resultado para incluir campos que podem não existir na tabela
      console.log("Selecionando clientes apenas com colunas existentes");
      
      const basicResult = await db.select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        created_at: clients.created_at
      }).from(clients);
      
      // Adicionar campos ausentes ao resultado
      const result = basicResult.map(client => ({
        ...client,
        city: null,
        state: null,
        zip: null
      }));
      
      return result;
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      return [];
    }
  }
  
  async searchClients(query: string): Promise<Client[]> {
    try {
      const basicResult = await db.select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        created_at: clients.created_at
      }).from(clients).where(
        like(clients.name, `%${query}%`)
      );
      
      // Adicionar campos ausentes ao resultado
      const result = basicResult.map(client => ({
        ...client,
        city: null,
        state: null,
        zip: null
      }));
      
      return result;
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return [];
    }
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
    try {
      // Selecionar apenas colunas que existem na tabela MySQL
      const selectColumns = {
        id: services.id,
        client_id: services.client_id,
        vehicle_id: services.vehicle_id,
        service_type_id: services.service_type_id,
        technician_id: services.technician_id,
        status: services.status,
        scheduled_date: services.scheduled_date,
        start_date: services.start_date,
        completion_date: services.completion_date,
        location_type: services.location_type,
        address: services.address,
        aw_value: services.aw_value,
        total: services.total,
        notes: services.notes,
        dents: services.dents,
        size: services.size,
        is_vertical: services.is_vertical,
        is_aluminum: services.is_aluminum,
        created_at: services.created_at
      };
      
      const [basicService] = await db.select(selectColumns)
        .from(services)
        .where(eq(services.id, id));
      
      if (!basicService) {
        return undefined;
      }
      
      // Adicionar campos ausentes
      const service: Service = {
        ...basicService,
        description: null // Campo que existe no PostgreSQL mas não no MySQL
      };
      
      return service;
    } catch (error) {
      console.error("Erro ao obter serviço:", error);
      return undefined;
    }
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
    
    // Taxa de deslocamento removida
    
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
  
  async listServices(filters?: Partial<{ status: string, technicianId: number, clientId: number, clientIds?: number[] }>): Promise<Service[]> {
    try {
      // Selecionar apenas as colunas que sabemos que existem no MySQL
      const selectColumns = {
        id: services.id,
        client_id: services.client_id,
        vehicle_id: services.vehicle_id,
        service_type_id: services.service_type_id,
        technician_id: services.technician_id,
        status: services.status,
        scheduled_date: services.scheduled_date,
        start_date: services.start_date,
        completion_date: services.completion_date,
        location_type: services.location_type,
        address: services.address,
        aw_value: services.aw_value,
        total: services.total,
        notes: services.notes,
        dents: services.dents,
        size: services.size,
        is_vertical: services.is_vertical,
        is_aluminum: services.is_aluminum,
        created_at: services.created_at
      };
      
      let query = db.select(selectColumns).from(services)
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
        
        // Suporte para filtrar por múltiplos IDs de clientes (para gestores)
        if (filters.clientIds && filters.clientIds.length > 0) {
          // Usar o operador 'inArray' para comparar com uma lista de IDs
          query = query.where(inArray(services.client_id, filters.clientIds));
        }
      }
      
      const result = await query.orderBy(desc(services.created_at));
      
      // Adicionar a coluna description que não existe no MySQL
      return result.map(service => ({
        ...service,
        description: null
      }));
    } catch (error) {
      console.error("Erro ao listar serviços:", error);
      return [];
    }
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
    const servicePhotos = photos.filter(photo => photo.photo_type === 'service');
    
    return {
      ...service,
      client,
      vehicle,
      serviceType,
      technician,
      photos: {
        before: beforePhotos,
        after: afterPhotos,
        service: servicePhotos
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
  
  async removeServicePhoto(photoId: number): Promise<boolean> {
    try {
      // Primeiro, obtenha as informações da foto para poder remover o arquivo do sistema de arquivos
      const [photo] = await db.select().from(servicePhotos).where(eq(servicePhotos.id, photoId));
      
      if (!photo) {
        console.log(`Foto com ID ${photoId} não encontrada`);
        return false;
      }
      
      console.log(`Removendo foto ${photoId} do banco de dados: ${photo.photo_url}`);
      
      // Remove do banco de dados
      const result = await db.delete(servicePhotos).where(eq(servicePhotos.id, photoId)).returning();
      
      // Se a remoção no banco de dados for bem-sucedida, tente remover o arquivo físico
      if (result.length > 0) {
        try {
          // Opcional: remover o arquivo físico do sistema de arquivos
          // Isso requer o módulo 'fs' e o caminho base do projeto
          // É complicado porque o caminho armazenado no BD (/uploads/...) não é o caminho absoluto do arquivo
          // Seria necessário converter para o caminho absoluto real
          // const fs = require('fs');
          // const path = require('path');
          // const filePath = path.join(process.cwd(), photo.photo_url);
          // if (fs.existsSync(filePath)) {
          //   fs.unlinkSync(filePath);
          // }
        } catch (fileError) {
          console.error(`Erro ao remover arquivo físico para a foto ${photoId}:`, fileError);
          // Mesmo com erro para remover o arquivo, consideramos a operação bem sucedida
          // porque o registro foi removido do banco de dados
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Erro ao remover foto ${photoId}:`, error);
      return false;
    }
  }
  
  // Estatísticas financeiras para técnicos
  async getTechnicianFinancialStats(technicianId: number): Promise<any> {
    // Validar se o ID do técnico é fornecido
    if (!technicianId) {
      throw new Error('ID do técnico é obrigatório');
    }

    // Obter todos os serviços do técnico (excluindo deletados)
    const allServices = await db.select().from(services)
      .where(
        and(
          eq(services.technician_id, technicianId),
          sql`${services.status} != 'deleted'`
        )
      );
    
    // Obter todos os pedidos de pagamento do técnico
    const paymentRequestsData = await this.listPaymentRequests(technicianId);
    
    // Categorizar serviços por status
    const pendingApproval = allServices.filter(s => s.status === 'aguardando_aprovacao');
    const faturado = allServices.filter(s => s.status === 'faturado');
    const pago = allServices.filter(s => s.status === 'pago');
    const completed = allServices.filter(s => s.status === 'completed' || s.status === 'concluido');
    
    // Categorizar pedidos de pagamento por status
    const pendingRequests = paymentRequestsData.filter(pr => pr.status === 'pendente');
    const approvedRequests = paymentRequestsData.filter(pr => pr.status === 'aprovado');
    const paidRequests = paymentRequestsData.filter(pr => pr.status === 'pago');
    const rejectedRequests = paymentRequestsData.filter(pr => pr.status === 'rejeitado');
    
    // Calcular valores financeiros
    // 1. Valores em aprovação (pedidos pendentes)
    const pendingValue = pendingRequests.reduce((sum, pr) => 
      sum + (pr.technicianValue || 0), 0);
    
    // 2. Valores faturados (pedidos aprovados)
    const invoicedValue = approvedRequests.reduce((sum, pr) => 
      sum + (pr.technicianValue || 0), 0);
    
    // 3. Valores recebidos (pedidos pagos)
    const receivedValue = paidRequests.reduce((sum, pr) => 
      sum + (pr.technicianValue || 0), 0);

    // 4. Valores de serviços concluídos que ainda não foram pedidos pagamento
    const unpaidCompletedValue = completed.reduce((sum, service) => 
      sum + (service.aw_value || 0), 0);
    
    // Resumir valores por mês nos últimos 6 meses
    const today = new Date();
    const monthlyData = [];
    
    for (let i = 0; i < 6; i++) {
      const month = new Date(today);
      month.setMonth(month.getMonth() - i);
      month.setDate(1); // Primeiro dia do mês
      month.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Filtrar pagamentos deste mês
      const monthPaidRequests = paidRequests.filter(pr => {
        const paymentDate = pr.payment_date ? new Date(pr.payment_date) : null;
        return paymentDate && paymentDate >= month && paymentDate < nextMonth;
      });
      
      // Somar valores pagos no mês
      const monthValue = monthPaidRequests.reduce((sum, pr) => 
        sum + (pr.technicianValue || 0), 0);
      
      // Nome do mês em português
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      monthlyData.push({
        month: monthNames[month.getMonth()],
        value: monthValue,
        year: month.getFullYear()
      });
    }
    
    // Inverter para ordem cronológica (mais antigo primeiro)
    monthlyData.reverse();
    
    return {
      pendingValue,         // Valores em aprovação
      invoicedValue,        // Valores faturados (aprovados)
      receivedValue,        // Valores recebidos (pagos)
      unpaidCompletedValue, // Valores de serviços concluídos sem pedido
      
      pendingCount: pendingRequests.length,
      approvedCount: approvedRequests.length,
      paidCount: paidRequests.length,
      rejectedCount: rejectedRequests.length,
      
      pendingServicesCount: pendingApproval.length,
      faturadoServicesCount: faturado.length,
      pagoServicesCount: pago.length,
      completedServicesCount: completed.length,
      
      monthlyData           // Dados mensais para gráfico
    };
  }

  // Dashboard data
  async getDashboardStats(technicianId?: number): Promise<any> {
    try {
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
            or(
              eq(services.status, 'pending'),
              eq(services.status, 'aguardando')
            ),
            ...baseConditions
          )
        );
      
      // 2. Total de OS em progresso
      const [faturadoResult] = await db.select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            or(
              eq(services.status, 'in_progress'),
              eq(services.status, 'em_progresso'),
              eq(services.status, 'faturado')
            ),
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
              eq(services.status, 'concluido'),
              eq(services.status, 'aguardando_aprovacao'),
              eq(services.status, 'faturado'),
              eq(services.status, 'pago')
            ),
            ...baseConditions
          )
        );
      
      // 4. Faturamento total (todas as OS concluídas, em qualquer período)
      // Admin vê valor total (preço + taxa administrativa), técnico vê apenas seu valor (price)
      console.log('Calculando faturamento para:', technicianId ? `Técnico ID ${technicianId}` : 'Admin');
      
      let totalRevenue = 0;
      
      // Obter todos os serviços concluídos que correspondem aos filtros
      const completedServices = await db.select()
        .from(services)
        .where(
          and(
            or(
              eq(services.status, 'completed'),
              eq(services.status, 'concluido'),
              eq(services.status, 'aguardando_aprovacao'),
              eq(services.status, 'faturado'),
              eq(services.status, 'pago')
            ),
            ...baseConditions
          )
        );
      
      // Calcular o valor de acordo com o tipo de usuário
      if (technicianId) {
        // Para técnicos: apenas a soma do valor do serviço (aw_value)
        totalRevenue = completedServices.reduce((sum, service) => 
          sum + (service.aw_value || 0), 0);
      } else {
        // Para administradores: soma do valor total do serviço (total ou aw_value)
        totalRevenue = completedServices.reduce((sum, service) => 
          sum + (service.total || service.aw_value || 0), 0);
      }
      
      // Converter para o formato esperado pelo frontend
      const totalPendingServices = typeof pendingResult.count === 'string' 
        ? parseInt(pendingResult.count) 
        : (pendingResult.count || 0);
      
      const totalFaturadoServices = typeof faturadoResult.count === 'string' 
        ? parseInt(faturadoResult.count) 
        : (faturadoResult.count || 0);
      
      const totalCompletedServices = typeof completedResult.count === 'string' 
        ? parseInt(completedResult.count) 
        : (completedResult.count || 0);
      
      const stats = {
        totalPendingServices,
        totalInProgressServices: totalFaturadoServices, // Mudou de in_progress para faturado, mantendo o nome da prop para compatibilidade
        totalCompletedServices,
        totalRevenue: totalRevenue
      };
      
      console.log('Stats formatados para envio:', stats);
      return stats;
      
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      return {
        totalPendingServices: 0,
        totalInProgressServices: 0,
        totalCompletedServices: 0,
        totalRevenue: 0
      };
    }
  }
  
  // Método específico para obter estatísticas para gestores
  async getDashboardStatsForManager(clientIds: number[]): Promise<any> {
    if (!clientIds || clientIds.length === 0) {
      return {
        totalPendingServices: 0,
        totalInProgressServices: 0,
        totalCompletedServices: 0,
        totalRevenue: 0
      };
    }
    
    console.log('Obtendo estatísticas para gestor com clientes:', clientIds);
    
    // Condições base para todos os filtros (excluir serviços deletados)
    const baseConditions = [
      sql`${services.status} != 'deleted'`
    ];
    
    // Adicionar condição de clientes com inArray
    baseConditions.push(inArray(services.client_id, clientIds));
    
    // 1. Total de OS pendentes dos clientes do gestor
    const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          or(
            eq(services.status, 'pending'),
            eq(services.status, 'aguardando')
          ),
          ...baseConditions
        )
      );
    
    // 2. Total de OS em progresso dos clientes do gestor
    const [inProgressResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          or(
            eq(services.status, 'em_progresso'),
            eq(services.status, 'in_progress')
          ),
          ...baseConditions
        )
      );
    
    // 3. Total de OS concluídas dos clientes do gestor
    const [completedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          or(
            eq(services.status, 'completed'),
            eq(services.status, 'concluido'),
            eq(services.status, 'aguardando_aprovacao'),
            eq(services.status, 'faturado'),
            eq(services.status, 'pago')
          ),
          ...baseConditions
        )
      );
    
    // 4. Faturamento total (não será mostrado para o gestor, mas calculamos para manter a estrutura de dados)
    const [revenueResult] = await db.select({
      total: sql<number>`SUM(${services.aw_value})`
    })
    .from(services)
    .where(
      and(
        or(
          eq(services.status, 'completed'),
          eq(services.status, 'concluido'),
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
    
    const totalRevenue = revenueResult.total ? Number(revenueResult.total) : 0;
    
    const stats = {
      totalPendingServices,
      totalInProgressServices,
      totalCompletedServices,
      totalRevenue
    };
    
    console.log('Stats do gestor:', {
      totalPendingServices,
      totalInProgressServices,
      totalCompletedServices
    });
    return stats;
  }
  
  async getTechnicianPerformance(): Promise<any> {
    const technicians = await this.listUsers('technician');
    
    const results = await Promise.all(
      technicians.map(async (tech) => {
        // All services assigned to this technician (excluding deleted)
        const allServices = await db.select({
          id: services.id,
          client_id: services.client_id,
          vehicle_id: services.vehicle_id,
          service_type_id: services.service_type_id,
          technician_id: services.technician_id,
          status: services.status,
          scheduled_date: services.scheduled_date,
          start_date: services.start_date,
          completion_date: services.completion_date,
          location_type: services.location_type,
          address: services.address,
          aw_value: services.aw_value,
          total: services.total,
          notes: services.notes,
          created_at: services.created_at
        }).from(services)
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
      sum + (service.aw_value || 0), 0);
    
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
        sum + (service.aw_value || 0), 0);
      
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
              technicianValue += serviceData.aw_value || 0;
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
            
            // Extrair a data do pagamento ou usar a data atual
            let paymentDate = new Date();
            if (paymentDetails.payment_date) {
              try {
                paymentDate = new Date(paymentDetails.payment_date);
              } catch (e) {
                console.log("Erro ao converter data de pagamento:", e);
              }
            }
            
            // Inserir na tabela de despesas
            await db
              .insert(expenses)
              .values({
                type: "salario",
                amount: technicianValue,
                date: paymentDate,
                description: description,
                payment_method: paymentMethod,
                notes: paymentNotes,
                provider: technicianName
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
  
  // Métodos para gestão de clientes por gestor
  async assignClientToManager(managerId: number, clientId: number): Promise<ManagerClientAssignment> {
    // Verificar se a atribuição já existe
    const existingAssignments = await db.select().from(managerClientAssignments)
      .where(and(
        eq(managerClientAssignments.manager_id, managerId),
        eq(managerClientAssignments.client_id, clientId)
      ));
    
    if (existingAssignments.length > 0) {
      return existingAssignments[0];
    }
    
    // Criar nova atribuição
    const [assignment] = await db.insert(managerClientAssignments)
      .values({
        manager_id: managerId,
        client_id: clientId
      })
      .returning();
    
    return assignment;
  }
  
  async removeClientFromManager(managerId: number, clientId: number): Promise<boolean> {
    const result = await db.delete(managerClientAssignments)
      .where(and(
        eq(managerClientAssignments.manager_id, managerId),
        eq(managerClientAssignments.client_id, clientId)
      ));
    
    return result.rowCount > 0;
  }
  
  async getManagerClients(managerId: number): Promise<Client[]> {
    try {
      // Busca todos os clientes atribuídos a um gestor específico
      // Selecionando explicitamente as colunas que sabemos que existem no MySQL
      const basicAssignments = await db.select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        notes: clients.notes,
        created_at: clients.created_at
      })
      .from(managerClientAssignments)
      .innerJoin(clients, eq(managerClientAssignments.client_id, clients.id))
      .where(eq(managerClientAssignments.manager_id, managerId));
      
      // Adicionar campos ausentes ao resultado
      const assignments = basicAssignments.map(client => ({
        ...client,
        city: null,
        state: null,
        zip: null
      }));
      
      return assignments;
    } catch (error) {
      console.error("Erro ao buscar clientes do gestor:", error);
      return [];
    }
  }
  
  async getClientManagers(clientId: number): Promise<User[]> {
    // Busca todos os gestores atribuídos a um cliente específico
    const assignments = await db.select({
      manager: users
    })
    .from(managerClientAssignments)
    .innerJoin(users, eq(managerClientAssignments.manager_id, users.id))
    .where(eq(managerClientAssignments.client_id, clientId));
    
    return assignments.map(a => a.manager);
  }
  
  async getTechnicianFinancialStats(technicianId: number) {
    console.log(`Buscando estatísticas financeiras para o técnico ID: ${technicianId}`);
    
    // Buscar todos os serviços deste técnico
    const technicianServices = await db.select()
      .from(services)
      .where(eq(services.technician_id, technicianId));
    
    console.log(`Encontrados ${technicianServices.length} serviços para o técnico ID: ${technicianId}`);
    
    // Buscar pagamentos solicitados
    const paymentRequestsList = await db.select()
      .from(paymentRequests)
      .where(eq(paymentRequests.technician_id, technicianId));
    
    console.log(`Encontrados ${paymentRequestsList.length} pedidos de pagamento para o técnico ID: ${technicianId}`);
    
    // Buscar a relação entre serviços e pagamentos
    const servicePaymentRelations = await db.select()
      .from(paymentRequestItems)
      .where(
        inArray(
          paymentRequestItems.payment_request_id, 
          paymentRequestsList.map(pr => pr.id)
        )
      );
    
    console.log(`Encontradas ${servicePaymentRelations.length} relações serviço-pagamento`);
    
    // IDs de serviços com pedido de pagamento
    const servicesWithPaymentRequest = new Set(
      servicePaymentRelations.map(spr => spr.service_id)
    );
    
    // Cálculo dos valores por status
    let pendingValue = 0;          // Em aprovação 
    let invoicedValue = 0;         // Faturados
    let receivedValue = 0;         // Recebidos
    let unpaidCompletedValue = 0;  // Serviços concluídos mas sem solicitação
    
    // Dados de pagamentos por mês
    const lastSixMonths: { month: string, value: number }[] = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(today.getMonth() - i);
      
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      
      lastSixMonths.push({
        month: `${monthName}/${year}`,
        value: 0
      });
    }
    
    // Processar pedidos de pagamento
    for (const request of paymentRequestsList) {
      const requestDate = new Date(request.created_at);
      const requestMonth = requestDate.getMonth();
      const requestYear = requestDate.getFullYear();
      
      // Buscar os serviços deste pedido
      const requestServiceIds = servicePaymentRelations
        .filter(spr => spr.payment_request_id === request.id)
        .map(spr => spr.service_id);
      
      const requestServices = technicianServices.filter(
        service => requestServiceIds.includes(service.id)
      );
      
      // Calcular valor total deste pedido
      const requestValue = requestServices.reduce(
        (sum, service) => sum + (service.aw_value || 0), 
        0
      );
      
      // Atualizar estatísticas com base no status
      switch(request.status) {
        case 'aguardando_aprovacao':
          pendingValue += requestValue;
          break;
        case 'aprovado':
          invoicedValue += requestValue;
          break;
        case 'pago':
          receivedValue += requestValue;
          
          // Atualizar dados de pagamentos mensais
          for (let i = 0; i < lastSixMonths.length; i++) {
            const monthData = lastSixMonths[i];
            const monthDate = new Date(today);
            monthDate.setMonth(today.getMonth() - (5 - i));
            
            if (
              requestDate.getMonth() === monthDate.getMonth() && 
              requestDate.getFullYear() === monthDate.getFullYear()
            ) {
              monthData.value += requestValue;
              break;
            }
          }
          break;
      }
    }
    
    // Calcular valor de serviços concluídos sem solicitação de pagamento
    unpaidCompletedValue = technicianServices
      .filter(service => 
        service.status === 'concluido' && 
        !servicesWithPaymentRequest.has(service.id)
      )
      .reduce((sum, service) => sum + (service.aw_value || 0), 0);
    
    console.log(`Estatísticas calculadas para o técnico ID ${technicianId}:`, {
      pendingValue,
      invoicedValue,
      receivedValue,
      unpaidCompletedValue,
      monthlyData: lastSixMonths
    });
    
    return {
      pendingValue,         // Em aprovação
      invoicedValue,        // Faturados
      receivedValue,        // Recebidos
      unpaidCompletedValue, // Não solicitados
      monthlyData: lastSixMonths // Dados mensais para o gráfico
    };
  }
}

export const storage = new DatabaseStorage();
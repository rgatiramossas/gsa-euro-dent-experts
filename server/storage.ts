import { 
  users, clients, vehicles, serviceTypes, services, servicePhotos, 
  eventTypes, events, paymentRequests, paymentRequestItems, expenses,
  managerClientAssignments, budgets
} from "@shared/schema.mysql";
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
} from "@shared/schema.mysql";
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
  try {
    console.log("Tentando inicializar banco de dados MySQL...");
    const connection = await initDb();
    db = connection.db;
    pool = connection.pool;
    console.log("Database initialized successfully");
    
    // Verificar e criar tabelas essenciais
    await createEssentialTables();
    
    return { db, pool };
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
    
    // Se quiser implementar um fallback para um banco em memória em caso de falha:
    // console.log("Usando armazenamento em memória como fallback...");
    // ... lógica de fallback aqui ...
    
    // Por enquanto, propagamos o erro para interromper a aplicação
    throw error;
  }
};

// Função para criar as tabelas essenciais
async function createEssentialTables() {
  try {
    console.log("Verificando tabelas essenciais...");
    
    // Verificar se a tabela service_types existe
    const [serviceTypesResult] = await pool.query("SHOW TABLES LIKE 'service_types'");
    if (!serviceTypesResult.length) {
      console.log("Criando tabela service_types...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS service_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          base_price DECIMAL(10, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log("Tabela service_types criada com sucesso");
    }
    
    // Atualizar tipos de serviço com os novos nomes solicitados
    console.log("Atualizando nomes dos tipos de serviço existentes...");
    
    // Verificar tipos de serviço existentes
    const [existingTypes] = await pool.query("SELECT * FROM service_types ORDER BY id");
    
    if (existingTypes.length === 0) {
      // Se não existirem tipos, criar novos
      console.log("Nenhum tipo de serviço encontrado, criando novos...");
      await pool.query(`
        INSERT INTO service_types (name, description, base_price) VALUES 
        ('Amassado de Rua', 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua', 100.00),
        ('Granizo', 'Reparo de danos causados por granizo', 200.00),
        ('Outros', 'Outros tipos de restauração e serviços', 150.00)
      `);
    } else {
      // Se existirem, atualizar os nomes mantendo os IDs
      console.log("Atualizando tipos de serviço existentes...");
      
      // Mapear os novos nomes baseados nas posições (assumindo que a ordem dos IDs é consistente)
      const typeUpdates = [
        { name: 'Amassado de Rua', description: 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua' },
        { name: 'Granizo', description: 'Reparo de danos causados por granizo' },
        { name: 'Outros', description: 'Outros tipos de restauração e serviços' }
      ];
      
      // Atualizar cada tipo, preservando os IDs existentes
      for (let i = 0; i < Math.min(existingTypes.length, typeUpdates.length); i++) {
        const typeId = existingTypes[i].id;
        const update = typeUpdates[i];
        
        await pool.query(
          "UPDATE service_types SET name = ?, description = ? WHERE id = ?",
          [update.name, update.description, typeId]
        );
        
        console.log(`Tipo de serviço ID ${typeId} atualizado para: ${update.name}`);
      }
      
      // Se tivermos menos tipos que o necessário, adicionar os faltantes
      if (existingTypes.length < typeUpdates.length) {
        for (let i = existingTypes.length; i < typeUpdates.length; i++) {
          const update = typeUpdates[i];
          await pool.query(
            "INSERT INTO service_types (name, description, base_price) VALUES (?, ?, ?)",
            [update.name, update.description, 100 + i * 50]
          );
          console.log(`Novo tipo de serviço adicionado: ${update.name}`);
        }
      }
    }
    
    // Verificar tipos criados
    const [types] = await pool.query("SELECT * FROM service_types");
    console.log("Tipos de serviço atualizados:");
    types.forEach(type => {
      console.log(`- ID ${type.id}: ${type.name}`);
    });
    
    // Verificar se a tabela vehicles existe
    const [vehiclesResult] = await pool.query("SHOW TABLES LIKE 'vehicles'");
    if (!vehiclesResult.length) {
      console.log("Criando tabela vehicles...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          make VARCHAR(255) NOT NULL,
          model VARCHAR(255) NOT NULL,
          color VARCHAR(255),
          license_plate VARCHAR(255),
          vin VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      console.log("Tabela vehicles criada com sucesso");
    }
    
    // Verificar se a tabela services existe
    const [servicesResult] = await pool.query("SHOW TABLES LIKE 'services'");
    if (!servicesResult.length) {
      console.log("Criando tabela services...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS services (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          vehicle_id INT NOT NULL,
          service_type_id INT NOT NULL,
          technician_id INT,
          status VARCHAR(50) NOT NULL,
          scheduled_date DATETIME,
          start_date DATETIME,
          completion_date DATETIME,
          location_type VARCHAR(50),
          address TEXT,
          latitude DOUBLE,
          longitude DOUBLE,
          price DECIMAL(10, 2),
          administrative_fee DECIMAL(10, 2),
          total DECIMAL(10, 2),
          notes TEXT,
          description TEXT,
          dents INT,
          size INT,
          is_vertical BOOLEAN,
          is_aluminum BOOLEAN,
          aw_value DECIMAL(10, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
          FOREIGN KEY (service_type_id) REFERENCES service_types(id)
        )
      `);
      console.log("Tabela services criada com sucesso");
    }
    
    console.log("Verificação de tabelas essenciais concluída");
  } catch (error) {
    console.error("Erro ao criar tabelas essenciais:", error);
    throw error;
  }
};

// Usar MemoryStore como alternativa temporária para sessões até configurar MySQL
const MemoryStore = memorystore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
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
  
  // Expense methods
  listExpenses(): Promise<Expense[]>;
  createExpense(expense: Partial<Expense>): Promise<Expense>;

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
    try {
      console.log("Criando orçamento com dados:", insertBudget);
      
      // Em MySQL, não podemos usar returning()
      const result = await db.insert(budgets).values(insertBudget);
      
      console.log("Resultado da inserção:", result);
      
      const budgetId = Number(result?.insertId);
      
      if (isNaN(budgetId) || budgetId <= 0) {
        throw new Error(`ID de orçamento inválido ou não retornado pelo banco: ${budgetId}`);
      }
      
      console.log(`Orçamento criado com ID: ${budgetId}, buscando dados completos`);
      
      // Buscar o orçamento recém-criado
      const budget = await this.getBudget(budgetId);
      
      if (!budget) {
        throw new Error(`Orçamento criado mas não encontrado com ID ${budgetId}`);
      }
      
      return budget;
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      throw error;
    }
  }
  
  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    try {
      console.log(`Atualizando orçamento ID ${id} com dados:`, budgetData);
      
      // Em MySQL, não podemos usar returning()
      await db.update(budgets)
        .set(budgetData)
        .where(eq(budgets.id, id));
      
      // Buscar o orçamento atualizado
      const updatedBudget = await this.getBudget(id);
      
      if (!updatedBudget) {
        console.log(`Orçamento ID ${id} não encontrado após atualização`);
        return undefined;
      }
      
      return updatedBudget;
    } catch (error) {
      console.error(`Erro ao atualizar orçamento ID ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    try {
      console.log(`Excluindo orçamento ID ${id}`);
      
      // Em MySQL, não temos rowCount
      const result = await db.delete(budgets).where(eq(budgets.id, id));
      
      // Verificar se a exclusão foi bem-sucedida através de affectedRows
      return result && (result as any).rowsAffected > 0;
    } catch (error) {
      console.error(`Erro ao excluir orçamento ID ${id}:`, error);
      return false;
    }
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
    try {
      console.log("Criando usuário com dados:", insertUser);
      
      // Em MySQL, não podemos usar returning()
      const result = await db.insert(users).values(insertUser);
      
      console.log("Resultado da inserção:", result);
      
      // O resultado é um array, com o primeiro elemento sendo o ResultSetHeader
      const insertResult = Array.isArray(result) ? result[0] : result;
      const userId = Number(insertResult?.insertId);
      
      if (isNaN(userId) || userId <= 0) {
        throw new Error(`ID de usuário inválido ou não retornado pelo banco: ${userId}`);
      }
      
      console.log(`Usuário criado com ID: ${userId}, buscando dados completos`);
      
      // Buscar o usuário recém-criado
      const user = await this.getUser(userId);
      
      if (!user) {
        throw new Error(`Usuário criado mas não encontrado com ID ${userId}`);
      }
      
      return user;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
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
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`Excluindo usuário ID ${id}`);
      
      // Verificar se existem associações gestor-cliente para este gestor
      if (managerClientAssignments) {
        console.log(`Removendo associações de clientes para o gestor ID ${id}`);
        await db.delete(managerClientAssignments)
          .where(eq(managerClientAssignments.manager_id, id));
      }
      
      // Em MySQL, não temos rowCount
      const result = await db.delete(users).where(eq(users.id, id));
      
      // Verificar se a exclusão foi bem-sucedida
      // O resultado pode ser { affectedRows: number } ou outro formato dependendo do driver
      const affectedRows = Array.isArray(result) 
        ? result[0]?.affectedRows 
        : (result as any)?.affectedRows;
      
      const success = affectedRows > 0;
      console.log(`Usuário ID ${id} excluído com sucesso: ${success}`);
      
      return success;
    } catch (error) {
      console.error(`Erro ao excluir usuário ID ${id}:`, error);
      return false;
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
    try {
      // Verificar se o ID é válido
      if (!id || isNaN(id) || id <= 0) {
        console.error(`ID de cliente inválido: ${id}`);
        return undefined;
      }
      
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      return client;
    } catch (error) {
      console.error(`Erro ao obter cliente ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      console.log("Criando cliente simplificado com dados:", insertClient);
      
      // Garantir que não existam propriedades undefined ou nulas
      const cleanData = Object.entries(insertClient).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.log("Dados limpos:", cleanData);
      
      // Tentar usar query direta para o MySQL
      try {
        // Preparar valores para query
        const fields = Object.keys(cleanData).join(', ');
        const placeholders = Object.keys(cleanData).map(() => '?').join(', ');
        const values = Object.values(cleanData);
        
        console.log(`Executando inserção direta: INSERT INTO clients (${fields}) VALUES (${placeholders})`);
        console.log("Valores:", values);
        
        // Executar query usando a conexão direta
        const query = `INSERT INTO clients (${fields}) VALUES (${placeholders})`;
        const result = await pool.query(query, values);
        
        console.log("Resultado da inserção via conexão direta:", result);
        
        // Obter ID inserido
        const insertId = result[0]?.insertId;
        
        if (!insertId) {
          throw new Error("Falha ao obter ID via inserção direta");
        }
        
        const clientId = Number(insertId);
        console.log(`Cliente criado com ID via inserção direta: ${clientId}`);
        
        // Buscar cliente criado
        const [clientResult] = await pool.query(`SELECT * FROM clients WHERE id = ?`, [clientId]);
        const client = clientResult[0];
        
        if (!client) {
          throw new Error(`Cliente criado mas não encontrado com ID ${clientId}`);
        }
        
        console.log("Cliente recuperado com sucesso:", client);
        return client as Client;
      } catch (directError) {
        console.error("Erro na inserção direta:", directError);
        
        // Fallback para Drizzle ORM
        console.log("Tentando com Drizzle ORM como fallback");
        const result = await db.insert(clients).values(cleanData);
        
        console.log("Resultado da inserção via Drizzle:", result);
        
        if (!result || !result.insertId) {
          throw new Error("Falha ao inserir cliente. ID não retornado.");
        }
        
        // Obter o ID do cliente recém-criado
        const clientId = Number(result.insertId);
        console.log(`Cliente criado com ID via Drizzle: ${clientId}`);
        
        // Buscar o cliente usando o ID
        const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
        
        if (!client) {
          // Criar objeto mínimo
          return {
            id: clientId,
            name: cleanData.name || '',
            email: cleanData.email || null,
            phone: cleanData.phone || null,
            address: cleanData.address || null,
            created_at: new Date()
          } as Client;
        }
        
        return client;
      }
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
  
  async deleteClient(id: number): Promise<boolean> {
    try {
      console.log(`Excluindo cliente ID: ${id}`);
      
      // Verificar se o cliente existe
      const client = await this.getClient(id);
      if (!client) {
        console.log(`Cliente ID ${id} não encontrado para exclusão`);
        return false;
      }
      
      // Primeiro, verificar se a coluna "deleted" existe na tabela
      try {
        // Ao invés de excluir, marcar o cliente como excluído adicionando um campo 'deleted'
        // Esta é uma exclusão lógica (soft delete)
        await db.update(clients)
          .set({ 
            name: `${client.name} [EXCLUÍDO]`,
            email: client.email ? `${client.email}.deleted` : null,
            deleted: 1 // Usando 1 (número) em vez de true (booleano)
          })
          .where(eq(clients.id, id));
          
        console.log(`Cliente ID ${id} marcado como excluído com sucesso`);
        return true;
      } catch (updateError) {
        console.log(`Erro ao atualizar o status deleted do cliente. Tentando adicionar a coluna...`, updateError);
        
        try {
          // Se falhou, talvez a coluna 'deleted' não exista. Tente criar e tentar novamente.
          await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0`);
          console.log(`Coluna 'deleted' adicionada à tabela clients`);
          
          // Agora tente atualizar novamente
          await pool.query(`UPDATE clients SET name = ?, email = ?, deleted = 1 WHERE id = ?`, 
                          [`${client.name} [EXCLUÍDO]`, 
                           client.email ? `${client.email}.deleted` : null, 
                           id]);
          
          console.log(`Cliente ID ${id} marcado como excluído com sucesso após adicionar coluna`);
          return true;
        } catch (alterError) {
          console.error(`Erro ao adicionar coluna 'deleted':`, alterError);
          return false;
        }
      }
    } catch (error) {
      console.error(`Erro ao excluir cliente ID ${id}:`, error);
      return false;
    }
  }
  
  async listClients(): Promise<Client[]> {
    try {
      // Precisamos selecionar apenas campos que existem no MySQL
      // e ajustar o resultado para incluir campos que podem não existir na tabela
      console.log("Selecionando clientes apenas com colunas existentes");
      
      // Verificar se a coluna 'deleted' existe na tabela 'clients'
      try {
        await pool.query("SELECT deleted FROM clients LIMIT 1");
        console.log("Coluna 'deleted' encontrada na tabela 'clients'");
        
        // Se a coluna existe, filtra os clientes não excluídos
        const basicResult = await db.select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          created_at: clients.created_at
        })
        .from(clients)
        .where(
          or(
            sql`${clients.deleted} IS NULL`,
            eq(clients.deleted, 0)
          )
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
        console.log("Coluna 'deleted' não existe, adicionando a coluna e tentando novamente");
        
        try {
          // Adicionar a coluna 'deleted' se ela não existir
          await pool.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0");
          console.log("Coluna 'deleted' adicionada com sucesso");
          
          // Tentar novamente com a coluna adicionada
          // Filtrar para retornar apenas clientes não excluídos (ou seja, onde o nome não contém [EXCLUÍDO])
          const [basicResult] = await pool.query(
            `SELECT id, name, email, phone, address, created_at 
             FROM clients 
             WHERE deleted = 0 OR deleted IS NULL`
          );
          
          console.log(`Encontrados ${basicResult.length} clientes não excluídos`);
          
          // Adicionar campos ausentes ao resultado
          const result = basicResult.map(client => ({
            ...client,
            city: null,
            state: null,
            zip: null
          }));
          
          return result;
        } catch (alterError) {
          console.error("Erro ao adicionar coluna 'deleted':", alterError);
          
          // Fallback: filtrar pelo nome para encontrar clientes não excluídos
          const [basicResult] = await pool.query(
            `SELECT id, name, email, phone, address, created_at 
             FROM clients 
             WHERE name NOT LIKE '%[EXCLUÍDO]%'`
          );
          
          console.log(`Usando filtro de nome, encontrados ${basicResult.length} clientes não excluídos`);
          
          // Adicionar campos ausentes ao resultado
          const result = basicResult.map(client => ({
            ...client,
            city: null,
            state: null,
            zip: null
          }));
          
          return result;
        }
      }
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      return [];
    }
  }
  
  async searchClients(query: string): Promise<Client[]> {
    try {
      // Verificar se a coluna 'deleted' existe na tabela 'clients'
      try {
        await pool.query("SELECT deleted FROM clients LIMIT 1");
        console.log("Coluna 'deleted' encontrada na tabela 'clients' (busca)");
        
        // Se a coluna existe, filtra os clientes não excluídos
        const basicResult = await db.select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          created_at: clients.created_at
        })
        .from(clients)
        .where(
          and(
            like(clients.name, `%${query}%`),
            or(
              sql`${clients.deleted} IS NULL`,
              eq(clients.deleted, 0)
            )
          )
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
        console.log("Coluna 'deleted' não existe, adicionando a coluna e tentando novamente (busca)");
        
        try {
          // Adicionar a coluna 'deleted' se ela não existir
          await pool.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0");
          console.log("Coluna 'deleted' adicionada com sucesso (busca)");
          
          // Buscar novamente incluindo a coluna deleted
          const [basicResult] = await pool.query(
            `SELECT id, name, email, phone, address, created_at 
             FROM clients 
             WHERE name LIKE ? AND (deleted = 0 OR deleted IS NULL)`,
            [`%${query}%`]
          );
          
          console.log(`Encontrados ${basicResult.length} clientes na busca após adicionar coluna deleted`);
          
          // Adicionar campos ausentes ao resultado
          const result = basicResult.map(client => ({
            ...client,
            city: null,
            state: null,
            zip: null
          }));
          
          return result;
        } catch (alterError) {
          console.error("Erro ao adicionar coluna 'deleted' (busca):", alterError);
          
          // Fallback: filtrar pelo nome para excluir clientes marcados como excluídos
          const [basicResult] = await pool.query(
            `SELECT id, name, email, phone, address, created_at 
             FROM clients 
             WHERE name LIKE ? AND name NOT LIKE '%[EXCLUÍDO]%'`,
            [`%${query}%`]
          );
          
          console.log(`Usando filtro de nome, encontrados ${basicResult.length} clientes na busca`);
          
          // Adicionar campos ausentes ao resultado
          const result = basicResult.map(client => ({
            ...client,
            city: null,
            state: null,
            zip: null
          }));
          
          return result;
        }
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return [];
    }
  }
  
  // Vehicle methods
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    try {
      // Verificar se o ID é válido
      if (!id || isNaN(id) || id <= 0) {
        console.error(`ID de veículo inválido: ${id}`);
        return undefined;
      }
      
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
      return vehicle;
    } catch (error) {
      console.error(`Erro ao obter veículo ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    try {
      console.log("Criando veículo com dados:", insertVehicle);
      
      // Garantir que não existam propriedades undefined ou nulas
      const cleanData = Object.entries(insertVehicle).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.log("Dados limpos:", cleanData);
      
      // Tentar usar query direta para o MySQL
      try {
        // Verificar se a tabela vehicles existe
        const [tablesResult] = await pool.query("SHOW TABLES LIKE 'vehicles'");
        if (!tablesResult.length) {
          console.log("Tabela de veículos não existe, criando...");
          await pool.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
              id INT AUTO_INCREMENT PRIMARY KEY,
              client_id INT NOT NULL,
              make VARCHAR(255) NOT NULL,
              model VARCHAR(255) NOT NULL,
              color VARCHAR(255),
              license_plate VARCHAR(255),
              vin VARCHAR(255),
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (client_id) REFERENCES clients(id)
            )
          `);
          console.log("Tabela de veículos criada com sucesso");
        }
      
        // Preparar valores para query
        const fields = Object.keys(cleanData).join(', ');
        const placeholders = Object.keys(cleanData).map(() => '?').join(', ');
        const values = Object.values(cleanData);
        
        console.log(`Executando inserção direta: INSERT INTO vehicles (${fields}) VALUES (${placeholders})`);
        console.log("Valores:", values);
        
        // Executar query usando a conexão direta
        const query = `INSERT INTO vehicles (${fields}) VALUES (${placeholders})`;
        const [resultHeader] = await pool.query(query, values);
        
        console.log("Resultado da inserção via conexão direta:", JSON.stringify(resultHeader));
        
        // No MySQL, o insertId é uma propriedade direta do objeto de resultado
        const insertId = resultHeader?.insertId;
        
        console.log("InsertId extraído:", insertId, "Tipo:", typeof insertId);
        
        if (insertId === undefined || insertId === null) {
          throw new Error("Falha ao obter ID via inserção direta");
        }
        
        const vehicleId = Number(insertId);
        
        if (isNaN(vehicleId) || vehicleId <= 0) {
          throw new Error(`ID de veículo inválido: ${vehicleId}`);
        }
        console.log(`Veículo criado com ID via inserção direta: ${vehicleId}`);
        
        // Buscar veículo criado
        const [vehicleResult] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [vehicleId]);
        const vehicle = vehicleResult[0];
        
        if (!vehicle) {
          throw new Error(`Veículo criado mas não encontrado com ID ${vehicleId}`);
        }
        
        console.log("Veículo recuperado com sucesso:", vehicle);
        return vehicle as Vehicle;
      } catch (directError) {
        console.error("Erro na inserção direta:", directError);
        
        // Fallback para Drizzle ORM
        console.log("Tentando com Drizzle ORM como fallback");
        const result = await db.insert(vehicles).values(cleanData);
        
        console.log("Resultado da inserção via Drizzle:", result);
        
        if (!result || !result.insertId) {
          throw new Error("Falha ao inserir veículo. ID não retornado.");
        }
        
        // Obter o ID do veículo recém-criado
        const vehicleId = Number(result.insertId);
        console.log(`Veículo criado com ID via Drizzle: ${vehicleId}`);
        
        // Buscar o veículo usando o ID
        const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId));
        
        if (!vehicle) {
          // Criar objeto mínimo
          return {
            id: vehicleId,
            client_id: cleanData.client_id,
            make: cleanData.make || '',
            model: cleanData.model || '',
            color: cleanData.color || null,
            license_plate: cleanData.license_plate || null,
            vin: cleanData.vin || null,
            notes: cleanData.notes || null,
            created_at: new Date()
          } as Vehicle;
        }
        
        return vehicle;
      }
    } catch (error) {
      console.error("Erro ao criar veículo:", error);
      throw error;
    }
  }
  
  async listVehiclesByClient(clientId: number): Promise<Vehicle[]> {
    try {
      console.log(`Buscando veículos para cliente ID: ${clientId}`);
      
      // Verificar se a tabela vehicles existe
      const [tablesResult] = await pool.query("SHOW TABLES LIKE 'vehicles'");
      if (!tablesResult.length) {
        console.log("Tabela de veículos não existe, retornando lista vazia");
        return [];
      }
      
      // Buscar veículos usando query direta
      const [result] = await pool.query(`SELECT * FROM vehicles WHERE client_id = ?`, [clientId]);
      console.log(`Encontrados ${result.length} veículos para cliente ID ${clientId}`);
      
      return result as Vehicle[];
    } catch (error) {
      console.error(`Erro ao listar veículos para cliente ID ${clientId}:`, error);
      
      // Tentar fallback para Drizzle ORM
      try {
        console.log("Tentando listar veículos com Drizzle ORM como fallback");
        return db.select().from(vehicles).where(eq(vehicles.client_id, clientId));
      } catch (drizzleError) {
        console.error("Erro no fallback para Drizzle:", drizzleError);
        return [];
      }
    }
  }
  
  // Expense methods
  async listExpenses(): Promise<Expense[]> {
    try {
      return db.select().from(expenses).orderBy(desc(expenses.date));
    } catch (error) {
      console.error("Error listing expenses:", error);
      return [];
    }
  }
  
  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    try {
      const result = await db.insert(expenses).values(expenseData);
      const expenseId = Number(result.insertId);
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
      return expense;
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  }
  
  // Service Type methods
  async getServiceType(id: number): Promise<ServiceType | undefined> {
    const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
    return serviceType;
  }
  
  async createServiceType(insertServiceType: InsertServiceType): Promise<ServiceType> {
    try {
      console.log("Criando tipo de serviço com dados:", insertServiceType);
      
      const result = await db.insert(serviceTypes).values(insertServiceType);
      const serviceTypeId = Number(result.insertId);
      
      if (!serviceTypeId || isNaN(serviceTypeId) || serviceTypeId <= 0) {
        throw new Error(`ID de tipo de serviço inválido ou não retornado pelo banco de dados: ${serviceTypeId}`);
      }
      
      console.log(`Tipo de serviço criado com ID: ${serviceTypeId}, buscando dados completos`);
      
      const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, serviceTypeId));
      
      if (!serviceType) {
        throw new Error(`Tipo de serviço criado mas não encontrado com ID ${serviceTypeId}`);
      }
      
      console.log("Tipo de serviço recuperado com sucesso:", serviceType);
      return serviceType;
    } catch (error) {
      console.error("Erro ao criar tipo de serviço:", error);
      throw error;
    }
  }
  
  async listServiceTypes(): Promise<ServiceType[]> {
    return db.select().from(serviceTypes);
  }
  
  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    try {
      // Verificar se o ID é válido
      if (!id || isNaN(id) || id <= 0) {
        console.error(`ID de serviço inválido: ${id}`);
        return undefined;
      }
      
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
        price: services.price,              // Coluna adicionada
        administrative_fee: services.administrative_fee,  // Coluna adicionada
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
      console.error(`Erro ao obter serviço ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createService(insertService: InsertService): Promise<Service> {
    try {
      console.log("Criando serviço com dados:", insertService);
      
      // Clone o objeto para não modificar o original
      const serviceData = { ...insertService };
      
      // Converter campos de data de string para Date para o MySQL
      if (serviceData.scheduled_date && typeof serviceData.scheduled_date === 'string') {
        serviceData.scheduled_date = new Date(serviceData.scheduled_date);
      }
      
      if (serviceData.start_date && typeof serviceData.start_date === 'string') {
        serviceData.start_date = new Date(serviceData.start_date);
      }
      
      if (serviceData.completion_date && typeof serviceData.completion_date === 'string') {
        serviceData.completion_date = new Date(serviceData.completion_date);
      }
      
      // Garantir que não existam propriedades undefined ou nulas que possam causar problemas
      const cleanData = Object.entries(serviceData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.log("Dados formatados para DB:", cleanData);
      
      // Tentar usar query direta para o MySQL
      try {
        // Verificar se a tabela services existe
        const [tablesResult] = await pool.query("SHOW TABLES LIKE 'services'");
        if (!tablesResult.length) {
          console.log("Tabela de serviços não existe, criando...");
          await pool.query(`
            CREATE TABLE IF NOT EXISTS services (
              id INT AUTO_INCREMENT PRIMARY KEY,
              client_id INT NOT NULL,
              vehicle_id INT NOT NULL,
              service_type_id INT NOT NULL,
              technician_id INT,
              status VARCHAR(50) NOT NULL,
              scheduled_date DATETIME,
              start_date DATETIME,
              completion_date DATETIME,
              location_type VARCHAR(50),
              address TEXT,
              latitude DOUBLE,
              longitude DOUBLE,
              price DECIMAL(10, 2),
              administrative_fee DECIMAL(10, 2),
              total DECIMAL(10, 2),
              notes TEXT,
              description TEXT,
              dents INT,
              size INT,
              is_vertical BOOLEAN,
              is_aluminum BOOLEAN,
              aw_value DECIMAL(10, 2),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (client_id) REFERENCES clients(id),
              FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
              FOREIGN KEY (service_type_id) REFERENCES service_types(id)
            )
          `);
          console.log("Tabela de serviços criada com sucesso");
        }
        
        // Preparar valores para query
        const fields = Object.keys(cleanData).join(', ');
        const placeholders = Object.keys(cleanData).map(() => '?').join(', ');
        const values = Object.values(cleanData);
        
        console.log(`Executando inserção direta: INSERT INTO services (${fields}) VALUES (${placeholders})`);
        console.log("Valores:", values);
        
        // Executar query usando a conexão direta
        const query = `INSERT INTO services (${fields}) VALUES (${placeholders})`;
        const [resultHeader] = await pool.query(query, values);
        
        console.log("Resultado da inserção via conexão direta:", JSON.stringify(resultHeader));
        
        // No MySQL, o insertId é uma propriedade direta do objeto de resultado
        const insertId = resultHeader?.insertId;
        
        console.log("InsertId extraído:", insertId, "Tipo:", typeof insertId);
        
        if (insertId === undefined || insertId === null) {
          throw new Error("Falha ao obter ID via inserção direta");
        }
        
        const serviceId = Number(insertId);
        
        if (isNaN(serviceId) || serviceId <= 0) {
          throw new Error(`ID de serviço inválido: ${serviceId}`);
        }
        
        console.log(`Serviço criado com ID via inserção direta: ${serviceId}`);
        
        // Buscar serviço criado
        const [serviceResult] = await pool.query(`SELECT * FROM services WHERE id = ?`, [serviceId]);
        const service = serviceResult[0];
        
        if (!service) {
          throw new Error(`Serviço criado mas não encontrado com ID ${serviceId}`);
        }
        
        console.log("Serviço recuperado com sucesso:", service);
        return service as Service;
      } catch (directError) {
        console.error("Erro na inserção direta:", directError);
        
        // Fallback para Drizzle ORM
        console.log("Tentando com Drizzle ORM como fallback");
        
        // No MySQL não temos o método returning()
        const result = await db.insert(services).values(cleanData);
        
        console.log("Resultado da inserção via Drizzle:", result);
        
        const serviceId = Number(result?.insertId);
        
        if (isNaN(serviceId) || serviceId <= 0) {
          throw new Error(`ID de serviço inválido ou não retornado pelo banco de dados: ${serviceId}`);
        }
        
        console.log(`Serviço criado com ID: ${serviceId}, buscando dados completos`);
        
        // Buscar o serviço diretamente
        const service = await this.getService(serviceId);
        
        if (!service) {
          throw new Error(`Serviço criado mas não encontrado com ID ${serviceId}`);
        }
        
        console.log("Serviço recuperado com sucesso:", service);
        return service;
      }
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      throw error;
    }
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
      // No MySQL não temos o método returning()
      await db.update(services)
        .set(updatedData)
        .where(eq(services.id, id));
      
      // Buscamos o serviço atualizado
      return await this.getService(id);
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
        price: services.price,              // Coluna adicionada
        administrative_fee: services.administrative_fee,  // Coluna adicionada
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
    try {
      console.log("Adicionando foto de serviço com dados:", insertPhoto);
      
      // Validar dados essenciais
      if (!insertPhoto.service_id || !insertPhoto.photo_url || !insertPhoto.photo_type) {
        throw new Error("Dados incompletos para adicionar foto. Necessário: service_id, photo_url e photo_type");
      }
      
      // Verificar se a tabela service_photos existe
      const [tableResult] = await pool.query("SHOW TABLES LIKE 'service_photos'");
      if (!tableResult.length) {
        console.log("Tabela service_photos não existe, criando...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS service_photos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            service_id INT NOT NULL,
            photo_url VARCHAR(255) NOT NULL,
            photo_type VARCHAR(50),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
          )
        `);
        console.log("Tabela service_photos criada com sucesso");
      }
      
      // Verificar se o serviço existe
      const [serviceExists] = await pool.query(
        "SELECT id FROM services WHERE id = ?", 
        [insertPhoto.service_id]
      );
      
      if (!serviceExists || !serviceExists.length) {
        throw new Error(`Serviço com ID ${insertPhoto.service_id} não encontrado`);
      }
      
      // Verificar se esta URL de foto já existe para este serviço (evitar duplicação)
      const [existingPhoto] = await pool.query(
        "SELECT * FROM service_photos WHERE service_id = ? AND photo_url = ?",
        [insertPhoto.service_id, insertPhoto.photo_url]
      );
      
      // Se a foto já existir, retorne-a em vez de criar uma nova
      if (existingPhoto && existingPhoto.length > 0) {
        console.log("Foto já existe para este serviço, retornando existente:", existingPhoto[0]);
        return existingPhoto[0] as ServicePhoto;
      }
      
      // Preparar valores para query
      const fields = Object.keys(insertPhoto).join(', ');
      const placeholders = Object.keys(insertPhoto).map(() => '?').join(', ');
      const values = Object.values(insertPhoto);
      
      console.log(`Executando inserção: INSERT INTO service_photos (${fields})`);
      
      try {
        // Tentar inserção direta via MySQL
        const query = `INSERT INTO service_photos (${fields}) VALUES (${placeholders})`;
        const [resultHeader] = await pool.query(query, values);
        
        // No MySQL, o insertId é uma propriedade direta do objeto de resultado
        const insertId = resultHeader?.insertId;
        
        if (insertId === undefined || insertId === null) {
          throw new Error("Falha ao obter ID da foto inserida");
        }
        
        const photoId = Number(insertId);
        
        if (isNaN(photoId) || photoId <= 0) {
          throw new Error(`ID de foto inválido: ${photoId}`);
        }
        
        console.log(`Foto criada com sucesso. ID: ${photoId}`);
        
        // Buscar foto criada para retornar todos os dados
        const [photoResult] = await pool.query("SELECT * FROM service_photos WHERE id = ?", [photoId]);
        
        if (!photoResult || !photoResult.length) {
          throw new Error(`Foto criada mas não encontrada com ID ${photoId}`);
        }
        
        const photo = photoResult[0];
        console.log("Foto recuperada com sucesso:", photo);
        return photo as ServicePhoto;
      } catch (directError: any) {
        // Verificar erro específico de restrição de chave estrangeira
        if (directError.code === 'ER_NO_REFERENCED_ROW_2') {
          throw new Error(`Erro de referência: Serviço com ID ${insertPhoto.service_id} não encontrado`);
        }
        
        console.error("Erro na inserção direta de foto:", directError);
        
        // Apenas como último recurso, tentar com o Drizzle ORM
        console.log("Tentando com Drizzle ORM como último recurso");
        
        const result = await db.insert(servicePhotos).values(insertPhoto);
        const photoId = Number(result?.insertId);
        
        if (!photoId || isNaN(photoId) || photoId <= 0) {
          throw new Error(`ID de foto inválido ou não retornado pelo banco de dados: ${photoId}`);
        }
        
        // Buscar a foto recém inserida
        const [photo] = await db.select().from(servicePhotos).where(eq(servicePhotos.id, photoId));
        
        if (!photo) {
          throw new Error(`Foto adicionada mas não encontrada com ID ${photoId}`);
        }
        
        return photo;
      }
    } catch (error: any) {
      console.error("Erro ao adicionar foto de serviço:", error.message);
      throw error;
    }
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
      // No MySQL, não temos o método returning()
      const result = await db.delete(servicePhotos).where(eq(servicePhotos.id, photoId));
      
      // Se a remoção no banco de dados for bem-sucedida, tente remover o arquivo físico
      if (result.rowsAffected > 0) {
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
      price: services.price,              // Coluna adicionada
      administrative_fee: services.administrative_fee,  // Coluna adicionada
      total: services.total,
      notes: services.notes,
      dents: services.dents,
      size: services.size,
      is_vertical: services.is_vertical,
      is_aluminum: services.is_aluminum,
      created_at: services.created_at
    };
    
    const allServices = await db.select(selectColumns).from(services)
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
      sum + (service.price || 0), 0);
    
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
        price: services.price,              // Coluna adicionada
        administrative_fee: services.administrative_fee,  // Coluna adicionada
        total: services.total,
        notes: services.notes,
        dents: services.dents,
        size: services.size,
        is_vertical: services.is_vertical,
        is_aluminum: services.is_aluminum,
        created_at: services.created_at
      };
      
      const completedServices = await db.select(selectColumns)
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
        // Para técnicos: apenas a soma do valor do serviço (price)
        totalRevenue = completedServices.reduce((sum, service) => 
          sum + (service.price || 0), 0);
      } else {
        // Para administradores: soma do valor total do serviço (total ou price)
        totalRevenue = completedServices.reduce((sum, service) => 
          sum + (service.total || service.price || 0), 0);
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
      total: sql<number>`SUM(${services.price})`
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
          price: services.price,              // Coluna adicionada
          administrative_fee: services.administrative_fee,  // Coluna adicionada
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
    try {
      console.log(`Criando solicitação de pagamento para técnico ${technicianId} com serviços:`, serviceIds);
      
      // No MySQL, não podemos usar .returning() como no PostgreSQL
      // Vamos usar uma abordagem mais direta com pool.query
      
      // Primeiro, inserimos o registro principal de pedido de pagamento
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await pool.query(
        "INSERT INTO payment_requests (technician_id, status, created_at) VALUES (?, ?, ?)",
        [technicianId, "aguardando_aprovacao", now]
      );
      
      // Verificamos e obtemos o ID gerado
      const paymentRequestId = result.insertId;
      console.log(`Pedido de pagamento criado com ID: ${paymentRequestId}`);
      
      if (!paymentRequestId) {
        throw new Error("Falha ao criar pedido de pagamento: ID não retornado");
      }
      
      // Em seguida, adicionamos os itens do pedido
      if (serviceIds.length > 0) {
        // Para cada serviço, criamos um item de pedido
        for (const serviceId of serviceIds) {
          await pool.query(
            "INSERT INTO payment_request_items (payment_request_id, service_id) VALUES (?, ?)",
            [paymentRequestId, serviceId]
          );
          
          // E atualizamos o status do serviço
          await pool.query(
            "UPDATE services SET status = ? WHERE id = ?",
            ["aguardando_pagamento", serviceId]
          );
        }
        
        console.log(`${serviceIds.length} serviços associados ao pedido de pagamento ${paymentRequestId}`);
      }
      
      // Buscamos o pedido completo para retornar
      const [paymentRequests] = await pool.query(
        "SELECT * FROM payment_requests WHERE id = ?",
        [paymentRequestId]
      );
      
      if (!paymentRequests.length) {
        throw new Error(`Pedido de pagamento ${paymentRequestId} não encontrado após criação`);
      }
      
      return paymentRequests[0] as PaymentRequest;
    } catch (error) {
      console.error("Erro ao criar pedido de pagamento:", error);
      throw error;
    }
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
    
    try {
      // Incluir detalhes de pagamento se fornecidos
      const updateData: any = { status };
      if (paymentDetails && status === "pago") {
        // Converter detalhes de pagamento para JSON string para evitar erros
        updateData.payment_details = JSON.stringify(paymentDetails);
        updateData.payment_date = new Date();
        console.log("Dados a serem atualizados:", updateData);
      }
      
      // MySQL não suporta returning() como no PostgreSQL
      // Usar pool.query diretamente
      await pool.query(
        "UPDATE payment_requests SET ? WHERE id = ?",
        [updateData, id]
      );
      
      // Buscar os dados atualizados
      const [updatedRequests] = await pool.query(
        "SELECT * FROM payment_requests WHERE id = ?",
        [id]
      );
      
      if (!updatedRequests || !updatedRequests.length) {
        console.error(`Pedido de pagamento ${id} não encontrado após atualização`);
        return undefined;
      }
      
      const updatedRequest = updatedRequests[0];
      
      console.log("Retorno da atualização:", updatedRequest);
      
      // Se aprovado, atualizar todos os serviços associados para "faturado"
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
      
      // Se pago, atualizar todos os serviços associados para "pago"
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
                technicianValue += serviceData.price || 0; // Usar price em vez de aw_value
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
      
      // Se rejeitado, atualizar todos os serviços associados de volta para "completed"
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
    } catch (error) {
      console.error("Erro ao atualizar status do pedido de pagamento:", error);
      throw error;
    }
  }
  
  // Métodos para gestão de clientes por gestor
  async assignClientToManager(managerId: number, clientId: number): Promise<ManagerClientAssignment> {
    try {
      // Verificar se a atribuição já existe
      const existingAssignments = await db.select().from(managerClientAssignments)
        .where(and(
          eq(managerClientAssignments.manager_id, managerId),
          eq(managerClientAssignments.client_id, clientId)
        ));
      
      if (existingAssignments.length > 0) {
        return existingAssignments[0];
      }
      
      // MySQL não suporta returning() como no PostgreSQL
      // Usar pool.query diretamente
      await pool.query(
        "INSERT INTO manager_client_assignments (manager_id, client_id) VALUES (?, ?)",
        [managerId, clientId]
      );
      
      // Buscar a atribuição recém-criada
      const [assignments] = await pool.query(
        "SELECT * FROM manager_client_assignments WHERE manager_id = ? AND client_id = ?",
        [managerId, clientId]
      );
      
      if (!assignments || !assignments.length) {
        throw new Error("Falha ao criar atribuição de cliente para gestor");
      }
      
      return assignments[0];
    } catch (error) {
      console.error("Erro ao atribuir cliente ao gestor:", error);
      throw error;
    }
  }
  
  async removeClientFromManager(managerId: number, clientId: number): Promise<boolean> {
    try {
      // MySQL não suporta returning() como no PostgreSQL
      // Usar pool.query diretamente
      const [result] = await pool.query(
        "DELETE FROM manager_client_assignments WHERE manager_id = ? AND client_id = ?",
        [managerId, clientId]
      );
      
      // MySQL retorna objeto com affectedRows que indica quantas linhas foram afetadas
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Erro ao remover cliente do gestor:", error);
      throw error;
    }
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
    try {
      // Busca todos os gestores atribuídos a um cliente específico
      const assignments = await db.select({
        manager: users
      })
      .from(managerClientAssignments)
      .innerJoin(users, eq(managerClientAssignments.manager_id, users.id))
      .where(eq(managerClientAssignments.client_id, clientId));
      
      return assignments.map(a => a.manager);
    } catch (error) {
      console.error("Erro ao buscar gestores do cliente:", error);
      return [];
    }
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
        (sum, service) => {
          console.log(`Serviço em pedido de pagamento ID ${service.id}:`, {
            price: service.price,
            total: service.total
          });
          return sum + (service.price || 0);
        }, 
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
      .reduce((sum, service) => {
        console.log(`Serviço concluído sem solicitação ID ${service.id}:`, {
          price: service.price,
          total: service.total
        });
        return sum + (service.price || 0);
      }, 0);
    
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
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { db } from "./db";
import { desc } from "drizzle-orm";
import { 
  insertUserSchema, 
  insertClientSchema, 
  insertVehicleSchema, 
  insertServiceSchema, 
  insertServicePhotoSchema,
  insertEventTypeSchema,
  insertEventSchema,
  insertBudgetSchema,
  expenses
} from "@shared/schema";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create subdirectories for service photos
const beforeDir = path.join(UPLOADS_DIR, "before");
const afterDir = path.join(UPLOADS_DIR, "after");
const serviceDir = path.join(UPLOADS_DIR, "service");

// Ensure directories exist
if (!fs.existsSync(beforeDir)) {
  fs.mkdirSync(beforeDir, { recursive: true });
}
if (!fs.existsSync(afterDir)) {
  fs.mkdirSync(afterDir, { recursive: true });
}
if (!fs.existsSync(serviceDir)) {
  fs.mkdirSync(serviceDir, { recursive: true });
}

// Configure multer for file storage
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination directory based on field name
    let destDir;
    if (file.fieldname === 'photos_after') {
      destDir = path.join(UPLOADS_DIR, "after");
    } else if (file.fieldname === 'photos_service') {
      destDir = path.join(UPLOADS_DIR, "service");
    } else {
      destDir = path.join(UPLOADS_DIR, "before"); // default to 'before' for photos_before
    }
    
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "s3cr3t",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );
  
  // Servir arquivos estáticos de uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Demo implementation - allow specific test account credentials for demo
      if ((username === "admin" && password === "password123") || 
          (username === "joao" && password === "password123") || 
          (username === "pedro" && password === "password123") ||
          (username === "gestor" && password === "password123") || 
          (await bcrypt.compare(password, user.password))) {
        
        req.session.userId = user.id;
        req.session.userRole = user.role;
        
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role
        });
      }
      
      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Rota para listar despesas
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem acessar despesas" });
      }
      
      // Selecionar todas as despesas no banco de dados
      const expensesList = await db
        .select()
        .from(expenses)
        .orderBy(desc(expenses.date));
        
      res.json(expensesList);
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
      res.status(500).json({ message: "Erro ao buscar despesas" });
    }
  });

  // Rotas para gerenciamento de gestores e clientes
  app.get("/api/managers", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem listar gestores" });
      }
      
      // Buscar usuários com role='gestor'
      const managers = await storage.listUsers("gestor");
      res.json(managers);
    } catch (error) {
      console.error("Erro ao buscar gestores:", error);
      res.status(500).json({ message: "Erro ao buscar gestores" });
    }
  });
  
  // Rota para atribuir cliente a um gestor
  app.post("/api/managers/:managerId/clients", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem atribuir clientes" });
      }
      
      const { managerId } = req.params;
      const { clientId } = req.body;
      
      if (!managerId || !clientId) {
        return res.status(400).json({ message: "ID do gestor e cliente são obrigatórios" });
      }
      
      // Verificar se o gestor existe e tem a role correta
      const manager = await storage.getUser(Number(managerId));
      if (!manager || manager.role !== "gestor") {
        return res.status(404).json({ message: "Gestor não encontrado" });
      }
      
      // Verificar se o cliente existe
      const client = await storage.getClient(Number(clientId));
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Atribuir cliente ao gestor
      const assignment = await storage.assignClientToManager(Number(managerId), Number(clientId));
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Erro ao atribuir cliente ao gestor:", error);
      res.status(500).json({ message: "Erro ao atribuir cliente ao gestor" });
    }
  });
  
  // Rota para remover atribuição de cliente a um gestor
  app.delete("/api/managers/:managerId/clients/:clientId", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem remover clientes" });
      }
      
      const { managerId, clientId } = req.params;
      
      // Remover atribuição
      const result = await storage.removeClientFromManager(Number(managerId), Number(clientId));
      
      if (result) {
        res.status(200).json({ message: "Atribuição removida com sucesso" });
      } else {
        res.status(404).json({ message: "Atribuição não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao remover cliente do gestor:", error);
      res.status(500).json({ message: "Erro ao remover cliente do gestor" });
    }
  });
  
  // Rota para listar clientes de um gestor
  app.get("/api/managers/:managerId/clients", requireAuth, async (req, res) => {
    try {
      const { managerId } = req.params;
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      
      // Se não for admin e não for o próprio gestor solicitando, negar acesso
      if (userRole !== "admin" && Number(managerId) !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar clientes do gestor
      const clients = await storage.getManagerClients(Number(managerId));
      res.json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes do gestor:", error);
      res.status(500).json({ message: "Erro ao buscar clientes do gestor" });
    }
  });
  
  // Rota para obter os clientes do gestor atual (útil para o frontend)
  app.get("/api/my-clients", requireAuth, async (req, res) => {
    try {
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      // Verificar se o usuário é um gestor
      if (userRole !== "gestor") {
        return res.status(403).json({ message: "Apenas gestores podem acessar esta rota" });
      }
      
      // Obter clientes do gestor atual
      const clients = await storage.getManagerClients(Number(userId));
      
      res.status(200).json(clients);
    } catch (error) {
      console.error("Erro ao obter clientes do gestor atual:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Rota para criar despesa
  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem criar despesas" });
      }
      
      // Validar dados da requisição
      const expenseData = req.body;
      
      // Inserir despesa no banco de dados
      const [newExpense] = await db
        .insert(expenses)
        .values({
          type: expenseData.type,
          amount: expenseData.amount,
          date: new Date(expenseData.date),
          description: expenseData.description,
          payment_method: expenseData.payment_method || "manual",
          notes: expenseData.notes || null,
          provider: expenseData.provider || null
        })
        .returning();
      
      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      res.status(500).json({ message: "Erro ao criar despesa" });
    }
  });
  
  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // Verificar papel do usuário para filtrar os resultados
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      console.log('Dashboard Stats Request - Role:', userRole, 'User ID:', userId);
      
      // Se for um gestor, retornar estatísticas baseadas nos clientes associados
      if (userRole === "manager" || userRole === "gestor") {
        // Obter clientes do gestor
        const clientesGestor = await storage.getManagerClients(Number(userId));
        
        if (clientesGestor.length === 0) {
          // Se não tiver clientes atribuídos, retornar estatísticas vazias
          return res.json({
            totalPendingServices: 0,
            totalInProgressServices: 0,
            totalCompletedServices: 0,
            // Não enviamos totalRevenue para gestores
          });
        }
        
        // Obter IDs dos clientes
        const clientIds = clientesGestor.map(c => c.id);
        
        // Obter estatísticas para esses clientes
        const stats = await storage.getDashboardStatsForManager(clientIds);
        
        // Remover informações financeiras
        const { totalRevenue, ...filteredStats } = stats;
        
        console.log('Stats do gestor:', filteredStats);
        return res.json(filteredStats);
      }
      
      // Para técnicos, filtrar por ID
      let technicianId: number | undefined = undefined;
      if (userRole === "technician") {
        technicianId = Number(userId);
        console.log('Filtrando stats do dashboard para o técnico ID:', technicianId);
      }
      
      // Para admin ou técnico
      const stats = await storage.getDashboardStats(technicianId);
      console.log('Stats retornados:', stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/technician-performance", requireAuth, async (req, res) => {
    try {
      // Verifica o papel do usuário
      const userRole = req.session.userRole;
      
      // Apenas admins veem o relatório completo de desempenho
      if (userRole !== "admin") {
        // Se não for admin, retorna um array vazio para esconder a seção no frontend
        return res.json([]);
      }
      
      const performance = await storage.getTechnicianPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching technician performance:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.listUsers(role);
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
        created_at: user.created_at
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      // Validate input
      const { clientIds, ...userData } = req.body;
      const userInput = insertUserSchema.parse(userData);
      
      // Check if user is admin when creating another user
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create users" });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
      const hashedPassword = await bcrypt.hash(userInput.password, saltRounds);
      
      // Criar o usuário
      const user = await storage.createUser({
        ...userInput,
        password: hashedPassword
      });
      
      // Se for um gestor e houver clientIds, associar aos clientes
      if (user.role === "gestor" && clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
        console.log(`Associando gestor ${user.id} aos clientes:`, clientIds);
        
        // Associar cada cliente ao gestor
        const clientAssignments = await Promise.all(
          clientIds.map(async (clientId) => {
            try {
              // Verificar se o cliente existe
              const client = await storage.getClient(Number(clientId));
              if (!client) {
                console.warn(`Cliente ${clientId} não encontrado, pulando atribuição`);
                return null;
              }
              
              // Fazer a associação
              return await storage.assignClientToManager(user.id, Number(clientId));
            } catch (err) {
              console.error(`Erro ao associar cliente ${clientId} ao gestor ${user.id}:`, err);
              return null;
            }
          })
        );
        
        // Filtrar associações válidas
        const validAssignments = clientAssignments.filter(a => a !== null);
        console.log(`${validAssignments.length} clientes associados ao gestor ${user.id}`);
      }
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
        created_at: user.created_at
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string | undefined;
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      // Se for gestor, mostrar apenas os clientes associados
      if (userRole === "manager" || userRole === "gestor") {
        console.log("Listando clientes apenas para o gestor ID:", userId);
        const clients = await storage.getManagerClients(Number(userId));
        return res.json(clients);
      }
      
      // Para outros usuários (admin, técnico), mostrar todos os clientes
      const clients = query
        ? await storage.searchClients(query)
        : await storage.listClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const clientInput = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientInput);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Vehicle routes
  app.get("/api/clients/:clientId/vehicles", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const vehicles = await storage.listVehiclesByClient(clientId);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicleInput = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleInput);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service types
  app.get("/api/service-types", requireAuth, async (req, res) => {
    try {
      const serviceTypes = await storage.listServiceTypes();
      res.json(serviceTypes);
    } catch (error) {
      console.error("Error fetching service types:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Services
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const filters: any = {};
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      // Se o usuário for um técnico, restringe para mostrar apenas seus serviços
      if (userRole === "technician") {
        filters.technicianId = userId;
      } else if (userRole === "manager" || userRole === "gestor") {
        // Se for gestor, pegar a lista de clientes atribuídos a ele
        const clientesGestor = await storage.getManagerClients(Number(userId));
        
        if (clientesGestor.length === 0) {
          // Se não tiver clientes atribuídos, retornar lista vazia
          return res.json([]);
        }
        
        // Se o query tem clientId, verificar se é um dos clientes do gestor
        if (req.query.clientId) {
          const clienteId = parseInt(req.query.clientId as string);
          const clientePermitido = clientesGestor.some(c => c.id === clienteId);
          
          if (!clientePermitido) {
            return res.status(403).json({ message: "Acesso negado a este cliente" });
          }
          
          filters.clientId = clienteId;
        } else {
          // Filtrar por todos os clientes do gestor
          filters.clientIds = clientesGestor.map(c => c.id);
        }
      } else if (req.query.technicianId) {
        // Para administradores, ainda permite filtrar por técnico específico
        filters.technicianId = parseInt(req.query.technicianId as string);
      }
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      if (req.query.clientId && userRole !== "gestor" && userRole !== "manager") {
        filters.clientId = parseInt(req.query.clientId as string);
      }
      
      const services = await storage.listServices(filters);
      
      // Fetch related data for each service
      const servicesWithDetails = await Promise.all(
        services.map(async (service) => {
          const client = await storage.getClient(service.client_id);
          const vehicle = await storage.getVehicle(service.vehicle_id);
          const serviceType = await storage.getServiceType(service.service_type_id);
          const technician = service.technician_id ? await storage.getUser(service.technician_id) : null;
          
          // Base do objeto de serviço
          const serviceData: any = {
            id: service.id,
            client_id: service.client_id,
            vehicle_id: service.vehicle_id,
            service_type_id: service.service_type_id,
            technician_id: service.technician_id,
            status: service.status,
            description: service.description,
            scheduled_date: service.scheduled_date,
            start_date: service.start_date,
            completion_date: service.completion_date,
            location_type: service.location_type,
            address: service.address,
            latitude: service.latitude,
            longitude: service.longitude,
            notes: service.notes,
            created_at: service.created_at,
            
            // Adicionar dados relacionados
            client: client ? { id: client.id, name: client.name } : null,
            vehicle: vehicle ? { id: vehicle.id, make: vehicle.make, model: vehicle.model, license_plate: vehicle.license_plate } : null,
            serviceType: serviceType ? { id: serviceType.id, name: serviceType.name } : null,
            technician: technician ? { id: technician.id, name: technician.name } : null
          };
          
          // Incluir valores financeiros apenas para técnicos, admins ou o próprio técnico do serviço
          if (userRole === "admin" || 
              (userRole === "technician" && Number(userId) === service.technician_id)) {
            serviceData.price = service.price;
            serviceData.displacement_fee = service.displacement_fee;
            serviceData.administrative_fee = service.administrative_fee;
            serviceData.total = service.total;
          } else if (userRole === "technician") {
            // Técnicos veem apenas o preço do serviço (sem taxas administrativas)
            serviceData.price = service.price;
            serviceData.displacement_fee = service.displacement_fee;
            // Calcular total sem taxa administrativa
            const subTotal = (service.price || 0) + (service.displacement_fee || 0);
            serviceData.total = subTotal;
          }
          
          return serviceData;
        })
      );
      
      res.json(servicesWithDetails);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      // Verificar se o usuário é gestor e se tem acesso a este serviço
      if (userRole === "manager" || userRole === "gestor") {
        // Obter o serviço para verificar o cliente
        const service = await storage.getService(id);
        if (!service) {
          return res.status(404).json({ message: "Service not found" });
        }
        
        // Verificar se o cliente está associado a este gestor
        const clientesGestor = await storage.getManagerClients(Number(userId));
        const clientePermitido = clientesGestor.some(c => c.id === service.client_id);
        
        if (!clientePermitido) {
          return res.status(403).json({ message: "Acesso negado a este serviço" });
        }
      }
      
      const serviceDetails = await storage.getServiceDetails(id);
      
      if (!serviceDetails) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Se for um gestor, remover campos financeiros
      if (userRole === "manager" || userRole === "gestor") {
        // Remover campos financeiros sensíveis
        const { price, displacement_fee, administrative_fee, total, ...filteredDetails } = serviceDetails;
        return res.json(filteredDetails);
      } else if (userRole === "technician" && Number(userId) !== serviceDetails.technician_id) {
        // Se for um técnico visualizando serviço de outro técnico
        // Remover taxa administrativa, mas manter o preço
        const { administrative_fee, ...filteredDetails } = serviceDetails;
        // Recalcular o total sem a taxa administrativa
        filteredDetails.total = (serviceDetails.price || 0) + (serviceDetails.displacement_fee || 0);
        return res.json(filteredDetails);
      }
      
      // Para admin ou o próprio técnico, retornar todos os detalhes
      res.json(serviceDetails);
    } catch (error) {
      console.error("Error fetching service details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      // Log para depuração
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
      
      // Verificar se os campos obrigatórios estão presentes
      if (!req.body.client_id) {
        return res.status(400).json({ message: "Client ID is required" });
      }
      if (!req.body.vehicle_id) {
        return res.status(400).json({ message: "Vehicle ID is required" });
      }
      if (!req.body.service_type_id) {
        return res.status(400).json({ message: "Service Type ID is required" });
      }
      if (!req.body.location_type) {
        return res.status(400).json({ message: "Location Type is required" });
      }
      
      // Verificação detalhada do service_type_id
      try {
        const serviceType = await storage.getServiceType(parseInt(req.body.service_type_id));
        if (!serviceType) {
          console.error(`Tipo de serviço não encontrado: ID ${req.body.service_type_id}`);
          return res.status(404).json({ message: `Tipo de serviço com ID ${req.body.service_type_id} não encontrado` });
        }
        console.log(`Tipo de serviço encontrado: ${serviceType.name} (ID: ${serviceType.id})`);
      } catch (typeError) {
        console.error("Erro ao verificar tipo de serviço:", typeError);
      }
      
      try {
        const serviceInput = insertServiceSchema.parse(req.body);
        
        // Calculate total
        const total = (serviceInput.price || 0) + (serviceInput.displacement_fee || 0);
        
        console.log("Criando serviço com dados validados:", {
          ...serviceInput,
          total
        });
        
        const service = await storage.createService({
          ...serviceInput,
          total
        });
        
        console.log("Serviço criado com sucesso:", service);
        res.status(201).json(service);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Erro de validação Zod:", JSON.stringify(validationError.errors, null, 2));
          return res.status(400).json({ message: "Dados inválidos", errors: validationError.errors });
        }
        console.error("Erro de validação não-Zod:", validationError);
        throw validationError;
      }
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      // Fornecer mensagem de erro mais específica
      const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
      res.status(500).json({ message: `Erro ao criar serviço: ${errorMessage}` });
    }
  });

  app.patch("/api/services/:id", requireAuth, upload.fields([
    { name: 'photos_service', maxCount: 4 },
    { name: 'photos_before', maxCount: 4 },
    { name: 'photos_after', maxCount: 4 }
  ]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`PATCH /api/services/${id} - Headers:`, req.headers);
      console.log(`PATCH /api/services/${id} - Body:`, req.body);
      
      const service = await storage.getService(id);
      console.log(`Serviço encontrado:`, service);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Verificar se o serviço está em um estado que não permite alterações completas
      if (['aguardando_aprovacao', 'faturado', 'pago'].includes(service.status)) {
        // Se for apenas uma atualização de status pelo fluxo automático, permitimos
        if (req.body.status && Object.keys(req.body).length === 1) {
          const statusFlow = {
            'aguardando_aprovacao': ['faturado'],
            'faturado': ['pago']
          };
          
          // @ts-ignore
          if (statusFlow[service.status]?.includes(req.body.status)) {
            // Status válido, continua o fluxo
          } else {
            return res.status(400).json({ 
              message: `Este serviço está em um pedido de pagamento e não pode mudar para o status ${req.body.status}` 
            });
          }
        } 
        // Se não for atualização de status ou tiver outros campos além do status
        else if (Object.keys(req.body).length > 0) {
          return res.status(403).json({ 
            message: "Este serviço está em um pedido de pagamento e não pode ser alterado" 
          });
        }
      }
      
      let updates = req.body;
      
      // Se o content type for multipart/form-data, a forma como os dados são recebidos é diferente
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        // Verificar se temos arquivos de fotos
        const hasServicePhotos = req.files && 
                              (req.files as any)['photos_service'] && 
                              (req.files as any)['photos_service'].length > 0;
        
        const hasBeforePhotos = req.files && 
                            (req.files as any)['photos_before'] && 
                            (req.files as any)['photos_before'].length > 0;
                            
        const hasAfterPhotos = req.files && 
                           (req.files as any)['photos_after'] && 
                           (req.files as any)['photos_after'].length > 0;
        
        const hasPhotosToRemove = updates.photos_to_remove;
        
        const hasPhotoChanges = updates.has_photo_changes === 'true' || 
                             hasServicePhotos || 
                             hasBeforePhotos || 
                             hasAfterPhotos || 
                             hasPhotosToRemove;
        
        // Log para debug
        console.log("Recebido como multipart/form-data. Campos:", Object.keys(updates));
        console.log("Arquivos:", req.files ? Object.keys(req.files) : 'Nenhum');
        console.log("Tem fotos?", { 
          hasServicePhotos, 
          hasBeforePhotos, 
          hasAfterPhotos, 
          hasPhotosToRemove,
          hasPhotoChanges
        });
        
        // Se houver fotos sendo enviadas ou removidas, marcar isso no objeto de atualização
        if (hasPhotoChanges) {
          console.log("Marcando que há alterações de fotos");
          updates._hasPhotoChanges = true;
        }
        
        // Converter strings para números onde necessário
        if (updates.price) {
          updates.price = Number(updates.price);
        }
        if (updates.displacement_fee) {
          updates.displacement_fee = Number(updates.displacement_fee);
        }
        
        // Processar fotos aqui
        if (hasServicePhotos || hasBeforePhotos || hasAfterPhotos) {
          // Processar fotos de serviço (nova abordagem)
          if (hasServicePhotos) {
            const files = (req.files as any)['photos_service'];
            console.log(`Processando ${files.length} fotos de serviço`);
            
            // Adicionar cada foto ao banco de dados
            for (const file of files) {
              const photoUrl = `/uploads/service/${file.filename}`;
              await storage.addServicePhoto({
                service_id: id,
                photo_type: 'service',
                photo_url: photoUrl
              });
            }
          }
          
          // Processar fotos "antes" (abordagem anterior)
          if (hasBeforePhotos) {
            const files = (req.files as any)['photos_before'];
            console.log(`Processando ${files.length} fotos "antes"`);
            
            for (const file of files) {
              const photoUrl = `/uploads/before/${file.filename}`;
              await storage.addServicePhoto({
                service_id: id,
                photo_type: 'before',
                photo_url: photoUrl
              });
            }
          }
          
          // Processar fotos "depois" (abordagem anterior)
          if (hasAfterPhotos) {
            const files = (req.files as any)['photos_after'];
            console.log(`Processando ${files.length} fotos "depois"`);
            
            for (const file of files) {
              const photoUrl = `/uploads/after/${file.filename}`;
              await storage.addServicePhoto({
                service_id: id,
                photo_type: 'after',
                photo_url: photoUrl
              });
            }
          }
        }
        
        // Remover fotos se necessário
        if (hasPhotosToRemove) {
          try {
            const photoIdsToRemove = JSON.parse(updates.photos_to_remove);
            console.log(`Removendo ${photoIdsToRemove.length} fotos:`, photoIdsToRemove);
            
            // Usar a função de remoção implementada no storage
            for (const photoId of photoIdsToRemove) {
              console.log(`Removendo foto ID ${photoId}`);
              const removed = await storage.removeServicePhoto(photoId);
              if (removed) {
                console.log(`Foto ID ${photoId} removida com sucesso`);
              } else {
                console.error(`Falha ao remover foto ID ${photoId}`);
              }
            }
          } catch (error) {
            console.error("Erro ao processar IDs de fotos para remover:", error);
          }
        }
      }
      
      // Verificação para garantir que temos dados para atualizar
      if (Object.keys(updates).length === 0 || (Object.keys(updates).length === 1 && updates._hasPhotoChanges)) {
        // Se não há dados além de _hasPhotoChanges, ainda precisamos enviar algo para o serviço atualizado
        if (updates._hasPhotoChanges) {
          console.log("Apenas alterações de fotos foram feitas, atualizando apenas essa informação");
          return res.json({
            ...service,
            message: "Fotos atualizadas com sucesso"
          });
        } else {
          console.log("Nenhum dado de atualização fornecido, retornando o serviço atual");
          return res.json(service);
        }
      }
      
      console.log("Atualizando serviço com dados brutos:", updates);
      
      // Filtrar campos que não devem ser enviados para o banco de dados
      const filteredUpdates = {...updates};
      
      // Remover campos personalizados e temporários
      const fieldsToRemove = [
        '_hasPhotoChangesOnly', 
        '_hasPhotoChanges', 
        'has_photo_changes', 
        'photos_to_remove'
      ];
      
      // Remover todos os campos que começam com underscore e os campos específicos
      Object.keys(filteredUpdates).forEach(key => {
        if (key.startsWith('_') || fieldsToRemove.includes(key)) {
          delete filteredUpdates[key];
        }
      });
      
      console.log("Atualizando serviço com dados filtrados:", filteredUpdates);
      
      // Recalculate total if price or displacement_fee is updated
      if (filteredUpdates.price !== undefined || filteredUpdates.displacement_fee !== undefined) {
        // Certificar-se de que os valores são numéricos
        let price = filteredUpdates.price !== undefined ? Number(filteredUpdates.price) : Number(service.price) || 0;
        let displacementFee = filteredUpdates.displacement_fee !== undefined ? Number(filteredUpdates.displacement_fee) : Number(service.displacement_fee) || 0;
        
        console.log('Calculando total com:', { price, displacementFee, oldPrice: service.price, oldFee: service.displacement_fee });
        
        filteredUpdates.price = price;
        filteredUpdates.displacement_fee = displacementFee;
        filteredUpdates.total = price + displacementFee;
        
        console.log('Novo total calculado:', filteredUpdates.total);
      }
      
      // Update completion_date if status is being set to completed or outras etapas de faturamento
      if (filteredUpdates.status === "completed" && service.status !== "completed") {
        filteredUpdates.completion_date = new Date();
      }
      
      // Tratamento especial para outras mudanças de status
      if (filteredUpdates.status === "aguardando_aprovacao" && service.status !== "aguardando_aprovacao") {
        if (!service.completion_date) {
          filteredUpdates.completion_date = new Date();
        }
      }
      
      // Se após a filtragem não sobrar nenhum campo, não tente atualizar o banco
      if (Object.keys(filteredUpdates).length === 0) {
        console.log("Após filtragem não há campos para atualizar, retornando o serviço sem alterar");
        return res.json({
          ...service,
          message: "Fotos atualizadas com sucesso"
        });
      }
      
      const updatedService = await storage.updateService(id, filteredUpdates);
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      // Verificar se é erro de validação do serviço em pedido de pagamento
      if (error instanceof Error && error.message && (
        error.message.includes("pedido de pagamento") || 
        error.message.includes("não pode ser alterado")
      )) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint para excluir um serviço
  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Verificar se o serviço está em um pedido de pagamento
      if (['aguardando_aprovacao', 'faturado', 'pago'].includes(service.status)) {
        return res.status(403).json({ 
          message: "Este serviço está em um pedido de pagamento e não pode ser excluído" 
        });
      }
      
      // Em uma implementação real, você implementaria um método de exclusão no storage
      // Por enquanto, vamos simular a exclusão usando o updateService com um status "deleted"
      const updatedService = await storage.updateService(id, { status: "deleted" });
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      // Verificar se é erro de validação do serviço em pedido de pagamento
      if (error instanceof Error && error.message && (
        error.message.includes("pedido de pagamento") || 
        error.message.includes("não pode ser alterado")
      )) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete service" });
    }
  });
  
  // A configuração do multer foi movida para o início do arquivo

  // Service photo endpoints
  app.post("/api/services/:id/photos", requireAuth, upload.array('photos', 4), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const photoType = req.body.photo_type || 'service';
      
      // Validate service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Verificar quantas fotos já existem para este serviço
      const existingPhotos = await storage.getServicePhotos(serviceId);
      const totalExistingPhotos = existingPhotos.length;
      
      // Verificar se adicionar as novas fotos excederia o limite de 4
      const uploadedFiles = req.files as Express.Multer.File[];
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      if (totalExistingPhotos + uploadedFiles.length > 4) {
        // Remover os arquivos temporários que não serão usados
        uploadedFiles.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error(`Falha ao remover arquivo temporário ${file.path}:`, err);
          }
        });
        
        return res.status(400).json({ 
          message: `Limite de fotos excedido. Já existem ${totalExistingPhotos} fotos, permitido no máximo 4.`,
          current: totalExistingPhotos,
          maximum: 4,
          remainingSlots: Math.max(0, 4 - totalExistingPhotos)
        });
      }
      
      // Add all photos to the service
      const photoPromises = uploadedFiles.map(async (file) => {
        const photoUrl = `/uploads/${photoType}/${file.filename}`;
        return await storage.addServicePhoto({
          service_id: serviceId,
          photo_type: photoType as 'before' | 'after' | 'service',
          photo_url: photoUrl
        });
      });
      
      const photos = await Promise.all(photoPromises);
      
      res.status(201).json({
        message: `${photos.length} fotos enviadas com sucesso`,
        photos: photos,
        total: totalExistingPhotos + photos.length,
        remainingSlots: 4 - (totalExistingPhotos + photos.length)
      });
    } catch (error) {
      console.error("Error uploading service photos:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get photos for a service
  app.get("/api/services/:id/photos", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const photoType = req.query.type as string | undefined;
      
      const photos = await storage.getServicePhotos(serviceId, photoType);
      
      // Calcular quantas fotos ainda podem ser adicionadas
      const remainingSlots = Math.max(0, 4 - photos.length);
      
      res.json({
        photos,
        total: photos.length,
        remainingSlots
      });
    } catch (error) {
      console.error("Error fetching service photos:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete a specific photo
  app.delete("/api/services/:serviceId/photos/:photoId", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const photoId = parseInt(req.params.photoId);
      
      // Verificar se o serviço existe
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Verificar se a foto existe
      const photos = await storage.getServicePhotos(serviceId);
      const photoToDelete = photos.find(p => p.id === photoId);
      
      if (!photoToDelete) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      // Excluir a foto do sistema de arquivos
      try {
        // Pegar o caminho relativo da foto
        const relativePath = photoToDelete.photo_url;
        // Converter para caminho absoluto
        const absolutePath = path.join(process.cwd(), 'public', relativePath);
        
        // Verificar se o arquivo existe antes de tentar excluir
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error(`Falha ao remover arquivo físico:`, err);
        // Continua mesmo com falha na exclusão do arquivo físico
      }
      
      // Excluir o registro da foto do banco de dados usando nossa função
      const deleted = await storage.removeServicePhoto(photoId);
      
      res.json({
        message: "Photo deleted successfully",
        photoId,
        remainingPhotos: photos.length - 1,
        remainingSlots: Math.min(4, 4 - photos.length + 1)
      });
    } catch (error) {
      console.error("Error deleting service photo:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event types routes
  app.get("/api/event-types", requireAuth, async (req, res) => {
    try {
      const eventTypes = await storage.listEventTypes();
      res.json(eventTypes);
    } catch (error) {
      console.error("Error fetching event types:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/event-types", requireAuth, async (req, res) => {
    try {
      // Verificar se o usuário é admin
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create event types" });
      }

      const eventTypeInput = insertEventTypeSchema.parse(req.body);
      const eventType = await storage.createEventType(eventTypeInput);
      res.status(201).json(eventType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating event type:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Events routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const filters: Partial<{ technician_id: number, date: string }> = {};
      
      if (req.query.technician_id) {
        filters.technician_id = parseInt(req.query.technician_id as string);
      }
      
      if (req.query.date) {
        filters.date = req.query.date as string;
      }
      
      const events = await storage.listEvents(filters);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const eventInput = insertEventSchema.parse(req.body);
      
      // Se o usuário não for admin, só pode criar eventos para si mesmo
      if (req.session.userRole !== "admin" && eventInput.technician_id !== req.session.userId) {
        return res.status(403).json({ 
          message: "Technicians can only create events for themselves" 
        });
      }
      
      const event = await storage.createEvent(eventInput);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eventData = req.body;
      
      // Verificar se o evento existe
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Se o usuário não for admin, só pode editar seus próprios eventos
      if (req.session.userRole !== "admin" && existingEvent.technician_id !== req.session.userId) {
        return res.status(403).json({ 
          message: "Technicians can only edit their own events" 
        });
      }
      
      const updatedEvent = await storage.updateEvent(id, eventData);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o evento existe
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Se o usuário não for admin, só pode excluir seus próprios eventos
      if (req.session.userRole !== "admin" && existingEvent.technician_id !== req.session.userId) {
        return res.status(403).json({ 
          message: "Technicians can only delete their own events" 
        });
      }
      
      const success = await storage.deleteEvent(id);
      
      if (success) {
        res.status(200).json({ message: "Event deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete event" });
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rotas de Pedidos de Pagamento
  app.get("/api/payment-requests", requireAuth, async (req, res) => {
    try {
      // Técnicos só podem ver seus próprios pedidos
      const technicianId = req.session.userRole === "technician" ? req.session.userId : undefined;
      const paymentRequests = await storage.listPaymentRequests(technicianId);
      res.json(paymentRequests);
    } catch (error) {
      console.error("Erro ao buscar pedidos de pagamento:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos de pagamento" });
    }
  });
  
  app.get("/api/payment-requests/:id", requireAuth, async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const paymentRequest = await storage.getPaymentRequest(requestId);
      
      if (!paymentRequest) {
        return res.status(404).json({ message: "Pedido de pagamento não encontrado" });
      }
      
      // Técnicos só podem ver seus próprios pedidos
      if (req.session.userRole === "technician" && paymentRequest.technician_id !== req.session.userId) {
        return res.status(403).json({ message: "Você não tem permissão para visualizar este pedido" });
      }
      
      res.json(paymentRequest);
    } catch (error) {
      console.error("Erro ao buscar pedido de pagamento:", error);
      res.status(500).json({ message: "Erro ao buscar pedido de pagamento" });
    }
  });
  
  app.post("/api/payment-requests", requireAuth, async (req, res) => {
    try {
      const { service_ids, technician_id } = req.body;
      
      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        return res.status(400).json({ message: "É necessário selecionar pelo menos um serviço" });
      }
      
      // Se for admin, pode especificar o técnico ou criar sem técnico
      if (req.session.userRole === "admin") {
        // Converte para número ou mantém null/undefined
        const techId = technician_id ? Number(technician_id) : null;
        const paymentRequest = await storage.createPaymentRequest(techId, service_ids);
        return res.status(201).json(paymentRequest);
      } 
      // Se for técnico, só pode criar para si mesmo
      else if (req.session.userRole === "technician") {
        const technicianId = Number(req.session.userId);
        const paymentRequest = await storage.createPaymentRequest(technicianId, service_ids);
        return res.status(201).json(paymentRequest);
      }
      else {
        return res.status(403).json({ message: "Você não tem permissão para criar pedidos de pagamento" });
      }
    } catch (error) {
      console.error("Erro ao criar pedido de pagamento:", error);
      res.status(500).json({ message: "Erro ao criar pedido de pagamento" });
    }
  });
  
  app.patch("/api/payment-requests/:id", requireAuth, async (req, res) => {
    if (req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Apenas administradores podem alterar o status de pedidos de pagamento" });
    }
    
    try {
      const requestId = Number(req.params.id);
      const { status, paymentDetails } = req.body;
      
      if (!status || !["aprovado", "rejeitado", "pago"].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      // Verificar se o pedido de pagamento está no status correto para a transição
      if (status === "pago") {
        const request = await storage.getPaymentRequest(requestId);
        if (!request || request.status !== "aprovado") {
          return res.status(400).json({ 
            message: "Um pedido de pagamento só pode ser pago após ser aprovado" 
          });
        }
        
        // Para pagamento, exigir detalhes
        if (!paymentDetails) {
          return res.status(400).json({ 
            message: "Detalhes do pagamento são obrigatórios para registrar um pagamento" 
          });
        }
      }
      
      const updatedRequest = await storage.updatePaymentRequestStatus(
        requestId, 
        status, 
        status === "pago" ? paymentDetails : undefined
      );
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Pedido de pagamento não encontrado" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      res.status(500).json({ message: "Erro ao atualizar status do pedido" });
    }
  });
  
  // Rota específica para registrar pagamento
  app.patch("/api/payment-requests/:id/pay", requireAuth, async (req, res) => {
    if (req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Apenas administradores podem registrar pagamentos" });
    }
    
    try {
      const requestId = Number(req.params.id);
      console.log("Dados recebidos para pagamento:", JSON.stringify(req.body));
      
      // Extrair dados do corpo da requisição
      const { payment_date, payment_method, payment_notes } = req.body;
      
      // Criar objeto de detalhes do pagamento
      const paymentDetails = {
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || "outro",
        payment_notes: payment_notes || ""
      };
      
      console.log("ID do pedido:", requestId);
      console.log("Data do pagamento:", paymentDetails.payment_date);
      console.log("Detalhes do pagamento:", JSON.stringify(paymentDetails));
      
      // Verificar se o pedido existe e está no status aprovado
      const request = await storage.getPaymentRequest(requestId);
      
      if (!request) {
        console.log("Pedido não encontrado com ID:", requestId);
        return res.status(404).json({ message: "Pedido de pagamento não encontrado" });
      }
      
      console.log("Status atual do pedido:", request.status);
      
      if (request.status !== "aprovado") {
        return res.status(400).json({ 
          message: "Um pedido de pagamento só pode ser pago após ser aprovado" 
        });
      }
      
      // Verificar se os dados de pagamento foram fornecidos
      if (!payment_date) {
        console.log("Data de pagamento não fornecida");
        return res.status(400).json({ message: "Data do pagamento é obrigatória" });
      }
      
      // Validamos que temos os dados mínimos (já garantido pela criação do objeto paymentDetails)
      try {
        // Atualizar status para "pago" e registrar detalhes do pagamento
        const updatedRequest = await storage.updatePaymentRequestStatus(
          requestId, 
          "pago", 
          paymentDetails
        );
        
        console.log("Resposta da atualização:", updatedRequest ? "Sucesso" : "Falha");
        
        if (!updatedRequest) {
          return res.status(404).json({ message: "Falha ao atualizar pedido de pagamento" });
        }
        
        // Nota: O registro de despesa do tipo "salário" já é feito automaticamente 
        // dentro do método updatePaymentRequestStatus em storage.ts
        
        // Retorno simplificado para evitar problemas de JSON
        console.log("Enviando resposta de sucesso");
        res.json({ status: "success" });
      } catch (storageError) {
        console.error("Erro no storage ao atualizar pagamento:", storageError);
        res.status(500).json({ message: "Erro ao processar o pagamento no banco de dados" });
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      res.status(500).json({ message: "Erro ao registrar pagamento" });
    }
  });
  
  // Rota para o gestor obter seus clientes atribuídos
  app.get("/api/my-clients", requireAuth, async (req, res) => {
    try {
      // Verificar se é um gestor
      if (req.session.userRole !== "gestor") {
        return res.status(403).json({ message: "Permissão negada" });
      }
      
      const managerId = Number(req.session.userId);
      const clients = await storage.getManagerClients(managerId);
      
      res.json(clients);
    } catch (error) {
      console.error("Erro ao obter clientes do gestor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rotas para orçamentos (budgets)
  app.get("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgets = await storage.listBudgets();
      res.json(budgets);
    } catch (error) {
      console.error("Erro ao listar orçamentos:", error);
      res.status(500).json({ message: "Erro ao listar orçamentos" });
    }
  });
  
  app.get("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.getBudget(Number(id));
      
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      res.json(budget);
    } catch (error) {
      console.error(`Erro ao buscar orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao buscar orçamento" });
    }
  });
  
  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgetData = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(budgetData);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos para criação de orçamento", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Erro ao criar orçamento" });
    }
  });
  
  app.patch("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const budgetData = req.body;
      
      // Verificar se o orçamento existe
      const existingBudget = await storage.getBudget(Number(id));
      if (!existingBudget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      const updatedBudget = await storage.updateBudget(Number(id), budgetData);
      res.json(updatedBudget);
    } catch (error) {
      console.error(`Erro ao atualizar orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao atualizar orçamento" });
    }
  });
  
  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o orçamento existe
      const existingBudget = await storage.getBudget(Number(id));
      if (!existingBudget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      const deleted = await storage.deleteBudget(Number(id));
      
      if (deleted) {
        res.status(200).json({ message: "Orçamento excluído com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao excluir orçamento" });
      }
    } catch (error) {
      console.error(`Erro ao excluir orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao excluir orçamento" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

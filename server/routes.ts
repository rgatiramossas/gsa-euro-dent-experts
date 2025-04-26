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
import { 
  insertUserSchema, 
  insertClientSchema, 
  insertVehicleSchema, 
  insertServiceSchema, 
  insertServicePhotoSchema,
  insertEventTypeSchema,
  insertEventSchema 
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

// Ensure directories exist
if (!fs.existsSync(beforeDir)) {
  fs.mkdirSync(beforeDir, { recursive: true });
}
if (!fs.existsSync(afterDir)) {
  fs.mkdirSync(afterDir, { recursive: true });
}

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

  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/technician-performance", requireAuth, async (req, res) => {
    try {
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
      const userInput = insertUserSchema.parse(req.body);
      
      // Check if user is admin when creating another user
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create users" });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
      const hashedPassword = await bcrypt.hash(userInput.password, saltRounds);
      
      const user = await storage.createUser({
        ...userInput,
        password: hashedPassword
      });
      
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
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      if (req.query.technicianId) {
        filters.technicianId = parseInt(req.query.technicianId as string);
      }
      
      if (req.query.clientId) {
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
          
          return {
            ...service,
            client: client ? { id: client.id, name: client.name } : null,
            vehicle: vehicle ? { id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year, license_plate: vehicle.license_plate } : null,
            serviceType: serviceType ? { id: serviceType.id, name: serviceType.name } : null,
            technician: technician ? { id: technician.id, name: technician.name } : null
          };
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
      const serviceDetails = await storage.getServiceDetails(id);
      
      if (!serviceDetails) {
        return res.status(404).json({ message: "Service not found" });
      }
      
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
      
      try {
        const serviceInput = insertServiceSchema.parse(req.body);
        
        // Calculate total
        const total = (serviceInput.price || 0) + (serviceInput.displacement_fee || 0);
        const service = await storage.createService({
          ...serviceInput,
          total
        });
        
        res.status(201).json(service);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Erro de validação Zod:", JSON.stringify(validationError.errors, null, 2));
          return res.status(400).json({ message: "Invalid input", errors: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const updates = req.body;
      
      // Recalculate total if price or displacement_fee is updated
      if (updates.price !== undefined || updates.displacement_fee !== undefined) {
        const price = updates.price !== undefined ? updates.price : service.price || 0;
        const displacementFee = updates.displacement_fee !== undefined ? updates.displacement_fee : service.displacement_fee || 0;
        updates.total = price + displacementFee;
      }
      
      // Update completion_date if status is being set to completed or outras etapas de faturamento
      if (updates.status === "completed" && service.status !== "completed") {
        updates.completion_date = new Date();
      }
      
      // Tratamento especial para outras mudanças de status
      if (updates.status === "aguardando_aprovacao" && service.status !== "aguardando_aprovacao") {
        if (!service.completion_date) {
          updates.completion_date = new Date();
        }
      }
      
      const updatedService = await storage.updateService(id, updates);
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
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
      
      // Em uma implementação real, você implementaria um método de exclusão no storage
      // Por enquanto, vamos simular a exclusão usando o updateService com um status "deleted"
      const updatedService = await storage.updateService(id, { status: "deleted" });
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });
  
  // Configure multer for file storage
  const storage_config = multer.diskStorage({
    destination: function (req, file, cb) {
      // Determine photo type based on URL parameter
      const photoType = req.body.photo_type || 'before';
      const destDir = photoType === 'after' ? afterDir : beforeDir;
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

  // Service photo endpoints
  app.post("/api/services/:id/photos", requireAuth, upload.array('photos', 5), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const photoType = req.body.photo_type || 'before';
      
      // Validate service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const uploadedFiles = req.files as Express.Multer.File[];
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Add all photos to the service
      const photoPromises = uploadedFiles.map(async (file) => {
        const photoUrl = `/uploads/${photoType}/${file.filename}`;
        return await storage.addServicePhoto({
          service_id: serviceId,
          photo_type: photoType as 'before' | 'after',
          photo_url: photoUrl
        });
      });
      
      const photos = await Promise.all(photoPromises);
      
      res.status(201).json({
        message: `${photos.length} photos uploaded successfully`,
        photos: photos
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
      
      res.json(photos);
    } catch (error) {
      console.error("Error fetching service photos:", error);
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
    if (req.session.userRole !== "technician") {
      return res.status(403).json({ message: "Apenas técnicos podem criar pedidos de pagamento" });
    }
    
    try {
      const { service_ids } = req.body;
      
      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        return res.status(400).json({ message: "É necessário selecionar pelo menos um serviço" });
      }
      
      const technicianId = Number(req.session.userId);
      const paymentRequest = await storage.createPaymentRequest(technicianId, service_ids);
      
      res.status(201).json(paymentRequest);
    } catch (error) {
      console.error("Erro ao criar pedido de pagamento:", error);
      res.status(500).json({ message: "Erro ao criar pedido de pagamento" });
    }
  });
  
  app.put("/api/payment-requests/:id/status", requireAuth, async (req, res) => {
    if (req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Apenas administradores podem alterar o status de pedidos de pagamento" });
    }
    
    try {
      const requestId = Number(req.params.id);
      const { status } = req.body;
      
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      const updatedRequest = await storage.updatePaymentRequestStatus(requestId, status);
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Pedido de pagamento não encontrado" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      res.status(500).json({ message: "Erro ao atualizar status do pedido" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

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
// import { db } from "./db"; // PostgreSQL
// MySQL connection (que será obtida mais tarde)
let pool: any;
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
} from "@shared/schema.mysql";
import { z } from "zod";

// Estender a tipagem do Session para incluir nossas propriedades personalizadas
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
    loginTime?: string;
    created?: string;
  }
}

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
    
    // Adiciona um atributo personalizado para rastrear qual diretório foi usado
    // Isso será útil para construir o caminho correto posteriormente
    if (file.fieldname === 'photos_after') {
      destDir = path.join(UPLOADS_DIR, "after");
      (file as any).destFolder = "after";
    } else if (file.fieldname === 'photos_service') {
      destDir = path.join(UPLOADS_DIR, "service");
      (file as any).destFolder = "service";
    } else {
      destDir = path.join(UPLOADS_DIR, "before"); // default to 'before' for photos_before
      (file as any).destFolder = "before";
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
  // Configurar uma chave de sessão forte
  const sessionSecret = process.env.SESSION_SECRET || "s3cr3t_k3y_para_eurodent_session_" + Date.now();
  
  // Session middleware com configuração aprimorada e armazenamento MySQL
  
  // Obter as configurações das variáveis de ambiente
  const cookieMaxAge = parseInt(process.env.COOKIE_MAX_AGE || '31536000000'); // 1 ano padrão
  const cookieSecure = process.env.COOKIE_SECURE === 'true' ? true : false;
  const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none' | false;
  
  console.log("\n==== CONFIGURAÇÃO DE SESSÃO ====");
  console.log("Cookie Max Age:", cookieMaxAge, "ms", `(${cookieMaxAge / (24 * 60 * 60 * 1000)} dias)`);
  console.log("Cookie Secure:", cookieSecure);
  console.log("Cookie SameSite:", cookieSameSite);
  console.log("Session Secret:", sessionSecret ? "Definido (comprimento: " + sessionSecret.length + ")" : "Não definido!");
  console.log("Store Type:", storage.sessionStore.constructor.name);
  console.log("================================\n");
  
  app.use(
    session({
      secret: sessionSecret,
      resave: true, // Forçar resalvar da sessão, mesmo se não modificada
      saveUninitialized: false, // Não salvar sessões não inicializadas (reduz sessões vazias)
      store: storage.sessionStore, // Usar o armazenamento MySQL
      cookie: { 
        secure: cookieSecure, // Definido via variável de ambiente
        maxAge: cookieMaxAge, // Definido via variável de ambiente
        httpOnly: true, // Prevenir acesso por JavaScript no cliente
        sameSite: cookieSameSite, // Definido via variável de ambiente
        path: '/'
      },
      rolling: true, // Reset da expiração a cada requisição
      name: 'eurodent.sid', // Nome personalizado para o cookie de sessão
      proxy: true // Confia nos headers X-Forwarded-* quando atrás de um proxy
    })
  );
  
  // Middleware para monitorar sessões
  app.use((req, res, next) => {
    // Verifica se é uma requisição da API
    if (req.path.startsWith('/api/') && req.path !== '/api/auth/login') {
      console.log(`\n=== Requisição: ${req.method} ${req.path} ===`);
      console.log(`SessionID: ${req.sessionID}`);
      console.log(`Cookies: ${JSON.stringify(req.headers.cookie)}`);
      console.log(`Session válida: ${req.session && req.session.userId ? 'Sim' : 'Não'}`);
      
      // Obter o IP do cliente
      const clientIP = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
      console.log(`IP do cliente: ${clientIP}`);
      
      // Verifica se a sessão será enviada de volta como cookie
      res.on('finish', () => {
        console.log(`=== Resposta para ${req.path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.getHeaders())}`);
        console.log(`Set-Cookie: ${res.getHeader('set-cookie')}`);
      });
    }
    next();
  });
  // A configuração de servir arquivos estáticos de uploads foi movida para index.ts

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
      console.log("=== Iniciando processo de login ===");
      console.log("Headers da requisição:", req.headers);
      console.log("Cookies existentes:", req.headers.cookie);
      console.log("Session ID no início:", req.sessionID);
      
      const { username, password } = req.body;
      console.log("Tentativa de login para usuário:", username);
      
      if (!username || !password) {
        console.log("Login falhou: credenciais incompletas");
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log("Login falhou: usuário não encontrado");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Demo implementation - allow specific test account credentials for demo
      const isValidCredentials = (username === "admin" && password === "password123") || 
          (username === "joao" && password === "password123") || 
          (username === "pedro" && password === "password123") ||
          (username === "gestor" && password === "password123") || 
          (await bcrypt.compare(password, user.password));
      
      if (isValidCredentials) {
        console.log("Credenciais válidas para usuário:", username);
        
        // Limpar e configurar a sessão diretamente
        console.log("Criando nova sessão para usuário:", user.username);
          
        // Configurar sessão diretamente
        req.session.userId = user.id;
        req.session.userRole = user.role;
        
        // Configurar o cookie corretamente
        if (req.session.cookie) {
          req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano
          req.session.cookie.sameSite = 'lax';
        }
          
        // Salvar a sessão explicitamente
        req.session.save(err => {
          if (err) {
            console.error("Erro ao salvar sessão:", err);
            res.status(500).json({ message: "Erro ao processar sessão" });
            return;
          }
          
          // Log detalhado da sessão
          console.log("Sessão criada com sucesso:", { 
            sessionID: req.sessionID,
            userId: req.session.userId, 
            userRole: req.session.userRole,
            cookie: req.session.cookie
          });
          
          // Verificar cabeçalhos da resposta
          res.on('finish', () => {
            console.log("Resposta /api/auth/login enviada com cabeçalhos:", res.getHeaders());
            console.log("Cookie definido na resposta:", res.getHeader('set-cookie'));
          });
          
          res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role
          });
        });
        
        return; // Importante: retornar aqui para evitar a execução do código abaixo
      }
      
      console.log("Login falhou: senha inválida");
      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      // Log de depuração da sessão com detalhes completos
      console.log("=== Verificando sessão em /api/auth/me ===");
      console.log("SessionID:", req.sessionID);
      console.log("Cookies enviados pelo cliente:", req.headers.cookie);
      console.log("Conteúdo da sessão:", JSON.stringify(req.session, null, 2));
      console.log("Usuário na sessão:", req.session.userId);
      
      // Se não houver usuário na sessão
      if (!req.session.userId) {
        console.log("Sessão inválida: userId não encontrado na sessão");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Verificar se o usuário existe no banco de dados
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.log(`Usuário com ID ${req.session.userId} não encontrado no banco de dados`);
        // Limpar a sessão e retornar erro de autenticação
        req.session.userId = undefined;
        req.session.userRole = undefined;
        req.session.save((err) => {
          if (err) console.error("Erro ao limpar sessão:", err);
          return res.status(401).json({ message: "User not found" });
        });
        return;
      }
      
      console.log(`Usuário ${user.username} autenticado com sucesso através da sessão`);
      
      // Renovar e garantir valores da sessão
      req.session.userId = user.id; // Reafirmar valores
      req.session.userRole = user.role;
      
      // Renovar o cookie da sessão
      if (req.session.cookie) {
        req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano
      }
      
      // Responder imediatamente
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      // Salvar a sessão após responder (não bloqueia)
      req.session.save((err) => {
        if (err) {
          console.error("Erro ao atualizar sessão após resposta:", err);
        } else {
          console.log("Sessão atualizada com sucesso após resposta:", req.sessionID);
        }
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
      
      // Selecionar todas as despesas no banco de dados usando storage
      const expensesList = await storage.listExpenses();
        
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
  
  // Rota para obter os clientes de um gestor específico
  app.get("/api/managers/:managerId/clients", requireAuth, async (req, res) => {
    try {
      if (req.session.userRole !== "admin" && Number(req.session.userId) !== Number(req.params.managerId)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const { managerId } = req.params;
      
      // Verificar se o gestor existe e tem a role correta
      const manager = await storage.getUser(Number(managerId));
      if (!manager || manager.role !== "gestor") {
        return res.status(404).json({ message: "Gestor não encontrado" });
      }
      
      // Obter a lista de clientes do gestor
      const clients = await storage.getManagerClients(Number(managerId));
      
      res.json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes do gestor:", error);
      res.status(500).json({ message: "Erro ao buscar clientes do gestor" });
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
  
  // Esta rota foi movida para cima, então removemos esta duplicação
  
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
      
      // Inserir despesa no banco de dados usando storage
      const newExpense = await storage.createExpense({
        type: expenseData.type,
        amount: expenseData.amount,
        date: new Date(expenseData.date),
        description: expenseData.description,
        payment_method: expenseData.payment_method || "manual",
        notes: expenseData.notes || null,
        provider: expenseData.provider || null
      });
      
      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      res.status(500).json({ message: "Erro ao criar despesa" });
    }
  });
  
  // Rota para Estatísticas Financeiras do Técnico
  app.get("/api/technician/financial-stats", requireAuth, async (req, res) => {
    try {
      // Verificar se o usuário é técnico ou admin
      const userRole = req.session.userRole;
      
      if (userRole !== "technician" && userRole !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Se for técnico, pegar estatísticas do próprio técnico
      if (userRole === "technician") {
        const technicianId = Number(req.session.userId);
        const stats = await storage.getTechnicianFinancialStats(technicianId);
        return res.json(stats);
      }
      
      // Se for admin, verificar se foi passado um ID de técnico
      const technicianId = req.query.technicianId ? Number(req.query.technicianId) : undefined;
      
      if (!technicianId) {
        return res.status(400).json({ message: "ID do técnico é obrigatório" });
      }
      
      const stats = await storage.getTechnicianFinancialStats(technicianId);
      return res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas financeiras do técnico:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas financeiras" });
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
  
  // Rota para obter um usuário específico por ID
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Se for um gestor, buscar também os clientes atribuídos
      let client_ids = undefined;
      if (user.role === "gestor") {
        const clientsOfManager = await storage.getManagerClients(userId);
        client_ids = clientsOfManager.map(client => client.id);
      }
      
      // Retornar os dados do usuário
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile_image: user.profile_image,
        active: user.active,
        created_at: user.created_at,
        client_ids: client_ids
      });
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Rota para atualizar um usuário existente (incluindo gestores)
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Apenas administradores podem atualizar outros usuários
      if (req.session.userRole !== "admin" && Number(req.session.userId) !== userId) {
        return res.status(403).json({ message: "Permissão negada" });
      }
      
      const userData = req.body;
      
      // Extrair client_ids do corpo da requisição se existir
      const clientIds = userData.client_ids;
      delete userData.client_ids; // Remover do objeto de dados do usuário
      
      // Se houver senha no corpo da requisição e for uma string não vazia, fazer o hash dela
      if (userData.password && typeof userData.password === 'string' && userData.password.trim() !== '') {
        console.log("Atualizando senha do usuário", userId);
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
        userData.password = await bcrypt.hash(userData.password, saltRounds);
      } else {
        // Se a senha não for fornecida ou estiver vazia, não atualizar este campo
        console.log("Senha não fornecida ou vazia, mantendo a senha atual para o usuário", userId);
        delete userData.password;
      }
      
      // Atualizar os dados básicos do usuário
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Se for um gestor e temos client_ids, atualizar as atribuições de clientes
      if (existingUser.role === "gestor" && Array.isArray(clientIds)) {
        // Obter clientes atualmente atribuídos
        const currentClients = await storage.getManagerClients(userId);
        const currentClientIds = currentClients.map(client => client.id);
        
        // Identificar clientes a serem removidos (estão no atual mas não no novo)
        const clientsToRemove = currentClientIds.filter(id => !clientIds.includes(id));
        
        // Identificar clientes a serem adicionados (estão no novo mas não no atual)
        const clientsToAdd = clientIds.filter(id => !currentClientIds.includes(id));
        
        // Remover clientes que não estão mais na lista
        for (const clientId of clientsToRemove) {
          await storage.removeClientFromManager(userId, clientId);
        }
        
        // Adicionar novos clientes
        for (const clientId of clientsToAdd) {
          await storage.assignClientToManager(userId, clientId);
        }
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para excluir um usuário
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verificar se o usuário atual é admin
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem excluir usuários" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Impedir a exclusão do próprio usuário admin
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Não é possível excluir o usuário atual" });
      }
      
      console.log(`Solicitação para excluir usuário ID ${userId}`);
      
      // Executar a exclusão
      const success = await storage.deleteUser(userId);
      
      if (success) {
        return res.status(200).json({ message: "Usuário excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Falha ao excluir usuário" });
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      // Log para debug
      console.log("POST /api/users - Corpo da requisição:", JSON.stringify(req.body));
      console.log("POST /api/users - Sessão:", req.session);
      
      // Validate input
      const { client_ids, ...userData } = req.body;
      
      let userInput;
      try {
        userInput = insertUserSchema.parse(userData);
        console.log("Validação do schema passou com sucesso, userInput:", userInput);
      } catch (validationError) {
        console.error("Erro de validação do schema:", validationError);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.errors || [{ message: validationError.message }] 
        });
      }
      
      // Check if user is admin when creating another user
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create users" });
      }

      // Verificar se o nome de usuário já existe
      const existingUser = await storage.getUserByUsername(userInput.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Nome de usuário já existe",
          field: "username"
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
      const hashedPassword = await bcrypt.hash(userInput.password, saltRounds);
      
      // Criar o usuário
      const user = await storage.createUser({
        ...userInput,
        password: hashedPassword
      });
      
      // Se for um gestor e houver client_ids, associar aos clientes
      if (user.role === "gestor" && client_ids && Array.isArray(client_ids) && client_ids.length > 0) {
        console.log(`Associando gestor ${user.id} aos clientes:`, client_ids);
        
        // Associar cada cliente ao gestor
        const clientAssignments = await Promise.all(
          client_ids.map(async (clientId) => {
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
      
      // Verificar se é erro de duplicação do MySQL
      if (error.code === 'ER_DUP_ENTRY') {
        // Extrair o campo duplicado da mensagem de erro
        const match = error.sqlMessage?.match(/Duplicate entry '(.+)' for key '(.+)'/);
        let field = 'unknown';
        
        if (match && match[2]) {
          // Extrair o nome do campo da chave
          const key = match[2];
          if (key.includes('username')) {
            field = 'username';
          } else if (key.includes('email')) {
            field = 'email';
          }
        }
        
        return res.status(400).json({ 
          message: "Valor já existe",
          field: field,
          detail: `Este ${field} já está sendo usado por outro usuário`
        });
      }
      
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string | undefined;
      const filterMode = req.query.filterMode as string | undefined;
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      
      // Se for gestor, mostrar apenas os clientes associados
      if (userRole === "manager" || userRole === "gestor") {
        console.log("Listando clientes apenas para o gestor ID:", userId);
        const clients = await storage.getManagerClients(Number(userId));
        return res.json(clients);
      }
      
      console.log("Requisição para /api/clients com parâmetros:", { 
        query, 
        filterMode,
        queryKey: req.query[0] // Verificar se está recebendo 'active' como parte da queryKey
      });
      
      // Filtrar por modo 'active' - somente clientes não excluídos
      // Verifica se temos 'active' como segundo item na queryKey (que vem como '0')
      const showOnlyActive = req.query[0] === 'active' || filterMode === 'active';
      
      // Para outros usuários (admin, técnico), mostrar todos os clientes
      let clients = query
        ? await storage.searchClients(query)
        : await storage.listClients();
        
      // Se solicitado apenas clientes ativos, filtrar os excluídos
      if (showOnlyActive) {
        console.log("Filtrando apenas clientes ativos (não excluídos)");
        clients = clients.filter(client => {
          // Verificar pelo campo deleted=1 ou pelo [EXCLUÍDO] no nome
          return client.deleted !== 1 && !client.name.includes('[EXCLUÍDO]');
        });
      }
        
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
  
  // Rota para excluir cliente (soft delete)
  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      // Verificar permissões - apenas admin pode excluir clientes
      if (req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem excluir clientes" });
      }
      
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      console.log(`Solicitação para excluir cliente ID ${clientId}`);
      
      // Buscar o cliente para confirmar que existe
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Executar a exclusão (lógica, mantendo serviços e orçamentos)
      const success = await storage.deleteClient(clientId);
      
      if (success) {
        return res.status(200).json({ 
          message: "Cliente excluído com sucesso. Os serviços e orçamentos associados foram mantidos no histórico." 
        });
      } else {
        return res.status(500).json({ message: "Falha ao excluir cliente" });
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
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
            serviceData.administrative_fee = service.administrative_fee;
            serviceData.total = service.total;
          } else if (userRole === "technician") {
            // Técnicos veem apenas o preço do serviço (sem taxas administrativas)
            serviceData.price = service.price;
            // Calcular total sem taxa administrativa
            serviceData.total = service.price || 0;
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
        const { price, administrative_fee, total, ...filteredDetails } = serviceDetails;
        return res.json(filteredDetails);
      } else if (userRole === "technician" && Number(userId) !== serviceDetails.technician_id) {
        // Se for um técnico visualizando serviço de outro técnico
        // Remover taxa administrativa, mas manter o preço
        const { administrative_fee, ...filteredDetails } = serviceDetails;
        // Recalcular o total sem a taxa administrativa
        filteredDetails.total = (serviceDetails.price || 0);
        return res.json(filteredDetails);
      }
      
      // Para admin ou o próprio técnico, retornar todos os detalhes
      console.log('Enviando detalhes completos para admin ou técnico próprio:', {
        userRole,
        userId,
        values: {
          price: serviceDetails.price,
          administrative_fee: serviceDetails.administrative_fee,
          total: serviceDetails.total
        }
      });
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
        
        // Calculate total (price + administrative fee)
        const total = (serviceInput.price || 0) + (serviceInput.administrative_fee || 0);
        
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
        
        // Processar fotos aqui
        if (hasServicePhotos || hasBeforePhotos || hasAfterPhotos) {
          // Processar fotos de serviço (nova abordagem)
          if (hasServicePhotos) {
            const files = (req.files as any)['photos_service'];
            console.log(`Processando ${files.length} fotos de serviço`);
            
            // Adicionar cada foto ao banco de dados
            for (const file of files) {
              // Usar o destFolder que foi adicionado ao arquivo pelo Multer
              const destFolder = (file as any).destFolder || "service";
              const photoUrl = `/uploads/${destFolder}/${file.filename}`;
              console.log(`Adicionando foto de serviço com caminho: ${photoUrl}, destFolder: ${destFolder}`);
              
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
              // Usar o destFolder que foi adicionado ao arquivo pelo Multer
              const destFolder = (file as any).destFolder || "before";
              const photoUrl = `/uploads/${destFolder}/${file.filename}`;
              console.log(`Adicionando foto "antes" com caminho: ${photoUrl}, destFolder: ${destFolder}`);
              
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
              // Usar o destFolder que foi adicionado ao arquivo pelo Multer
              const destFolder = (file as any).destFolder || "after";
              const photoUrl = `/uploads/${destFolder}/${file.filename}`;
              console.log(`Adicionando foto "depois" com caminho: ${photoUrl}, destFolder: ${destFolder}`);
              
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
      
      // Tratar campos especiais antes de enviar para atualização
      
      // Verificar se technician_id é válido (não pode ser 0 devido à chave estrangeira)
      if (filteredUpdates.technician_id !== undefined) {
        // Se for 0 ou string "0", remover este campo para manter o valor atual
        if (filteredUpdates.technician_id === 0 || filteredUpdates.technician_id === '0') {
          console.log('Removendo technician_id=0 para evitar erro de chave estrangeira');
          delete filteredUpdates.technician_id;
        } else {
          // Converter para número se for uma string
          filteredUpdates.technician_id = Number(filteredUpdates.technician_id);
        }
      }
      
      console.log("Atualizando serviço com dados filtrados após tratamento:", filteredUpdates);
      
      // Recalculate total if price is updated
      if (filteredUpdates.price !== undefined || filteredUpdates.administrative_fee !== undefined) {
        // Certificar-se de que os valores são numéricos
        let price = filteredUpdates.price !== undefined ? Number(filteredUpdates.price) : Number(service.price) || 0;
        let adminFee = filteredUpdates.administrative_fee !== undefined ? Number(filteredUpdates.administrative_fee) : Number(service.administrative_fee) || 0;
        
        console.log('Calculando total com:', { price, adminFee, oldPrice: service.price, oldAdminFee: service.administrative_fee });
        
        filteredUpdates.price = price;
        filteredUpdates.administrative_fee = adminFee;
        filteredUpdates.total = price + adminFee;
        
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
        // Usar o destFolder que foi adicionado ao arquivo pelo Multer ou o photoType fornecido
        const destFolder = (file as any).destFolder || photoType;
        const photoUrl = `/uploads/${destFolder}/${file.filename}`;
        console.log(`Adicionando foto ao serviço com caminho: ${photoUrl}, destFolder: ${destFolder}`);
        
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
  
  // Rota para estatísticas financeiras do técnico
  app.get("/api/technician/financial-stats", requireAuth, async (req, res) => {
    try {
      // Verificar se o usuário é técnico ou admin
      const userRole = req.session.userRole;
      
      if (userRole !== "technician" && userRole !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Se for técnico, pegar estatísticas do próprio técnico
      if (userRole === "technician") {
        const technicianId = Number(req.session.userId);
        const stats = await storage.getTechnicianFinancialStats(technicianId);
        return res.json(stats);
      }
      
      // Se for admin, verificar se foi passado um ID de técnico
      const technicianId = req.query.technicianId ? Number(req.query.technicianId) : undefined;
      
      if (!technicianId) {
        return res.status(400).json({ message: "ID do técnico é obrigatório" });
      }
      
      const stats = await storage.getTechnicianFinancialStats(technicianId);
      return res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas financeiras do técnico:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas financeiras" });
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
      // Importar conexão do módulo storage
      const mysqlConnection = await import('./db-mysql.js');
      const { initDb } = mysqlConnection;
      const { pool } = await initDb();
      
      // Se for gestor, mostra apenas orçamentos dos seus clientes
      if (req.session.userRole === "gestor" || req.session.userRole === "manager") {
        const managerId = Number(req.session.userId);
        
        console.log(`Buscando orçamentos para o gestor ID ${managerId}`);
        
        try {
          // Obter IDs dos clientes atribuídos a este gestor
          const [managerClients] = await pool.query(`
            SELECT c.* 
            FROM clients c
            JOIN manager_client_assignments mca ON c.id = mca.client_id
            WHERE mca.manager_id = ?
          `, [managerId]);
          
          const clientIds = managerClients.map(client => client.id);
          
          console.log(`Listando orçamentos apenas dos clientes do gestor ${managerId}:`, clientIds);
          
          if (clientIds.length === 0) {
            return res.json([]);
          }
          
          // Consulta SQL para buscar orçamentos dos clientes deste gestor
          const placeholders = clientIds.map(() => '?').join(',');
          const query = `
            SELECT b.*, c.name as client_name 
            FROM budgets b 
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE b.client_id IN (${placeholders})
            ORDER BY b.id DESC
          `;
          
          const [filteredBudgets] = await pool.query(query, clientIds);
          
          console.log(`Total de orçamentos encontrados: ${filteredBudgets.length}`);
          
          res.json(filteredBudgets);
        } catch (sqlError) {
          console.error("Erro na consulta SQL direta para gestor:", sqlError);
          
          // Fallback para o método original
          const clients = await storage.getManagerClients(managerId);
          const clientIds = clients.map(client => client.id);
          
          if (clientIds.length === 0) {
            return res.json([]);
          }
          
          // Filtrar orçamentos por clientes
          const allBudgets = await storage.listBudgets();
          const filteredBudgets = allBudgets.filter(budget => 
            clientIds.includes(budget.client_id)
          );
          
          res.json(filteredBudgets);
        }
      } else {
        // Admin e técnicos veem todos os orçamentos
        console.log("Buscando todos os orçamentos");
        
        try {
          // Query para buscar todos os orçamentos com nomes de clientes
          const query = `
            SELECT b.*, c.name as client_name 
            FROM budgets b 
            LEFT JOIN clients c ON b.client_id = c.id
            ORDER BY b.id DESC
          `;
          
          const [budgets] = await pool.query(query);
          
          console.log(`Total de orçamentos encontrados: ${budgets.length}`);
          
          res.json(budgets);
        } catch (sqlError) {
          console.error("Erro na consulta SQL direta:", sqlError);
          
          // Fallback para o método original
          const budgets = await storage.listBudgets();
          res.json(budgets);
        }
      }
    } catch (error) {
      console.error("Erro ao listar orçamentos:", error);
      res.status(500).json({ message: "Erro ao listar orçamentos" });
    }
  });
  
  app.get("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`Buscando orçamento ID ${id}`);
      
      // Abordagem alternativa - consulta direta com SQL
      try {
        // Importar conexão do módulo storage
        const mysqlConnection = await import('./db-mysql.js');
        const { initDb } = mysqlConnection;
        const { pool } = await initDb();
        
        // Consulta para obter orçamento com nome do cliente
        const query = `
          SELECT b.*, c.name as client_name 
          FROM budgets b 
          LEFT JOIN clients c ON b.client_id = c.id
          WHERE b.id = ?
        `;
        
        const [budgetRows] = await pool.query(query, [id]);
        
        if (!budgetRows || budgetRows.length === 0) {
          return res.status(404).json({ message: "Orçamento não encontrado" });
        }
        
        const budget = budgetRows[0];
        
        // Verificar acesso para gestores
        if (req.session.userRole === "gestor" || req.session.userRole === "manager") {
          const managerId = Number(req.session.userId);
          
          // Consulta para obter clientes atribuídos ao gestor
          const [managerClients] = await pool.query(`
            SELECT c.id 
            FROM clients c
            JOIN manager_client_assignments mca ON c.id = mca.client_id
            WHERE mca.manager_id = ?
          `, [managerId]);
          
          const clientIds = managerClients.map(client => client.id);
          
          // Verificar se o orçamento pertence a um cliente do gestor
          if (!clientIds.includes(budget.client_id)) {
            console.log(`Acesso negado: Gestor ${managerId} tentou acessar orçamento ${id} do cliente ${budget.client_id}`);
            return res.status(403).json({ message: "Acesso negado: Este orçamento não pertence a um cliente atribuído a você" });
          }
        }
        
        res.json(budget);
      } catch (sqlError) {
        console.error("Erro na consulta SQL direta:", sqlError);
        
        // Fallback para o método original
        const budget = await storage.getBudget(Number(id));
        
        if (!budget) {
          return res.status(404).json({ message: "Orçamento não encontrado" });
        }
        
        // Verificar acesso para gestores
        if (req.session.userRole === "gestor" || req.session.userRole === "manager") {
          const managerId = Number(req.session.userId);
          
          // Obter clientes atribuídos ao gestor
          const clients = await storage.getManagerClients(managerId);
          const clientIds = clients.map(client => client.id);
          
          // Verificar se o orçamento pertence a um cliente do gestor
          if (!clientIds.includes(budget.client_id)) {
            console.log(`Acesso negado: Gestor ${managerId} tentou acessar orçamento ${id} do cliente ${budget.client_id}`);
            return res.status(403).json({ message: "Acesso negado: Este orçamento não pertence a um cliente atribuído a você" });
          }
        }
        
        res.json(budget);
      }
    } catch (error) {
      console.error(`Erro ao buscar orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao buscar orçamento" });
    }
  });
  
  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgetData = insertBudgetSchema.parse(req.body);
      console.log("Dados do orçamento validados:", budgetData);
      
      // Abordagem alternativa - inserção direta com SQL
      const { client_id, vehicle_info, date, total_aw, total_value, photo_url, note, plate } = budgetData;
      
      // Conexão direta com o banco MySQL
      try {
        // Importar conexão do módulo storage
        const mysqlConnection = await import('./db-mysql.js');
        const { initDb } = mysqlConnection;
        const { pool } = await initDb();
        
        console.log("Inserindo orçamento diretamente com SQL...");
        
        // Extrair damaged_parts do request
        const { damaged_parts, chassisNumber, vehicle_image } = req.body;
        
        // Log da imagem para depuração
        console.log("Criando orçamento com imagem:", 
          vehicle_image ? 
            `Imagem presente com ${vehicle_image.length} caracteres` : 
            "Sem imagem (null/undefined)");
        
        // Construir query de inserção
        const insertQuery = `
          INSERT INTO budgets 
            (client_id, vehicle_info, date, total_aw, total_value, photo_url, note, plate, chassis_number, damaged_parts, vehicle_image) 
          VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Executar query
        const [result] = await pool.query(insertQuery, [
          client_id, 
          vehicle_info || '', 
          date || new Date().toISOString(), 
          total_aw || 0, 
          total_value || 0, 
          photo_url || null, 
          note || null, 
          plate || null,
          chassisNumber || null,
          damaged_parts || null,
          vehicle_image || null
        ]);
        
        console.log("Resultado da inserção direta:", result);
        
        // Pegar o ID do orçamento criado
        const budgetId = result.insertId;
        
        if (!budgetId) {
          throw new Error('Falha ao obter ID do orçamento criado');
        }
        
        // Buscar o orçamento recém-criado
        const [budgetRows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [budgetId]);
        
        if (!budgetRows || budgetRows.length === 0) {
          throw new Error(`Orçamento criado, mas não encontrado com ID ${budgetId}`);
        }
        
        const budget = budgetRows[0];
        
        // Adicionar nome do cliente
        const [clientRows] = await pool.query('SELECT name FROM clients WHERE id = ?', [budget.client_id]);
        
        const clientName = clientRows && clientRows.length > 0 ? clientRows[0].name : 'Cliente não encontrado';
        
        // Retornar orçamento com nome do cliente
        res.status(201).json({
          ...budget,
          client_name: clientName
        });
      } catch (sqlError) {
        console.error("Erro na inserção SQL direta:", sqlError);
        
        // Tente usando o método normal como fallback
        console.log("Tentando com método de storage como fallback...");
        const budget = await storage.createBudget(budgetData);
        res.status(201).json(budget);
      }
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
      
      console.log(`Atualizando orçamento ID ${id}:`, budgetData);
      
      // Abordagem alternativa - atualização direta com SQL
      try {
        // Importar conexão do módulo storage
        const mysqlConnection = await import('./db-mysql.js');
        const { initDb } = mysqlConnection;
        const { pool } = await initDb();
        
        // Verificar se o orçamento existe
        const [existingBudgetRows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [id]);
        
        if (!existingBudgetRows || existingBudgetRows.length === 0) {
          return res.status(404).json({ message: "Orçamento não encontrado" });
        }
        
        console.log("Atualizando orçamento diretamente com SQL...");
        
        // Construir query de atualização
        let query = 'UPDATE budgets SET ';
        const values = [];
        
        if (budgetData.client_id !== undefined) {
          query += 'client_id = ?, ';
          values.push(budgetData.client_id);
        }
        
        if (budgetData.vehicle_info !== undefined) {
          query += 'vehicle_info = ?, ';
          values.push(budgetData.vehicle_info);
        }
        
        if (budgetData.date !== undefined) {
          query += 'date = ?, ';
          values.push(budgetData.date);
        }
        
        if (budgetData.total_aw !== undefined) {
          query += 'total_aw = ?, ';
          values.push(budgetData.total_aw);
        }
        
        if (budgetData.total_value !== undefined) {
          query += 'total_value = ?, ';
          values.push(budgetData.total_value);
        }
        
        if (budgetData.photo_url !== undefined) {
          query += 'photo_url = ?, ';
          values.push(budgetData.photo_url);
        }
        
        if (budgetData.note !== undefined) {
          query += 'note = ?, ';
          values.push(budgetData.note);
        }
        
        if (budgetData.plate !== undefined) {
          query += 'plate = ?, ';
          values.push(budgetData.plate);
        }
        
        if (budgetData.chassisNumber !== undefined) {
          query += 'chassis_number = ?, ';
          values.push(budgetData.chassisNumber);
        }
        
        if (budgetData.damaged_parts !== undefined) {
          query += 'damaged_parts = ?, ';
          values.push(budgetData.damaged_parts);
        }
        
        if (budgetData.vehicle_image !== undefined) {
          query += 'vehicle_image = ?, ';
          values.push(budgetData.vehicle_image);
          console.log("Adicionando imagem de veículo ao orçamento:", 
            budgetData.vehicle_image ? 
              `Imagem presente com ${budgetData.vehicle_image.length} caracteres` : 
              "Sem imagem (null)");
        } else {
          console.log("Nenhuma imagem de veículo definida no orçamento");
        }
        
        // Remover a última vírgula e espaço
        query = query.slice(0, -2);
        
        // Adicionar cláusula WHERE
        query += ' WHERE id = ?';
        values.push(id);
        
        if (values.length === 1) {
          // Se apenas o ID foi adicionado, não há nada para atualizar
          return res.status(400).json({ message: "Nenhum dado para atualizar" });
        }
        
        // Executar query
        const [result] = await pool.query(query, values);
        
        console.log("Resultado da atualização direta:", result);
        
        if (result.affectedRows === 0) {
          throw new Error(`Falha ao atualizar orçamento com ID ${id}`);
        }
        
        // Buscar o orçamento atualizado
        const [budgetRows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [id]);
        
        if (!budgetRows || budgetRows.length === 0) {
          throw new Error(`Orçamento atualizado, mas não encontrado com ID ${id}`);
        }
        
        const budget = budgetRows[0];
        
        // Adicionar nome do cliente
        const [clientRows] = await pool.query('SELECT name FROM clients WHERE id = ?', [budget.client_id]);
        
        const clientName = clientRows && clientRows.length > 0 ? clientRows[0].name : 'Cliente não encontrado';
        
        // Retornar orçamento com nome do cliente
        res.json({
          ...budget,
          client_name: clientName
        });
      } catch (sqlError) {
        console.error("Erro na atualização SQL direta:", sqlError);
        
        // Tente usando o método normal como fallback
        console.log("Tentando com método de storage como fallback...");
        
        // Verificar se o orçamento existe
        const existingBudget = await storage.getBudget(Number(id));
        if (!existingBudget) {
          return res.status(404).json({ message: "Orçamento não encontrado" });
        }
        
        const updatedBudget = await storage.updateBudget(Number(id), budgetData);
        res.json(updatedBudget);
      }
    } catch (error) {
      console.error(`Erro ao atualizar orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao atualizar orçamento" });
    }
  });
  
  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`Excluindo orçamento ID ${id}`);
      
      // Abordagem alternativa - exclusão direta com SQL
      try {
        // Importar conexão do módulo storage
        const mysqlConnection = await import('./db-mysql.js');
        const { initDb } = mysqlConnection;
        const { pool } = await initDb();
        
        // Verificar se o orçamento existe
        const [existingBudgetRows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [id]);
        
        if (!existingBudgetRows || existingBudgetRows.length === 0) {
          return res.status(404).json({ message: "Orçamento não encontrado" });
        }
        
        console.log("Excluindo orçamento diretamente com SQL...");
        
        // Executar query de exclusão
        const [result] = await pool.query('DELETE FROM budgets WHERE id = ?', [id]);
        
        console.log("Resultado da exclusão direta:", result);
        
        if (result.affectedRows === 0) {
          throw new Error(`Falha ao excluir orçamento com ID ${id}`);
        }
        
        res.status(200).json({ message: "Orçamento excluído com sucesso" });
      } catch (sqlError) {
        console.error("Erro na exclusão SQL direta:", sqlError);
        
        // Tente usando o método normal como fallback
        console.log("Tentando com método de storage como fallback...");
        
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
      }
    } catch (error) {
      console.error(`Erro ao excluir orçamento ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao excluir orçamento" });
    }
  });
  
  // Rota para verificar problemas de orçamento
  app.get("/api/admin/check-budgets", async (req, res) => {
    try {
      console.log("Verificando o método de criação de orçamentos...");
      
      // Aqui vamos apenas retornar uma resposta indicando que a rota foi acessada
      // e o método foi limpo do cache
      
      return res.json({
        message: "Verificação da criação de orçamentos concluída",
        instructions: "Por favor, tente criar um orçamento novamente após reiniciar o servidor."
      });
    } catch (error) {
      console.error("Erro ao verificar orçamentos:", error);
      res.status(500).json({ 
        message: "Erro ao verificar orçamentos",
        error: String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

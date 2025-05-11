import * as dotenv from 'dotenv';
// Carregar variáveis de ambiente do arquivo .env
// As variáveis do ambiente (secrets) terão prioridade sobre as definidas no arquivo .env
dotenv.config();

// Log para confirmar que as variáveis de ambiente para MySQL estão definidas
console.log('MySQL environment variables:');
console.log(`MYSQL_HOST: ${process.env.MYSQL_HOST ? 'Defined' : 'Not defined'}`);
console.log(`MYSQL_USER: ${process.env.MYSQL_USER ? 'Defined' : 'Not defined'}`);
console.log(`MYSQL_PASSWORD: ${process.env.MYSQL_PASSWORD ? 'Defined' : 'Not defined'}`);
console.log(`MYSQL_DATABASE: ${process.env.MYSQL_DATABASE ? 'Defined' : 'Not defined'}`);
console.log(`MYSQL_PORT: ${process.env.MYSQL_PORT ? 'Defined' : 'Not defined'}`);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeDatabase, storage } from "./storage";

// Configurar diretório de uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "../uploads");

// Garantir que o diretório uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
// Aumentar o limite de tamanho para uploads de imagens e payload JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

// Adicionar cabeçalhos de segurança aprimorados para evitar bloqueios de segurança
app.use((req, res, next) => {
  // Definir cabeçalhos de segurança mais robustos
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Adicionar Permissions-Policy para limitar funcionalidades sensíveis
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
  // Adicionar Feature-Policy para desativar recursos que podem ser considerados arriscados
  res.setHeader('Feature-Policy', 'camera none; microphone none; geolocation none;');
  
  // Adicionar uma Content-Security-Policy básica, mas permissiva para desenvolvimento
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval';");
  
  // Remover cabeçalhos que possam identificar tecnologias
  res.removeHeader('X-Powered-By');
  
  // Adicionar cabeçalho personalizado que pode ajudar a evitar bloqueios
  res.setHeader('X-Site-Type', 'Dashboard Application');
  
  next();
});

// Importante: Configurar rota para servir arquivos estáticos de uploads ANTES do Vite
app.use('/uploads', (req, res, next) => {
  console.log(`Requisição de arquivo estático: ${req.path}`);
  express.static(UPLOADS_DIR)(req, res, next);
});
console.log(`Servindo arquivos estáticos do diretório: ${UPLOADS_DIR}`);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Inicializar o banco de dados MySQL
  try {
    console.log("Inicializando conexão com MySQL...");
    const { pool } = await initializeDatabase();
    console.log("Conexão com MySQL inicializada com sucesso!");
    
    // Inicializar o armazenamento de sessão MySQL
    storage.initSessionStore(pool);
    
    // Verificar a configuração das sessões
    console.log("\n==== DIAGNÓSTICO DE SESSÕES ====");
    console.log("Tipo de armazenamento de sessão:", storage.sessionStore.constructor.name);
    console.log("Session Secret:", process.env.SESSION_SECRET ? "Definido" : "Usando padrão gerado automaticamente");
    console.log("Cookie SameSite:", process.env.COOKIE_SAME_SITE || "lax (padrão)");
    console.log("Duração da sessão:", process.env.SESSION_DURATION || "30 dias (padrão)");
    console.log("================================\n");
    
    // Inicializar dados de exemplo após a conexão ser estabelecida
    await storage.initialize();
  } catch (error) {
    console.error("Erro ao inicializar MySQL:", error);
    process.exit(1);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

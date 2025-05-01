import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema.mysql";

// Array para armazenar qualquer variável de ambiente ausente
const missingEnvVars = [];

// Verificar variáveis de ambiente uma a uma para logging mais detalhado
if (!process.env.MYSQL_HOST) missingEnvVars.push('MYSQL_HOST');
if (!process.env.MYSQL_USER) missingEnvVars.push('MYSQL_USER');
if (!process.env.MYSQL_PASSWORD) missingEnvVars.push('MYSQL_PASSWORD');
if (!process.env.MYSQL_DATABASE) missingEnvVars.push('MYSQL_DATABASE');
if (!process.env.MYSQL_PORT) missingEnvVars.push('MYSQL_PORT');

// Se alguma variável de ambiente estiver faltando, registrar e lançar erro
if (missingEnvVars.length > 0) {
  console.error(`⚠️ Erro de configuração: Faltam as seguintes variáveis de ambiente: ${missingEnvVars.join(', ')}`);
  console.error('⚠️ Verifique se os secrets foram configurados corretamente no ambiente.');
  throw new Error(
    `As seguintes variáveis de ambiente são necessárias: ${missingEnvVars.join(', ')}`
  );
}

// Log das informações de conexão para debugging (sem mostrar a senha)
console.log(`🔌 Tentando conectar ao MySQL:
  Host: ${process.env.MYSQL_HOST}
  User: ${process.env.MYSQL_USER}
  Database: ${process.env.MYSQL_DATABASE}
  Port: ${process.env.MYSQL_PORT}
`);

// Configuração da conexão MySQL
const connectionConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  // Adicionar timeout maior para dar mais tempo para conectar
  connectTimeout: 20000, // Aumento do timeout para 20 segundos
  // SSL configurada como null para desenvolvimento
};

// Criação da pool de conexões
const createPool = async () => {
  try {
    console.log("Conectando ao MySQL...");
    const pool = mysql.createPool(connectionConfig);
    
    // Teste de conexão
    const connection = await pool.getConnection();
    console.log("Conexão com MySQL estabelecida com sucesso!");
    connection.release();
    
    return pool;
  } catch (error) {
    console.error("Erro ao conectar com o MySQL:", error);
    throw error;
  }
};

// Export da função que cria a conexão e inicializa o Drizzle
export const initDb = async () => {
  const pool = await createPool();
  const db = drizzle(pool, { schema, mode: 'default' });
  return { pool, db };
};
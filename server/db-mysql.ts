import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Verificar se todas as variáveis de ambiente necessárias estão definidas
if (!process.env.AWS_DB_HOST || 
    !process.env.AWS_DB_USER || 
    !process.env.AWS_DB_PASSWORD || 
    !process.env.AWS_DB_NAME || 
    !process.env.AWS_DB_PORT) {
  throw new Error(
    "AWS_DB_HOST, AWS_DB_USER, AWS_DB_PASSWORD, AWS_DB_NAME e AWS_DB_PORT devem estar configurados."
  );
}

// Configuração da conexão MySQL
const connectionConfig = {
  host: process.env.AWS_DB_HOST,
  user: process.env.AWS_DB_USER,
  password: process.env.AWS_DB_PASSWORD,
  database: process.env.AWS_DB_NAME,
  port: parseInt(process.env.AWS_DB_PORT || '3306'),
  ssl: false // Desabilitar SSL para desenvolvimento
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
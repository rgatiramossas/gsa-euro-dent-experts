import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema.mysql";

// Verificar se todas as variáveis de ambiente necessárias estão definidas
if (!process.env.MYSQL_HOST || 
    !process.env.MYSQL_USER || 
    !process.env.MYSQL_PASSWORD || 
    !process.env.MYSQL_DATABASE || 
    !process.env.MYSQL_PORT) {
  throw new Error(
    "MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE e MYSQL_PORT devem estar configurados."
  );
}

// Configuração da conexão MySQL
const connectionConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306')
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
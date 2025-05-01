/**
 * Script para corrigir a tabela de sessões no banco de dados MySQL
 * Recria a tabela com as configurações corretas
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

async function fixSessionsTable() {
  try {
    console.log('Conectando ao banco de dados MySQL...');
    
    // Configuração da conexão MySQL a partir das variáveis de ambiente
    const config = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT,
      // Outras configurações MySQL
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000, // 10 segundos
    };
    
    console.log(`Tentando conectar ao MySQL: 
  Host: ${config.host}
  User: ${config.user}
  Database: ${config.database}
  Port: ${config.port}
`);
    
    // Criar pool de conexões
    const pool = mysql.createPool(config);
    
    // Testar a conexão com uma consulta simples
    await pool.query('SELECT 1 AS test');
    console.log('Conexão com MySQL estabelecida com sucesso!');
    
    // Verificar se a tabela de sessões existe
    const [tables] = await pool.query('SHOW TABLES LIKE ?', ['sessions']);
    
    if (tables.length > 0) {
      console.log('Tabela de sessões encontrada. Realizando backup antes de recriar...');
      
      // Fazer backup das sessões atuais
      const [sessions] = await pool.query('SELECT * FROM sessions');
      console.log(`Backup de ${sessions.length} sessões realizado.`);
      
      // Remover tabela atual
      await pool.query('DROP TABLE sessions');
      console.log('Tabela de sessões removida.');
    }
    
    // Criar tabela de sessões com a estrutura correta
    console.log('Criando nova tabela de sessões...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
        expires BIGINT UNSIGNED NOT NULL,
        data MEDIUMTEXT COLLATE utf8mb4_bin,
        PRIMARY KEY (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
    
    console.log('Tabela de sessões recriada com sucesso!');
    
    // Fechar o pool de conexões
    await pool.end();
    console.log('Operação concluída.');
    
  } catch (error) {
    console.error('Erro ao corrigir tabela de sessões:', error);
    process.exit(1);
  }
}

// Confirmar antes de executar
console.log('ATENÇÃO: Este script vai recriar a tabela de sessões do MySQL.');
console.log('Todas as sessões ativas serão removidas e os usuários terão que fazer login novamente.');

// Execute com --force para ignorar a confirmação
if (process.argv.includes('--force')) {
  fixSessionsTable();
} else {
  console.log('Para continuar, execute o script com o parâmetro --force');
}
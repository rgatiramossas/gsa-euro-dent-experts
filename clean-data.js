import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function cleanDatabase() {
  console.log('Iniciando limpeza do banco de dados...');
  
  const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10)
  };
  
  console.log('Conectando ao MySQL...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  
  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conectado com sucesso ao MySQL!');
    
    // Desativar verificações de chave estrangeira
    console.log('Desativando verificações de chave estrangeira...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Lista de tabelas para limpar
    const tablesToTruncate = [
      'photos',
      'events',
      'services',
      'budget_details',
      'budgets',
      'hail_calculation',
      'vehicles',
      'clients'
    ];
    
    // Limpar cada tabela
    for (const table of tablesToTruncate) {
      console.log(`Limpando tabela: ${table}...`);
      try {
        await connection.execute(`TRUNCATE TABLE ${table}`);
        console.log(`✅ Tabela ${table} limpa com sucesso!`);
      } catch (err) {
        console.error(`❌ Erro ao limpar tabela ${table}:`, err.message);
      }
    }
    
    // Reativar verificações de chave estrangeira
    console.log('Reativando verificações de chave estrangeira...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Fechar conexão
    await connection.end();
    console.log('Limpeza de dados concluída com sucesso!');
    
  } catch (err) {
    console.error('Erro ao limpar o banco de dados:', err);
  }
}

// Executar a função
cleanDatabase();
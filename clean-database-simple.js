/**
 * Script simples para limpar o banco de dados
 * Remove clientes, veículos, ordens de serviço e orçamentos
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

// Configuração do banco de dados a partir de variáveis de ambiente
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

// Função principal para limpar o banco de dados
const cleanDatabase = async () => {
  console.log('\n--- Limpando banco de dados para produção ---');
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection(dbConfig);
    console.log('Conexão estabelecida.');
    
    // Desativar verificação de chaves estrangeiras
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Lista de tabelas a serem limpadas
    const tables = [
      'budgets',
      'services',
      'vehicles',
      'clients',
      'sessions'
    ];
    
    // Limpar cada tabela
    for (const table of tables) {
      try {
        console.log(`Limpando tabela: ${table}`);
        
        // Verificar se a tabela existe
        const [exists] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = ? 
          AND table_name = ?
        `, [dbConfig.database, table]);
        
        if (exists[0].count > 0) {
          // Contar registros antes da limpeza
          const [countBefore] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`  Registros antes: ${countBefore[0].count}`);
          
          // Truncar a tabela
          await connection.query(`TRUNCATE TABLE ${table}`);
          
          // Contar registros após a limpeza
          const [countAfter] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`  Registros após: ${countAfter[0].count}`);
        } else {
          console.log(`  Tabela ${table} não existe, pulando...`);
        }
      } catch (error) {
        console.error(`  Erro ao limpar tabela ${table}:`, error.message);
      }
    }
    
    // Reativar verificação de chaves estrangeiras
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    // Verificar contagens de usuários
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    console.log('\n--- Resultado da limpeza ---');
    console.log(`Usuários mantidos: ${userCount[0].count}`);
    
    console.log('\n--- BANCO DE DADOS PRONTO PARA PRODUÇÃO ---');
    console.log('Todos os dados de teste foram removidos.');
    console.log('Apenas os usuários foram mantidos no sistema.');
    
  } catch (error) {
    console.error('Erro ao limpar banco de dados:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com o banco de dados encerrada.');
    }
  }
};

// Executar o script
cleanDatabase();
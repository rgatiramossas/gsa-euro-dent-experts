/**
 * Script para remover todos os dados do banco de dados
 * Remove clientes, veículos, ordens de serviço e orçamentos
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function cleanDatabase() {
  try {
    // Conexão com o banco de dados
    const pool = await mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Conectado ao banco de dados MySQL');
    console.log('Iniciando limpeza do banco de dados...');

    // Array de consultas a serem executadas em ordem
    const queries = [
      // Primeiro, remover dados das tabelas dependentes
      "DELETE FROM service_photos WHERE 1=1;",
      "DELETE FROM payment_request_items WHERE 1=1;",
      "DELETE FROM payment_requests WHERE 1=1;",
      "DELETE FROM events WHERE 1=1;",
      "DELETE FROM expenses WHERE 1=1;",
      "DELETE FROM services WHERE 1=1;",
      "DELETE FROM budgets WHERE 1=1;",
      "DELETE FROM vehicles WHERE 1=1;",
      "DELETE FROM manager_client_assignments WHERE 1=1;",
      "DELETE FROM clients WHERE 1=1;",
      
      // Reset das sequências de auto-incremento
      "ALTER TABLE clients AUTO_INCREMENT = 1;",
      "ALTER TABLE vehicles AUTO_INCREMENT = 1;",
      "ALTER TABLE services AUTO_INCREMENT = 1;",
      "ALTER TABLE budgets AUTO_INCREMENT = 1;",
      "ALTER TABLE expenses AUTO_INCREMENT = 1;",
      "ALTER TABLE events AUTO_INCREMENT = 1;",
      "ALTER TABLE payment_requests AUTO_INCREMENT = 1;",
      "ALTER TABLE payment_request_items AUTO_INCREMENT = 1;",
      "ALTER TABLE service_photos AUTO_INCREMENT = 1;",
      "ALTER TABLE manager_client_assignments AUTO_INCREMENT = 1;"
    ];

    // Executar cada consulta em sequência
    for (const query of queries) {
      console.log(`Executando: ${query}`);
      const [result] = await pool.query(query);
      console.log(`Linhas afetadas: ${result.affectedRows}`);
    }

    console.log('Limpeza do banco de dados concluída com sucesso!');
    
    // Fechar conexão
    await pool.end();
    console.log('Conexão fechada');

  } catch (error) {
    console.error('Erro ao limpar o banco de dados:', error);
  }
}

// Executar a função principal
cleanDatabase();
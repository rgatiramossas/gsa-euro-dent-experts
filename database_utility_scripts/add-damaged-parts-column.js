// Script para adicionar a coluna damaged_parts à tabela budgets
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Conexão com o banco de dados
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  console.log('Conectado ao banco de dados MySQL');

  try {
    // Verificar se a coluna damaged_parts já existe
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budgets' AND COLUMN_NAME = 'damaged_parts'
    `, [process.env.MYSQL_DATABASE]);

    if (columns.length === 0) {
      console.log('A coluna damaged_parts não existe. Adicionando...');
      
      // Adicionar a coluna damaged_parts
      await pool.query(`
        ALTER TABLE budgets 
        ADD COLUMN damaged_parts TEXT NULL
      `);
      
      console.log('Coluna damaged_parts adicionada com sucesso!');
    } else {
      console.log('A coluna damaged_parts já existe na tabela budgets.');
    }
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
  } finally {
    await pool.end();
    console.log('Conexão encerrada');
  }
}

main().catch(console.error);
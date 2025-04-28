// Script para verificar a estrutura da tabela budgets
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
    // Verificar a estrutura da tabela budgets
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budgets'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MYSQL_DATABASE]);

    console.log('Estrutura da tabela budgets:');
    console.table(columns);
    
    // Verificar dados da tabela budgets
    const [budgets] = await pool.query('SELECT * FROM budgets');
    
    console.log(`\nTotal de ${budgets.length} orçamentos encontrados:`);
    
    budgets.forEach((budget, index) => {
      console.log(`\nOrçamento #${index + 1} (ID: ${budget.id}):`);
      console.log(JSON.stringify(budget, null, 2));
    });

  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
  } finally {
    await pool.end();
    console.log('\nConexão encerrada');
  }
}

main().catch(console.error);
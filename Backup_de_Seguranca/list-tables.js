import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listTables() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    connectTimeout: 10000
  });

  try {
    console.log('Conectado ao MySQL com sucesso!');
    
    // Listar tabelas
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tabelas no banco de dados:');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    }
    
    // Verificar se as tabelas essenciais existem
    const essentialTables = ['users', 'clients', 'vehicles', 'services', 'service_types'];
    console.log('\nVerificando tabelas essenciais:');
    for (const tableName of essentialTables) {
      const exists = tables.some(t => Object.values(t)[0] === tableName);
      console.log(`- ${tableName}: ${exists ? 'Existe' : 'Não existe'}`);
    }
    
  } catch (error) {
    console.error('Erro ao listar tabelas:', error.message);
  } finally {
    await connection.end();
    console.log('Conexão com MySQL encerrada.');
  }
}

listTables().catch(console.error);
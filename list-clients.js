import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listClients() {
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
    
    // Contar clientes
    const [clientsCount] = await connection.query('SELECT COUNT(*) as count FROM clients');
    console.log(`Total de clientes: ${clientsCount[0].count}`);
    
    // Listar clientes
    const [clients] = await connection.query('SELECT * FROM clients LIMIT 10');
    console.log('\nClientes (limitados a 10):');
    clients.forEach(client => {
      console.log(`ID: ${client.id}, Nome: ${client.name}, Email: ${client.email || 'N/A'}, Telefone: ${client.phone || 'N/A'}`);
    });
    
    // Verificar relação com veículos
    console.log('\nContagem de veículos por cliente:');
    const [vehicleCounts] = await connection.query(`
      SELECT c.id, c.name, COUNT(v.id) as vehicle_count 
      FROM clients c 
      LEFT JOIN vehicles v ON c.id = v.client_id 
      GROUP BY c.id 
      ORDER BY vehicle_count DESC 
      LIMIT 5
    `);
    
    vehicleCounts.forEach(item => {
      console.log(`Cliente ID ${item.id} (${item.name}): ${item.vehicle_count} veículo(s)`);
    });
    
  } catch (error) {
    console.error('Erro ao listar clientes:', error.message);
  } finally {
    await connection.end();
    console.log('Conexão com MySQL encerrada.');
  }
}

listClients().catch(console.error);
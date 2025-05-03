import mysql from 'mysql2/promise';
import 'dotenv/config';

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

async function listServices() {
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao MySQL com sucesso!');
    
    // Consultar ordens de serviço
    const [services] = await connection.query(`
      SELECT s.*, c.name as client_name, u.name as technician_name
      FROM services s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.technician_id = u.id
      ORDER BY s.created_at DESC
    `);
    
    console.log(`Total de ordens de serviço: ${services.length}\n`);
    
    if (services.length === 0) {
      console.log('Não há ordens de serviço cadastradas no sistema.');
    } else {
      console.log('Ordens de Serviço:');
      services.forEach(service => {
        console.log(`ID: ${service.id}, Cliente: ${service.client_name}, Status: ${service.status}, Valor: ${service.total_value || 0}, Técnico: ${service.technician_name || 'Não atribuído'}`);
      });
    }
    
    // Consultar orçamentos
    const [budgets] = await connection.query(`
      SELECT b.*, c.name as client_name
      FROM budgets b
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.created_at DESC
    `);
    
    console.log(`\nTotal de orçamentos: ${budgets.length}\n`);
    
    if (budgets.length === 0) {
      console.log('Não há orçamentos cadastrados no sistema.');
    } else {
      console.log('Orçamentos:');
      budgets.forEach(budget => {
        console.log(`ID: ${budget.id}, Cliente: ${budget.client_name}, Veículo: ${budget.vehicle_info}, Valor: ${budget.total_value || 0}`);
      });
    }
    
  } catch (error) {
    console.error('Erro ao acessar o banco de dados:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com MySQL encerrada.');
    }
  }
}

listServices();
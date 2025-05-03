import mysql from 'mysql2/promise';
import 'dotenv/config';

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

async function checkVehicles() {
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao MySQL com sucesso!');
    
    // Consultar veículos
    const [vehicles] = await connection.query(`
      SELECT v.*, c.name as client_name 
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
    `);
    
    console.log(`Total de veículos: ${vehicles.length}\n`);
    
    if (vehicles.length === 0) {
      console.log('Não há veículos cadastrados no sistema.');
    } else {
      console.log('Veículos:');
      vehicles.forEach(vehicle => {
        console.log(`ID: ${vehicle.id}, Marca: ${vehicle.brand}, Modelo: ${vehicle.model}, Placa: ${vehicle.license_plate}, Cliente: ${vehicle.client_name}`);
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

checkVehicles();
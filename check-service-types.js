import mysql from 'mysql2/promise';
import 'dotenv/config';

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

async function checkServiceTypes() {
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao MySQL com sucesso!');
    
    // Consultar tipos de serviço
    const [serviceTypes] = await connection.query('SELECT * FROM service_types');
    
    console.log(`Total de tipos de serviço: ${serviceTypes.length}\n`);
    console.log('Tipos de serviço:');
    serviceTypes.forEach(type => {
      console.log(`ID: ${type.id}, Nome: ${type.name}`);
    });
    
  } catch (error) {
    console.error('Erro ao acessar o banco de dados:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com MySQL encerrada.');
    }
  }
}

checkServiceTypes();
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listServices() {
  try {
    // Criar conexão
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT
    });

    // Listar todos os serviços
    const [services] = await connection.query(`
      SELECT s.id, s.client_id, c.name as client_name, s.service_type_id, st.name as service_type, 
             s.status, s.created_at 
      FROM services s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN service_types st ON s.service_type_id = st.id
      ORDER BY s.id DESC
    `);
    
    console.log('Todos os serviços:');
    services.forEach(s => {
      console.log(`ID: ${s.id}, Cliente: ${s.client_name}, Tipo: ${s.service_type}, Status: ${s.status}, Criado: ${s.created_at}`);
    });
    console.log(`Total: ${services.length} serviços`);
    
    // Fechar conexão
    await connection.end();
  } catch (error) {
    console.error('Erro ao listar serviços:', error.message);
  }
}

listServices();
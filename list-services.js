import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listServices() {
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
    
    // Contar serviços
    const [servicesCount] = await connection.query('SELECT COUNT(*) as count FROM services');
    console.log(`Total de serviços: ${servicesCount[0].count}`);
    
    // Contar serviços por status
    const [servicesByStatus] = await connection.query('SELECT status, COUNT(*) as count FROM services GROUP BY status');
    console.log('\nServiços por status:');
    servicesByStatus.forEach(status => {
      console.log(`Status "${status.status}": ${status.count} serviço(s)`);
    });
    
    // Listar serviços (com informações de cliente e veículo)
    const [services] = await connection.query(`
      SELECT s.id, s.status, s.description, s.scheduled_date, s.location_type, s.price,
             c.name as client_name, v.make, v.model, v.license_plate
      FROM services s
      JOIN clients c ON s.client_id = c.id
      JOIN vehicles v ON s.vehicle_id = v.id
      ORDER BY s.id DESC
      LIMIT 5
    `);
    
    console.log('\nÚltimos serviços cadastrados:');
    services.forEach(service => {
      const scheduledDate = service.scheduled_date ? new Date(service.scheduled_date).toLocaleDateString('pt-BR') : 'Não agendado';
      console.log(`ID: ${service.id}, Cliente: ${service.client_name}`);
      console.log(`  Veículo: ${service.make} ${service.model} (${service.license_plate || 'Sem placa'})`);
      console.log(`  Status: ${service.status}, Data agendada: ${scheduledDate}`);
      console.log(`  Tipo de localização: ${service.location_type}, Preço: R$ ${service.price || 0}`);
      console.log('  -----');
    });
    
  } catch (error) {
    console.error('Erro ao listar serviços:', error.message);
  } finally {
    await connection.end();
    console.log('Conexão com MySQL encerrada.');
  }
}

listServices().catch(console.error);
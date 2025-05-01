import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupServices() {
  try {
    // Criar conexão
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT
    });

    // Listar serviços antes da exclusão
    const [services] = await connection.query('SELECT id, client_id, service_type_id, status, created_at FROM services WHERE id > 15 ORDER BY id DESC');
    console.log('Serviços a serem excluídos:');
    services.forEach(s => {
      console.log(`ID: ${s.id}, Tipo: ${s.service_type_id}, Criado: ${s.created_at}`);
    });
    console.log(`Total: ${services.length} serviços`);

    // Excluir fotos relacionadas
    const [photoResult] = await connection.query('DELETE FROM service_photos WHERE service_id > 15');
    console.log(`Excluídas ${photoResult.affectedRows} fotos de serviços`);
    
    // Excluir serviços
    const [serviceResult] = await connection.query('DELETE FROM services WHERE id > 15');
    console.log(`Excluídos ${serviceResult.affectedRows} serviços`);
    
    // Fechar conexão
    await connection.end();
    console.log('Limpeza concluída com sucesso');
  } catch (error) {
    console.error('Erro ao limpar serviços:', error.message);
  }
}

cleanupServices();
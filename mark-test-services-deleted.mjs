import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function markServicesAsDeleted() {
  try {
    // Criar conexão
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT
    });

    // Identificar quais serviços marcar como deleted (todos com status 'pending')
    const [services] = await connection.query(`
      SELECT id, client_id, status, created_at 
      FROM services 
      WHERE status = 'pending'
      ORDER BY id DESC
    `);
    
    console.log('Serviços a serem marcados como deleted:');
    services.forEach(s => {
      console.log(`ID: ${s.id}, Status atual: ${s.status}, Criado: ${s.created_at}`);
    });
    console.log(`Total: ${services.length} serviços`);

    if (services.length > 0) {
      // Atualizar status para 'deleted'
      const serviceIds = services.map(s => s.id).join(',');
      const [result] = await connection.query(`
        UPDATE services 
        SET status = 'deleted' 
        WHERE id IN (${serviceIds})
      `);
      
      console.log(`${result.affectedRows} serviços marcados como 'deleted' com sucesso`);
    } else {
      console.log('Não há serviços para marcar como deleted');
    }
    
    // Fechar conexão
    await connection.end();
    console.log('Processo concluído');
  } catch (error) {
    console.error('Erro ao marcar serviços como deleted:', error.message);
  }
}

markServicesAsDeleted();
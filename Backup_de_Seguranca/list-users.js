import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listUsers() {
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
    
    // Contar usuários
    const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total de usuários: ${usersCount[0].count}`);
    
    // Listar usuários
    const [users] = await connection.query('SELECT id, username, name, email, role, active FROM users');
    console.log('\nUsuários no sistema:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Nome: ${user.name}, Username: ${user.username}, Role: ${user.role}, Ativo: ${user.active === 1 ? 'Sim' : 'Não'}`);
    });
    
  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
  } finally {
    await connection.end();
    console.log('Conexão com MySQL encerrada.');
  }
}

listUsers().catch(console.error);
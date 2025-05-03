import mysql from 'mysql2/promise';
import 'dotenv/config';

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

async function updateServiceTypes() {
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao MySQL com sucesso!');
    
    // Verificar tipos de serviço atuais
    const [types] = await connection.query('SELECT * FROM service_types');
    console.log('Tipos de serviço atuais:');
    types.forEach(type => {
      console.log(`ID: ${type.id}, Nome: ${type.name}`);
    });
    
    // Atualizar para remover prefixos "0.00"
    console.log('\nAtualizando nomes...');
    
    await connection.query('UPDATE service_types SET name = ? WHERE id = 1', ['Amassado de Rua']);
    await connection.query('UPDATE service_types SET name = ? WHERE id = 2', ['Granizo']);
    await connection.query('UPDATE service_types SET name = ? WHERE id = 3', ['Outros']);
    
    // Verificar resultado
    const [updatedTypes] = await connection.query('SELECT * FROM service_types');
    console.log('\nTipos de serviço atualizados:');
    updatedTypes.forEach(type => {
      console.log(`ID: ${type.id}, Nome: ${type.name}`);
    });
    
    console.log('\nNomes atualizados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao atualizar tipos de serviço:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com MySQL encerrada.');
    }
  }
}

updateServiceTypes();
/**
 * Script para verificar a estrutura da tabela service_photos
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkServicePhotosTable() {
  console.log('Verificando a tabela service_photos...');
  
  let connection;
  
  try {
    // Criar conexão com o banco de dados
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    
    console.log('Conexão com MySQL estabelecida com sucesso!');
    
    // Verificar se a tabela existe
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'service_photos'
    `);
    
    if (tables.length === 0) {
      console.log('A tabela service_photos não existe!');
      return;
    }
    
    // Verificar a estrutura da tabela
    const [columns] = await connection.query(`
      DESCRIBE service_photos
    `);
    
    console.log('\nEstrutura da tabela service_photos:');
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });
    
    // Verificar as chaves estrangeiras
    const [foreignKeys] = await connection.query(`
      SELECT *
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'service_photos'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\nChaves estrangeiras:');
    if (foreignKeys.length === 0) {
      console.log('- Nenhuma chave estrangeira definida');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`- ${fk.COLUMN_NAME} referencia ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }
    
    // Contar registros na tabela
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total FROM service_photos
    `);
    
    console.log(`\nTotal de registros: ${countResult[0].total}`);
    
    // Se houver registros, mostrar alguns exemplos
    if (countResult[0].total > 0) {
      const [samples] = await connection.query(`
        SELECT * FROM service_photos LIMIT 5
      `);
      
      console.log('\nExemplos de registros:');
      samples.forEach((row, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar tabela service_photos:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexão com MySQL encerrada.');
    }
  }
}

// Executar a verificação
checkServicePhotosTable();
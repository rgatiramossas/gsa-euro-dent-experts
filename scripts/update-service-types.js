// Script para atualizar tipos de serviço
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Iniciando atualização de tipos de serviço...');
  
  // Carregar variáveis de ambiente
  const {
    MYSQL_HOST,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    MYSQL_PORT
  } = process.env;
  
  console.log(`Conectando ao MySQL: ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);
  
  try {
    // Criar pool de conexão
    const pool = mysql.createPool({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      port: MYSQL_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('Verificando tipos de serviço existentes...');
    
    // Verificar tipos existentes
    const [rows] = await pool.query('SELECT * FROM service_types');
    console.log('Tipos de serviço encontrados:', rows.length);
    
    if (rows.length === 0) {
      console.log('Nenhum tipo de serviço encontrado, criando novos tipos...');
      
      await pool.query(`
        INSERT INTO service_types (name, description, base_price) VALUES 
        ('Amassado de Rua', 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua', 100.00),
        ('Granizo', 'Reparo de danos causados por granizo', 200.00),
        ('Outros', 'Outros tipos de restauração e serviços', 150.00)
      `);
      
      console.log('Tipos de serviço criados com sucesso.');
    } else {
      console.log('Atualizando tipos de serviço existentes...');
      
      // Limpar tabela existente
      await pool.query('DELETE FROM service_types');
      
      // Inserir novos tipos
      await pool.query(`
        INSERT INTO service_types (name, description, base_price) VALUES 
        ('Amassado de Rua', 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua', 100.00),
        ('Granizo', 'Reparo de danos causados por granizo', 200.00),
        ('Outros', 'Outros tipos de restauração e serviços', 150.00)
      `);
      
      console.log('Tipos de serviço atualizados com sucesso.');
    }
    
    // Verificar tipos atualizados
    const [updatedRows] = await pool.query('SELECT * FROM service_types');
    console.log('Tipos de serviço atualizados:');
    updatedRows.forEach(row => {
      console.log(`- ID ${row.id}: ${row.name}`);
    });
    
    await pool.end();
    console.log('Conexão fechada. Script concluído com sucesso.');
  } catch (error) {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  }
}

main();
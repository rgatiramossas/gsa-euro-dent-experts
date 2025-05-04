/**
 * Script para verificar a estrutura da tabela de serviços
 * Ajuda a identificar as colunas disponíveis e seus tipos
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Configuração do banco de dados
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

async function checkServicesTable() {
  try {
    console.log('Conectando ao MySQL...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conexão estabelecida.');

    // Verificar as colunas da tabela services
    console.log('\n=== ESTRUTURA DA TABELA SERVICES ===');
    const [columns] = await connection.query('SHOW COLUMNS FROM services');
    
    // Exibir colunas em formato de tabela
    console.log('COLUNA\t\tTIPO\t\tNULL\tCHAVE\tPADRÃO');
    console.log('------------------------------------------------');
    columns.forEach(col => {
      console.log(`${col.Field}\t\t${col.Type}\t${col.Null}\t${col.Key}\t${col.Default || 'NULL'}`);
    });

    // Verificar as colunas relacionadas a preço e faturamento
    console.log('\n=== COLUNAS DE PREÇO E FATURAMENTO ===');
    const priceColumns = columns.filter(col => 
      col.Field.toLowerCase().includes('price') || 
      col.Field.toLowerCase().includes('total') || 
      col.Field.toLowerCase().includes('value') ||
      col.Field.toLowerCase().includes('fee')
    );
    
    priceColumns.forEach(col => {
      console.log(`${col.Field}\t\t${col.Type}\t${col.Null}\t${col.Default || 'NULL'}`);
    });

    // Verificar os primeiros registros para visualizar dados reais
    console.log('\n=== AMOSTRA DE DADOS DE SERVIÇOS ===');
    const [services] = await connection.query('SELECT id, client_id, service_type_id, status, price, total FROM services LIMIT 5');
    console.table(services);

    // Finalizar conexão
    await connection.end();
    console.log('\nVerificação concluída.');

  } catch (error) {
    console.error('Erro ao verificar a tabela de serviços:', error);
  }
}

// Executar a função principal
checkServicesTable();
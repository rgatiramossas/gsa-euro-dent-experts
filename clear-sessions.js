/**
 * Script para remover todas as sessões do banco de dados MySQL
 * Use este script para forçar todos os usuários a fazer login novamente
 */

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function clearSessions() {
  console.log('Iniciando limpeza de sessões...');
  
  // Conectar ao banco de dados MySQL usando variáveis de ambiente
  // Os nomes das variáveis de ambiente são diferentes no seu projeto
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'jtla.com.br',
    user: process.env.MYSQL_USER || 'eurodent_arf.martelinho',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'eurodent_novobd',
    port: process.env.MYSQL_PORT || 3306
  });

  try {
    // Verificar se a tabela de sessões existe
    console.log('Verificando tabela de sessões...');
    const [tables] = await connection.query(`SHOW TABLES LIKE 'sessions'`);
    
    if (tables.length === 0) {
      console.log('Tabela de sessões não encontrada. Verificando tabela alternativa...');
      const [altTables] = await connection.query(`SHOW TABLES LIKE 'eurodent_sessions'`);
      
      if (altTables.length === 0) {
        console.error('Nenhuma tabela de sessões encontrada no banco de dados.');
        return;
      } else {
        // Limpar a tabela alternativa
        console.log('Limpando tabela eurodent_sessions...');
        await connection.query('TRUNCATE TABLE eurodent_sessions');
        console.log('Tabela eurodent_sessions limpa com sucesso!');
      }
    } else {
      // Limpar a tabela de sessões padrão
      console.log('Limpando tabela sessions...');
      await connection.query('TRUNCATE TABLE sessions');
      console.log('Tabela sessions limpa com sucesso!');
    }
    
    console.log('Todas as sessões foram removidas. Os usuários precisarão fazer login novamente.');
  } catch (error) {
    console.error('Erro ao limpar sessões:', error);
  } finally {
    // Fechar a conexão
    await connection.end();
  }
}

// Executar a função
clearSessions();
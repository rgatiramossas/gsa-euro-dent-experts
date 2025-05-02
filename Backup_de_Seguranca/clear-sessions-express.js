/**
 * Script para limpar sessões usando a configuração existente do Express
 */

import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import mysql from 'mysql2/promise';
import MySQLStore from 'express-mysql-session';

dotenv.config();

// Função principal para limpar sessões
async function clearSessions() {
  console.log('Iniciando limpeza de sessões...');
  
  try {
    // Configurações do banco de dados obtidas do ambiente
    const dbConfig = {
      host: process.env.MYSQL_HOST || 'jtla.com.br',
      user: process.env.MYSQL_USER || 'eurodent_arf.martelinho',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'eurodent_novobd',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };
    
    console.log('Conectando ao banco de dados em:', dbConfig.host);
    
    // Criar a mesma store que o aplicativo usa
    const MySQLStoreSession = MySQLStore(session);
    
    // Criar a store com as mesmas opções do aplicativo
    const sessionStore = new MySQLStoreSession({
      // Opções de conexão
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      // Configurações da tabela
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      },
      // Verificar se está usando a tabela eurodent_sessions
      checkExpirationInterval: 900000,
      expiration: 86400000 * 30
    });
    
    console.log('Store de sessão criada, tentando limpar sessões...');
    
    // Limpar todas as sessões
    sessionStore.clear((err) => {
      if (err) {
        console.error('Erro ao limpar sessões:', err);
        
        // Tentar limpar usando o nome alternativo da tabela
        console.log('Tentando limpar com nome alternativo da tabela...');
        
        // Conectar diretamente ao banco e executar o TRUNCATE
        mysql.createConnection(dbConfig)
          .then(conn => {
            console.log('Conexão direta estabelecida, verificando tabelas...');
            
            // Verificar tabelas de sessão existentes
            return conn.query('SHOW TABLES')
              .then(([tables]) => {
                console.log('Tabelas encontradas:', tables.map(t => Object.values(t)[0]).join(', '));
                
                // Tentar limpar tabelas com nomes comuns para sessões
                const promises = ['sessions', 'eurodent_sessions', 'session'].map(tableName => {
                  return conn.query(`TRUNCATE TABLE ${tableName}`)
                    .then(() => {
                      console.log(`Tabela ${tableName} limpa com sucesso`);
                      return true;
                    })
                    .catch(err => {
                      console.log(`Não foi possível limpar tabela ${tableName}:`, err.message);
                      return false;
                    });
                });
                
                return Promise.allSettled(promises)
                  .then(() => {
                    console.log('Tentativa de limpeza concluída');
                    conn.end();
                    process.exit(0);
                  });
              });
          })
          .catch(err => {
            console.error('Erro ao conectar diretamente ao banco de dados:', err);
            process.exit(1);
          });
      } else {
        console.log('Sessões limpas com sucesso!');
        console.log('Todos os usuários precisarão fazer login novamente.');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('Erro inesperado:', error);
    process.exit(1);
  }
}

// Executar o script
clearSessions();
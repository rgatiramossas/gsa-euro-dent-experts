/**
 * Script para verificar as sessões armazenadas no banco de dados MySQL
 * Ajuda a confirmar que as sessões estão sendo armazenadas corretamente
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

async function checkSessions() {
  try {
    console.log('Conectando ao banco de dados MySQL...');
    
    // Configuração da conexão MySQL a partir das variáveis de ambiente
    const config = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT,
      // Outras configurações MySQL
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000, // 10 segundos
    };
    
    console.log(`Tentando conectar ao MySQL: 
  Host: ${config.host}
  User: ${config.user}
  Database: ${config.database}
  Port: ${config.port}
`);
    
    // Criar pool de conexões
    const pool = mysql.createPool(config);
    
    // Testar a conexão com uma consulta simples
    await pool.query('SELECT 1 AS test');
    console.log('Conexão com MySQL estabelecida com sucesso!');
    
    // Verificar se a tabela de sessões existe
    try {
      const [results] = await pool.query('SHOW TABLES LIKE ?', ['sessions']);
      
      if (results.length === 0) {
        console.log('A tabela de sessões não existe. A tabela será criada automaticamente na primeira sessão.');
      } else {
        console.log('Tabela de sessões encontrada. Listando sessões ativas:');
        
        // Consultar sessões ativas
        const [sessions] = await pool.query('SELECT * FROM sessions');
        
        if (sessions.length === 0) {
          console.log('Nenhuma sessão encontrada no banco de dados.');
        } else {
          console.log(`Encontradas ${sessions.length} sessões:`);
          
          sessions.forEach((session, index) => {
            try {
              // Tentar extrair dados da sessão
              let sessionData = {};
              try {
                // A sessão é armazenada como JSON em uma string
                if (session.data) {
                  sessionData = JSON.parse(session.data);
                }
              } catch (e) {
                sessionData = { error: 'Erro ao decodificar dados da sessão' };
              }
              
              // Calcular quando a sessão expira
              const expires = new Date(session.expires);
              const now = new Date();
              const isExpired = expires < now;
              
              console.log(`\nSessão #${index + 1}:`);
              console.log(`- ID: ${session.session_id}`);
              console.log(`- Expira em: ${expires.toLocaleString()} (${isExpired ? 'EXPIRADA' : 'válida'})`);
              console.log(`- Dados: ${JSON.stringify(sessionData, null, 2)}`);
            } catch (parseError) {
              console.error(`Erro ao processar sessão #${index + 1}:`, parseError);
              console.log('Sessão bruta:', session);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar tabela de sessões:', error);
    }
    
    // Fechar o pool de conexões
    await pool.end();
    console.log('Verificação de sessões concluída.');
    
  } catch (error) {
    console.error('Erro ao verificar sessões:', error);
    process.exit(1);
  }
}

// Executar a função
checkSessions();
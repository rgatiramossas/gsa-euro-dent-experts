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
          console.log('Nenhuma sessão encontrada na tabela.');
        } else {
          console.log(`Encontradas ${sessions.length} sessões:`);
          
          // Obter a data atual em timestamp Unix (em milissegundos)
          const now = Date.now();
          
          // Mostrar informações sobre cada sessão
          for (const session of sessions) {
            console.log('\n------------------------------------------');
            console.log(`ID: ${session.session_id}`);
            
            // Verificar formato do campo expires
            console.log(`Expira em: ${session.expires}`);
            
            // Se expires for um timestamp Unix em milissegundos, converter para data legível
            const expiryDate = new Date(Number(session.expires));
            
            // Verificar status de expiração
            const isExpired = now > Number(session.expires);
            console.log(`Data de expiração: ${expiryDate.toISOString()} (${isExpired ? 'EXPIRADA' : 'VÁLIDA'})`);
            
            // Desserializar dados da sessão em JSON para exibir informações de usuário e outras propriedades
            try {
              const sessionData = JSON.parse(session.data);
              console.log('\nDados da sessão:');
              console.log(JSON.stringify(sessionData, null, 2));
              
              // Verificar se há um usuário na sessão
              if (sessionData.passport && sessionData.passport.user) {
                console.log(`\nSessão contém ID de usuário: ${sessionData.passport.user}`);
              } else {
                console.log('\nSessão não tem usuário autenticado');
              }
              
              // Verificar timestamps internos da cookie, se existirem
              if (sessionData.cookie) {
                const cookieExpires = new Date(sessionData.cookie.expires);
                console.log(`\nCookie expira em: ${cookieExpires.toISOString()}`);
                
                // Verificar discrepância entre o timestamp no campo expires e o timestamp no cookie
                const discrepancyMs = Math.abs(Number(session.expires) - cookieExpires.getTime());
                const discrepancyDays = discrepancyMs / (1000 * 60 * 60 * 24);
                
                console.log(`Discrepância entre expires e cookie: ${discrepancyMs} ms (${discrepancyDays.toFixed(2)} dias)`);
                
                if (discrepancyMs > 1000 * 60 * 5) { // Se discrepância maior que 5 minutos
                  console.log('⚠️ AVISO: Discrepância significativa entre o timestamp da tabela e do cookie!');
                }
              }
            } catch (parseError) {
              console.error('Erro ao desserializar dados da sessão:', parseError);
              console.log('Dados da sessão (brutos):', session.data);
            }
          }
        }
        
        // Verificar estrutura da tabela
        const [columns] = await pool.query('SHOW COLUMNS FROM sessions');
        console.log('\n------------------------------------------');
        console.log('Estrutura da tabela de sessões:');
        
        for (const column of columns) {
          console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar tabela de sessões:', error);
    }
    
    // Fechar o pool de conexões
    await pool.end();
  } catch (error) {
    console.error('Erro ao verificar sessões:', error);
    process.exit(1);
  }
}

// Executar a função principal
checkSessions();
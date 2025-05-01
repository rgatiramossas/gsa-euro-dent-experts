// Script para verificar a conexão com o MySQL externo
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}=======================================${colors.reset}`);
console.log(`${colors.blue}    Verificação de MySQL Externo    ${colors.reset}`);
console.log(`${colors.blue}=======================================${colors.reset}`);

// Verificar variáveis de ambiente
const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE || !MYSQL_PORT) {
  console.error(`${colors.red}Erro: Variáveis de ambiente MySQL não configuradas corretamente.${colors.reset}`);
  console.log(`
${colors.yellow}Verifique se as seguintes variáveis de ambiente estão definidas:
- MYSQL_HOST: ${MYSQL_HOST || 'não definido'}
- MYSQL_USER: ${MYSQL_USER || 'não definido'}
- MYSQL_DATABASE: ${MYSQL_DATABASE || 'não definido'}
- MYSQL_PORT: ${MYSQL_PORT || 'não definido'}
- MYSQL_PASSWORD: ${'*'.repeat(MYSQL_PASSWORD?.length || 0) || 'não definido'}${colors.reset}
  `);
  process.exit(1);
}

// Configuração da conexão
const config = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: parseInt(MYSQL_PORT),
  connectTimeout: 10000,  // 10 segundos de timeout
  ssl: undefined
};

console.log(`${colors.cyan}Informações de conexão:${colors.reset}`);
console.log(`${colors.cyan}- Host: ${config.host}${colors.reset}`);
console.log(`${colors.cyan}- User: ${config.user}${colors.reset}`);
console.log(`${colors.cyan}- Database: ${config.database}${colors.reset}`);
console.log(`${colors.cyan}- Port: ${config.port}${colors.reset}`);

async function testConnection() {
  console.log(`${colors.yellow}Tentando conectar ao MySQL...${colors.reset}`);
  
  try {
    // Criar conexão
    const connection = await mysql.createConnection(config);
    console.log(`${colors.green}✓ Conexão estabelecida com sucesso!${colors.reset}`);
    
    // Testar consulta
    const [result] = await connection.query('SELECT 1 as test');
    console.log(`${colors.green}✓ Consulta de teste executada com sucesso: ${JSON.stringify(result)}${colors.reset}`);
    
    // Verificar se o banco de dados existe
    const [databases] = await connection.query('SHOW DATABASES');
    console.log(`${colors.green}✓ Bancos de dados disponíveis:${colors.reset}`);
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });
    
    // Verificar tabelas existentes
    try {
      const [tables] = await connection.query('SHOW TABLES');
      if (tables.length === 0) {
        console.log(`${colors.yellow}! O banco de dados '${config.database}' existe mas não contém tabelas.${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ Tabelas encontradas no banco de dados '${config.database}':${colors.reset}`);
        tables.forEach(table => {
          const tableName = table[`Tables_in_${config.database}`];
          console.log(`  - ${tableName}`);
        });
      }
    } catch (error) {
      console.error(`${colors.red}✗ Erro ao verificar tabelas: ${error.message}${colors.reset}`);
    }
    
    // Fechar conexão
    await connection.end();
    console.log(`${colors.green}✓ Conexão fechada.${colors.reset}`);
    console.log(`${colors.green}✓ Verificação de MySQL concluída com sucesso!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}✗ Erro na conexão MySQL: ${error.message}${colors.reset}`);
    
    // Exibir sugestões de solução baseadas no erro
    if (error.code === 'ECONNREFUSED') {
      console.log(`
${colors.yellow}Sugestões:
- Verifique se o servidor MySQL está executando
- Verifique se o host e porta estão corretos
- Verifique se o firewall permite conexões na porta ${config.port}${colors.reset}
      `);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`
${colors.yellow}Sugestões:
- Verifique se o usuário e senha estão corretos
- Verifique se o usuário tem permissão para acessar o banco de dados${colors.reset}
      `);
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`
${colors.yellow}Sugestões:
- O banco de dados '${config.database}' não existe
- Você precisa criar o banco de dados antes de conectar${colors.reset}
      `);
    }
    
    process.exit(1);
  }
}

// Executar teste de conexão
testConnection();
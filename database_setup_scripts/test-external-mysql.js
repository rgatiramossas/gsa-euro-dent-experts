// Script para testar a conexão com o MySQL Externo
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
console.log(`${colors.blue}    Teste de Conexão MySQL Externo    ${colors.reset}`);
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
  connectTimeout: 10000
};

console.log(`${colors.cyan}Informações de conexão:${colors.reset}`);
console.log(`${colors.cyan}- Host: ${config.host}${colors.reset}`);
console.log(`${colors.cyan}- User: ${config.user}${colors.reset}`);
console.log(`${colors.cyan}- Database: ${config.database}${colors.reset}`);
console.log(`${colors.cyan}- Port: ${config.port}${colors.reset}`);

async function testConnection() {
  let connection;
  try {
    console.log(`${colors.yellow}Tentando conectar ao MySQL...${colors.reset}`);
    connection = await mysql.createConnection(config);
    console.log(`${colors.green}Conexão estabelecida com sucesso!${colors.reset}`);
    
    // Testar a consulta ao banco
    console.log(`${colors.yellow}Testando consulta ao banco de dados...${colors.reset}`);
    
    // Verificar se a base de dados existe
    const [databases] = await connection.query('SHOW DATABASES');
    console.log(`${colors.green}Bancos de dados disponíveis:${colors.reset}`);
    databases.forEach(db => {
      console.log(`${colors.cyan}- ${db.Database}${colors.reset}`);
    });
    
    // Verificar tabelas no banco selecionado
    await connection.query(`USE ${config.database}`);
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log(`${colors.yellow}O banco de dados '${config.database}' não possui tabelas.${colors.reset}`);
    } else {
      console.log(`${colors.green}Tabelas no banco de dados '${config.database}':${colors.reset}`);
      const tableKey = `Tables_in_${config.database}`;
      tables.forEach(table => {
        console.log(`${colors.cyan}- ${table[tableKey]}${colors.reset}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Erro na conexão MySQL: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Detalhes do erro:${colors.reset}`);
    console.error(error);
    return false;
  } finally {
    if (connection) {
      console.log(`${colors.yellow}Fechando conexão...${colors.reset}`);
      await connection.end();
      console.log(`${colors.green}Conexão fechada.${colors.reset}`);
    }
  }
}

testConnection().then(success => {
  if (success) {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.green}    Teste de Conexão Bem Sucedido    ${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.red}    Teste de Conexão Falhou    ${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
    process.exit(1);
  }
});
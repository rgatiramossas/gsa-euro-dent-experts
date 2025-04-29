// Script para testar a conexão com o MySQL
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
console.log(`${colors.blue}    Teste de Conexão MySQL    ${colors.reset}`);
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
    console.log(`\n${colors.cyan}Tentando conectar ao MySQL...${colors.reset}`);
    
    // Primeiro teste: tentar conectar sem especificar o banco de dados
    const configWithoutDB = { ...config };
    delete configWithoutDB.database;
    
    try {
      console.log(`${colors.cyan}Passo 1: Testando conexão básica sem banco de dados...${colors.reset}`);
      connection = await mysql.createConnection(configWithoutDB);
      console.log(`${colors.green}✓ Conexão básica estabelecida com sucesso!${colors.reset}`);
      
      // Verificar bancos de dados disponíveis
      console.log(`${colors.cyan}Passo 2: Listando bancos de dados disponíveis...${colors.reset}`);
      const [databases] = await connection.query('SHOW DATABASES');
      console.log(`${colors.green}Bancos de dados disponíveis:${colors.reset}`);
      databases.forEach(db => {
        console.log(`${colors.green}- ${db.Database}${colors.reset}`);
      });
      
      // Verificar se o banco de dados específico existe
      const dbExists = databases.some(db => db.Database === config.database);
      if (dbExists) {
        console.log(`${colors.green}✓ Banco de dados '${config.database}' encontrado!${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Banco de dados '${config.database}' não encontrado!${colors.reset}`);
      }
      
      // Verificar permissões do usuário
      console.log(`${colors.cyan}Passo 3: Verificando permissões do usuário...${colors.reset}`);
      try {
        const [grants] = await connection.query(`SHOW GRANTS FOR CURRENT_USER()`);
        console.log(`${colors.green}Permissões do usuário:${colors.reset}`);
        grants.forEach(grant => {
          const grantString = Object.values(grant)[0];
          console.log(`${colors.green}- ${grantString}${colors.reset}`);
        });
      } catch (error) {
        console.log(`${colors.yellow}⚠ Não foi possível verificar permissões: ${error.message}${colors.reset}`);
      }
      
      connection.end();
    } catch (error) {
      console.log(`${colors.yellow}⚠ Não foi possível estabelecer conexão básica: ${error.message}${colors.reset}`);
    }
    
    // Segundo teste: tentar conectar com o banco de dados especificado
    try {
      console.log(`\n${colors.cyan}Passo 4: Tentando conectar ao banco de dados específico '${config.database}'...${colors.reset}`);
      connection = await mysql.createConnection(config);
      console.log(`${colors.green}✓ Conexão com o banco de dados '${config.database}' estabelecida com sucesso!${colors.reset}`);
      
      // Listar tabelas
      console.log(`${colors.cyan}Passo 5: Listando tabelas do banco de dados...${colors.reset}`);
      const [tables] = await connection.query('SHOW TABLES');
      
      if (tables.length > 0) {
        console.log(`${colors.green}Tabelas no banco de dados:${colors.reset}`);
        tables.forEach(table => {
          const tableName = Object.values(table)[0];
          console.log(`${colors.green}- ${tableName}${colors.reset}`);
        });
      } else {
        console.log(`${colors.yellow}⚠ Não foram encontradas tabelas no banco de dados.${colors.reset}`);
      }
      
      connection.end();
      return true;
    } catch (error) {
      console.log(`${colors.red}✗ Erro ao conectar ao banco de dados específico: ${error.message}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Erro durante o teste de conexão: ${error.message}${colors.reset}`);
    return false;
  } finally {
    if (connection) {
      try {
        connection.end();
      } catch (e) {
        // Ignore errors when closing connection
      }
    }
  }
}

// Executar o teste
testConnection().then(success => {
  console.log(`\n${colors.blue}=======================================${colors.reset}`);
  if (success) {
    console.log(`${colors.green}Teste de conexão MySQL concluído com sucesso!${colors.reset}`);
  } else {
    console.log(`${colors.red}Falha no teste de conexão MySQL.${colors.reset}`);
    console.log(`${colors.yellow}Verifique as credenciais e permissões do usuário.${colors.reset}`);
  }
  console.log(`${colors.blue}=======================================${colors.reset}`);
  process.exit(success ? 0 : 1);
});
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
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
console.log(`${colors.blue}    Verificação do MySQL    ${colors.reset}`);
console.log(`${colors.blue}=======================================${colors.reset}`);

// Verificar variáveis de ambiente
const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT
} = process.env;

const config = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: parseInt(MYSQL_PORT || '3306'),
  // Adicionar timeout maior para dar mais tempo para conectar
  connectTimeout: 20000
};

async function verifyConnection() {
  let connection;
  try {
    console.log(`\n${colors.cyan}Conectando ao MySQL...${colors.reset}`);
    
    connection = await mysql.createConnection(config);
    console.log(`${colors.green}✓ Conexão estabelecida com sucesso!${colors.reset}`);
    
    // Listar tabelas
    console.log(`\n${colors.cyan}Listando tabelas no banco de dados ${config.database}...${colors.reset}`);
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`${colors.green}Tabelas disponíveis:${colors.reset}`);
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`${colors.green}- ${tableName}${colors.reset}`);
      
      // Contar registros em cada tabela
      const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
      console.log(`  ${colors.yellow}Total de registros: ${count[0].total}${colors.reset}`);
    }
    
    // Verificar se a tabela de usuários existe e listar usuários
    const userTableExists = tables.some(t => Object.values(t)[0] === 'users');
    if (userTableExists) {
      console.log(`\n${colors.cyan}Verificando usuários no sistema...${colors.reset}`);
      const [users] = await connection.query('SELECT id, username, name, email, role FROM users LIMIT 5');
      
      if (users.length > 0) {
        console.log(`${colors.green}Usuários encontrados:${colors.reset}`);
        users.forEach(user => {
          console.log(`${colors.green}- ID: ${user.id}, Username: ${user.username}, Nome: ${user.name}, Função: ${user.role}${colors.reset}`);
        });
      } else {
        console.log(`${colors.yellow}Nenhum usuário encontrado.${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}✓ Verificação concluída com sucesso!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Erro ao verificar conexão MySQL:${colors.reset}`, error);
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log(`${colors.blue}Conexão encerrada.${colors.reset}`);
      } catch (err) {
        console.error(`${colors.red}Erro ao encerrar conexão:${colors.reset}`, err);
      }
    }
  }
}

verifyConnection();
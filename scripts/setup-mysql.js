import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
console.log(`${colors.blue}    Configuração do MySQL    ${colors.reset}`);
console.log(`${colors.blue}=======================================${colors.reset}`);

// Verificar se todas as variáveis de ambiente necessárias estão definidas
if (!process.env.MYSQL_HOST || 
    !process.env.MYSQL_USER || 
    !process.env.MYSQL_PASSWORD || 
    !process.env.MYSQL_DATABASE || 
    !process.env.MYSQL_PORT) {
  console.error(`${colors.red}Erro: As variáveis de ambiente MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE e MYSQL_PORT devem estar configuradas.${colors.reset}`);
  process.exit(1);
}

const config = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT)
};

async function setupDatabase() {
  let connection;
  try {
    // Ler arquivo SQL
    const schemaPath = path.join(__dirname, 'create-mysql-schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    // Dividir em comandos individuais (para tratar erros em cada comando)
    const sqlCommands = sqlScript.split(';').filter(cmd => cmd.trim());

    console.log(`${colors.cyan}Conectando ao MySQL...${colors.reset}`);
    connection = await mysql.createConnection(config);
    console.log(`${colors.green}Conexão estabelecida!${colors.reset}`);

    console.log(`${colors.cyan}Executando script SQL...${colors.reset}`);

    // Executar cada comando separadamente
    for (const cmd of sqlCommands) {
      try {
        await connection.query(cmd + ';');
      } catch (err) {
        console.log(`${colors.yellow}Aviso ao executar comando: ${err.message}${colors.reset}`);
        console.log(`Comando: ${cmd.trim().substring(0, 100)}...`);
      }
    }

    console.log(`${colors.green}Schema criado com sucesso!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erro ao configurar o banco de dados: ${error.message}${colors.reset}`);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
  return true;
}

setupDatabase().then(success => {
  if (success) {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.green}Configuração do MySQL concluída!${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
  } else {
    console.log(`${colors.red}Falha na configuração do MySQL.${colors.reset}`);
  }
  process.exit(success ? 0 : 1);
});
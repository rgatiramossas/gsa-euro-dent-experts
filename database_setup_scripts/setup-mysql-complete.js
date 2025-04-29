// Script para configuração completa do MySQL para o projeto Euro Dent Experts
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

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
console.log(`${colors.blue}  Euro Dent Experts - MySQL Setup Tool ${colors.reset}`);
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
${colors.yellow}Adicione as seguintes variáveis de ambiente ao seu projeto:
- MYSQL_HOST: Host do servidor MySQL
- MYSQL_USER: Usuário do MySQL
- MYSQL_PASSWORD: Senha do MySQL
- MYSQL_DATABASE: Nome do banco de dados
- MYSQL_PORT: Porta do MySQL${colors.reset}
  `);
  process.exit(1);
}

const config = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: parseInt(MYSQL_PORT)
};

async function setupDatabase() {
  let connection;
  try {
    console.log(`${colors.cyan}Conectando ao MySQL...${colors.reset}`);
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });
    
    console.log(`${colors.green}Conexão estabelecida!${colors.reset}`);
    
    // Criar banco de dados se não existir
    console.log(`${colors.cyan}Verificando se o banco de dados ${config.database} existe...${colors.reset}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    console.log(`${colors.green}Banco de dados verificado/criado!${colors.reset}`);
    
    // Usar o banco de dados
    await connection.query(`USE ${config.database}`);
    console.log(`${colors.green}Usando banco de dados: ${config.database}${colors.reset}`);
    
    // Ler arquivo SQL
    const schemaPath = path.join(__dirname, 'complete-mysql-schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir em comandos individuais
    const sqlCommands = sqlScript.split(';').filter(cmd => cmd.trim());
    
    console.log(`${colors.cyan}Executando script SQL...${colors.reset}`);
    
    // Executar cada comando separadamente
    for (const cmd of sqlCommands) {
      try {
        await connection.query(cmd + ';');
      } catch (err) {
        console.log(`${colors.yellow}Aviso ao executar comando: ${err.message}${colors.reset}`);
        // Mostrar apenas os primeiros 150 caracteres do comando para não poluir o console
        const cmdPreview = cmd.trim().replace(/\s+/g, ' ').substring(0, 150);
        console.log(`Comando: ${cmdPreview}...`);
      }
    }
    
    // Verificar tabelas criadas
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`${colors.green}Tabelas criadas:${colors.reset}`);
    tables.forEach(table => {
      const tableName = table[`Tables_in_${config.database}`];
      console.log(`- ${tableName}`);
    });
    
    // Verificar se a tabela de usuários tem o administrador
    const [adminUsers] = await connection.query("SELECT * FROM users WHERE username = 'admin'");
    if (adminUsers.length === 0) {
      console.log(`${colors.yellow}Usuário admin não encontrado. Criando...${colors.reset}`);
      // bcrypt hash da senha 'admin'
      await connection.query(`
        INSERT INTO users (username, password, name, role) 
        VALUES ('admin', '$2b$10$S/Fmwvz7SE/Z0MaKin/eQOUPcnU7qCoW6RQGy1Cy4Sjk/ugRQ/RMS', 'Admin User', 'admin')
      `);
      console.log(`${colors.green}Usuário admin criado com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.green}Usuário admin já existe.${colors.reset}`);
    }
    
    // Verificar tipos de serviço
    const [serviceTypes] = await connection.query("SELECT * FROM service_types");
    if (serviceTypes.length === 0) {
      console.log(`${colors.yellow}Tipos de serviço não encontrados. Criando...${colors.reset}`);
      await connection.query(`
        INSERT INTO service_types (name, description, base_price) 
        VALUES 
        ('Amassado de Rua', 'Serviço de reparo de amassados simples', 100.00),
        ('Granizo', 'Reparo de danos causados por granizo', 200.00),
        ('Outros', 'Outros tipos de restauração e serviços', 150.00)
      `);
      console.log(`${colors.green}Tipos de serviço criados com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.green}Atualizando nomes dos tipos de serviço...${colors.reset}`);
      await connection.query("UPDATE service_types SET name = 'Amassado de Rua' WHERE id = 1");
      await connection.query("UPDATE service_types SET name = 'Granizo' WHERE id = 2");
      await connection.query("UPDATE service_types SET name = 'Outros' WHERE id = 3");
      console.log(`${colors.green}Nomes dos tipos de serviço atualizados.${colors.reset}`);
    }
    
    // Verificar se existe a coluna damaged_parts na tabela budgets
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budgets' AND COLUMN_NAME = 'damaged_parts'
    `, [config.database]);
    
    if (columns.length === 0) {
      console.log(`${colors.yellow}Coluna damaged_parts não encontrada. Adicionando...${colors.reset}`);
      await connection.query(`
        ALTER TABLE budgets 
        ADD COLUMN damaged_parts TEXT NULL
      `);
      console.log(`${colors.green}Coluna damaged_parts adicionada com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.green}Coluna damaged_parts já existe.${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Erro ao configurar o banco de dados: ${error.message}${colors.reset}`);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log(`${colors.blue}Conexão com o MySQL encerrada.${colors.reset}`);
    }
  }
}

setupDatabase().then(success => {
  if (success) {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.green}Configuração do MySQL concluída com sucesso!${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`
${colors.yellow}Informações de acesso:${colors.reset}
- Usuário: admin
- Senha: admin
- URL: http://localhost:5000/

${colors.yellow}Para iniciar o projeto:${colors.reset}
- npm run dev
    `);
  } else {
    console.log(`${colors.red}Falha na configuração do MySQL.${colors.reset}`);
    process.exit(1);
  }
});
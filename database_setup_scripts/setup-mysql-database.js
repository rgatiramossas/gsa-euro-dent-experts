// Script para criar e configurar o banco de dados MySQL externo
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
console.log(`${colors.blue}    Configuração de MySQL Externo    ${colors.reset}`);
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
  port: parseInt(MYSQL_PORT),
  connectTimeout: 20000
};

// Esquema do banco de dados (todas as tabelas)
const schema = [
  // Tabela users
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'technician',
    profile_image TEXT,
    active TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Tabela clients
  `CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Tabela vehicles
  `CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    make VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    color VARCHAR(255),
    license_plate VARCHAR(255),
    vin VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  
  // Tabela service_types
  `CREATE TABLE IF NOT EXISTS service_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2)
  )`,
  
  // Tabela event_types
  `CREATE TABLE IF NOT EXISTS event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(100) NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Tabela services
  `CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    service_type_id INT NOT NULL,
    technician_id INT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    description TEXT,
    scheduled_date DATETIME,
    start_date DATETIME,
    completion_date DATETIME,
    location_type VARCHAR(50) NOT NULL,
    address TEXT,
    latitude DOUBLE,
    longitude DOUBLE,
    price DECIMAL(10, 2),
    administrative_fee DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2),
    notes TEXT,
    aw_value DECIMAL(10, 2),
    dents INT,
    size VARCHAR(255),
    is_vertical TINYINT,
    is_aluminum TINYINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (service_type_id) REFERENCES service_types(id)
  )`,
  
  // Tabela service_photos
  `CREATE TABLE IF NOT EXISTS service_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    photo_type VARCHAR(50) NOT NULL,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
  )`,
  
  // Tabela events
  `CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date VARCHAR(10) NOT NULL,
    time VARCHAR(5) NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    event_type_id INT NOT NULL,
    technician_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
  )`,
  
  // Tabela payment_requests
  `CREATE TABLE IF NOT EXISTS payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_date DATETIME,
    payment_details TEXT,
    FOREIGN KEY (technician_id) REFERENCES users(id)
  )`,
  
  // Tabela payment_request_items
  `CREATE TABLE IF NOT EXISTS payment_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_request_id INT NOT NULL,
    service_id INT NOT NULL,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  )`,
  
  // Tabela expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATETIME NOT NULL,
    description TEXT NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Tabela budgets
  `CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    vehicle_info TEXT NOT NULL,
    date VARCHAR(10) NOT NULL,
    total_aw INT,
    total_value DECIMAL(10, 2),
    photo_url TEXT,
    note TEXT,
    plate VARCHAR(255),
    chassis_number VARCHAR(255),
    damaged_parts TEXT,
    vehicle_image MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  
  // Tabela manager_client_assignments
  `CREATE TABLE IF NOT EXISTS manager_client_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manager_id INT NOT NULL,
    client_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`
];

// Dados iniciais para popular o banco
const initialData = [
  // Service Types
  `INSERT INTO service_types (name, description, base_price) VALUES 
   ('Amassado de Rua', 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua', 100.00),
   ('Granizo', 'Reparo de danos causados por granizo', 200.00),
   ('Outros', 'Outros tipos de restauração e serviços', 150.00)`,
  
  // Event Types
  `INSERT INTO event_types (name, color) VALUES 
   ('Reunião', '#4f46e5'),
   ('Visita', '#10b981'),
   ('Serviço', '#ef4444')`
];

async function setupDatabase() {
  let connection;
  try {
    console.log(`${colors.yellow}Conectando ao servidor MySQL...${colors.reset}`);
    connection = await mysql.createConnection(config);
    console.log(`${colors.green}Conexão estabelecida com sucesso!${colors.reset}`);

    // Criar banco de dados se não existir
    console.log(`${colors.yellow}Verificando se o banco de dados "${MYSQL_DATABASE}" existe...${colors.reset}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE}`);
    console.log(`${colors.green}Banco de dados verificado ou criado com sucesso!${colors.reset}`);

    // Selecionar o banco de dados
    console.log(`${colors.yellow}Selecionando banco de dados "${MYSQL_DATABASE}"...${colors.reset}`);
    await connection.query(`USE ${MYSQL_DATABASE}`);
    console.log(`${colors.green}Banco de dados selecionado com sucesso!${colors.reset}`);

    // Criar tabelas
    console.log(`${colors.yellow}Criando tabelas...${colors.reset}`);
    for (const tableQuery of schema) {
      try {
        await connection.query(tableQuery);
        const tableName = tableQuery.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        console.log(`${colors.green}Tabela "${tableName}" verificada ou criada com sucesso!${colors.reset}`);
      } catch (err) {
        console.error(`${colors.red}Erro ao criar tabela: ${err.message}${colors.reset}`);
        // Continuar mesmo se houver erro em uma tabela
      }
    }

    // Verificar se existem dados iniciais
    console.log(`${colors.yellow}Verificando dados iniciais...${colors.reset}`);
    
    // Verificar se existem service_types
    const [serviceTypes] = await connection.query('SELECT COUNT(*) as count FROM service_types');
    if (serviceTypes[0].count === 0) {
      console.log(`${colors.yellow}Inserindo tipos de serviço iniciais...${colors.reset}`);
      await connection.query(initialData[0]);
      console.log(`${colors.green}Tipos de serviço inseridos com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.green}Tipos de serviço já existem. Pulando...${colors.reset}`);
    }
    
    // Verificar se existem event_types
    const [eventTypes] = await connection.query('SELECT COUNT(*) as count FROM event_types');
    if (eventTypes[0].count === 0) {
      console.log(`${colors.yellow}Inserindo tipos de evento iniciais...${colors.reset}`);
      await connection.query(initialData[1]);
      console.log(`${colors.green}Tipos de evento inseridos com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.green}Tipos de evento já existem. Pulando...${colors.reset}`);
    }

    console.log(`${colors.green}Configuração do banco de dados concluída com sucesso!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Erro durante a configuração do banco de dados: ${error.message}${colors.reset}`);
    console.error(error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log(`${colors.yellow}Conexão com o MySQL fechada.${colors.reset}`);
    }
  }
}

setupDatabase().then(success => {
  if (success) {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.green}    Configuração de BD Concluída    ${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.blue}=======================================${colors.reset}`);
    console.log(`${colors.red}    Configuração de BD Falhou    ${colors.reset}`);
    console.log(`${colors.blue}=======================================${colors.reset}`);
    process.exit(1);
  }
});
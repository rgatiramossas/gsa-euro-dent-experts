import { initDb } from "../server/db-mysql";
import { sql } from "drizzle-orm";

async function createTables() {
  try {
    console.log("Inicializando conexão com MySQL...");
    const { db, pool } = await initDb();
    console.log("Conexão com MySQL estabelecida com sucesso!");

    // Criar tabela de usuários
    console.log("Criando tabela de usuários...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        profile_image VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de usuários criada com sucesso!");

    // Criar tabela de clientes
    console.log("Criando tabela de clientes...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(255),
        address VARCHAR(255),
        cnpj VARCHAR(255),
        cpf VARCHAR(255),
        company_name VARCHAR(255),
        type VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de clientes criada com sucesso!");

    // Criar tabela de veículos
    console.log("Criando tabela de veículos...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        brand VARCHAR(255),
        model VARCHAR(255),
        year VARCHAR(10),
        color VARCHAR(100),
        plate VARCHAR(50),
        chassis_number VARCHAR(255),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `));
    console.log("Tabela de veículos criada com sucesso!");

    // Criar tabela de tipos de serviço
    console.log("Criando tabela de tipos de serviço...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS service_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        base_price DECIMAL(10, 2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de tipos de serviço criada com sucesso!");

    // Criar tabela de serviços
    console.log("Criando tabela de serviços...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        service_type_id INT NOT NULL,
        technician_id INT,
        scheduled_date DATETIME,
        start_date DATETIME,
        completion_date DATETIME,
        location_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'aberto',
        address VARCHAR(255),
        notes TEXT,
        dents INT,
        size VARCHAR(50),
        is_vertical BOOLEAN DEFAULT false,
        is_aluminum BOOLEAN DEFAULT false,
        aw_value DECIMAL(10, 2),
        total DECIMAL(10, 2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (service_type_id) REFERENCES service_types(id)
      )
    `));
    console.log("Tabela de serviços criada com sucesso!");

    // Criar tabela de fotos de serviço
    console.log("Criando tabela de fotos de serviço...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS service_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        url VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `));
    console.log("Tabela de fotos de serviço criada com sucesso!");

    // Criar tabela de tipos de evento
    console.log("Criando tabela de tipos de evento...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS event_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de tipos de evento criada com sucesso!");

    // Criar tabela de eventos
    console.log("Criando tabela de eventos...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date VARCHAR(50) NOT NULL,
        time VARCHAR(50) NOT NULL,
        duration INT DEFAULT 60,
        technician_id INT,
        event_type_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_type_id) REFERENCES event_types(id)
      )
    `));
    console.log("Tabela de eventos criada com sucesso!");

    // Criar tabela de pedidos de pagamento
    console.log("Criando tabela de pedidos de pagamento...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        technician_id INT,
        status VARCHAR(50) DEFAULT 'pendente',
        payment_date DATETIME,
        payment_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de pedidos de pagamento criada com sucesso!");

    // Criar tabela de itens de pedido de pagamento
    console.log("Criando tabela de itens de pedido de pagamento...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS payment_request_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_request_id INT NOT NULL,
        service_id INT NOT NULL,
        value DECIMAL(10, 2),
        technician_value DECIMAL(10, 2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `));
    console.log("Tabela de itens de pedido de pagamento criada com sucesso!");

    // Criar tabela de despesas
    console.log("Criando tabela de despesas...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        category VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));
    console.log("Tabela de despesas criada com sucesso!");

    // Criar tabela de associação de gestores a clientes
    console.log("Criando tabela de associação de gestores a clientes...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS manager_client_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        manager_id INT NOT NULL,
        client_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `));
    console.log("Tabela de associação de gestores a clientes criada com sucesso!");

    // Criar tabela de orçamentos
    console.log("Criando tabela de orçamentos...");
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        vehicle_info TEXT,
        date DATE NOT NULL,
        total_aw DECIMAL(10, 2),
        total_value DECIMAL(10, 2),
        photo_url VARCHAR(255),
        note TEXT,
        plate VARCHAR(50),
        chassisNumber VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `));
    console.log("Tabela de orçamentos criada com sucesso!");

    // Criar admin inicial
    const hashedPassword = '$2b$12$g4fQ60E4.sY7JR3mNHRfVuBqBDi9ZN9kP71rZE.4Jlt8SPm92ixIK'; // senha: password123
    console.log("Criando usuário admin inicial...");
    await db.execute(sql.raw(`
      INSERT INTO users (username, password, name, email, role, active)
      SELECT 'admin', '${hashedPassword}', 'Admin User', 'admin@eurodent.com', 'admin', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
    `));
    console.log("Usuário admin criado com sucesso!");

    // Criar gestor inicial
    console.log("Criando usuário gestor inicial...");
    await db.execute(sql.raw(`
      INSERT INTO users (username, password, name, email, phone, role, active)
      SELECT 'gestor', '${hashedPassword}', 'Carlos Oliveira', 'gestor@eurodent.com', '(11) 98765-4321', 'gestor', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'gestor')
    `));
    console.log("Usuário gestor criado com sucesso!");

    // Criar técnicos iniciais
    console.log("Criando usuários técnicos iniciais...");
    await db.execute(sql.raw(`
      INSERT INTO users (username, password, name, email, phone, role, active)
      SELECT 'joao', '${hashedPassword}', 'João Pereira', 'joao@eurodent.com', '(11) 97654-3210', 'technician', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'joao')
    `));
    await db.execute(sql.raw(`
      INSERT INTO users (username, password, name, email, phone, role, active)
      SELECT 'pedro', '${hashedPassword}', 'Pedro Santos', 'pedro@eurodent.com', '(11) 97654-3210', 'technician', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'pedro')
    `));
    console.log("Usuários técnicos criados com sucesso!");

    // Criar tipos de serviço iniciais
    console.log("Criando tipos de serviço iniciais...");
    await db.execute(sql.raw(`
      INSERT INTO service_types (name, description, base_price)
      SELECT 'Amassado de Rua', 'Reparo de amassados de rua sem pintura', 150
      WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE name = 'Amassado de Rua')
    `));
    await db.execute(sql.raw(`
      INSERT INTO service_types (name, description, base_price)
      SELECT 'Granizo', 'Reparo de danos causados por granizo', 250
      WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE name = 'Granizo')
    `));
    await db.execute(sql.raw(`
      INSERT INTO service_types (name, description, base_price)
      SELECT 'Outros', 'Outros tipos de reparos sem pintura', 350
      WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE name = 'Outros')
    `));
    console.log("Tipos de serviço iniciais criados com sucesso!");

    // Criar tipos de evento iniciais
    console.log("Criando tipos de evento iniciais...");
    await db.execute(sql.raw(`
      INSERT INTO event_types (name, color)
      SELECT 'Reunião', '#4f46e5'
      WHERE NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'Reunião')
    `));
    await db.execute(sql.raw(`
      INSERT INTO event_types (name, color)
      SELECT 'Visita Técnica', '#16a34a'
      WHERE NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'Visita Técnica')
    `));
    await db.execute(sql.raw(`
      INSERT INTO event_types (name, color)
      SELECT 'Avaliação', '#ea580c'
      WHERE NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'Avaliação')
    `));
    await db.execute(sql.raw(`
      INSERT INTO event_types (name, color)
      SELECT 'Serviço', '#dc2626'
      WHERE NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'Serviço')
    `));
    console.log("Tipos de evento iniciais criados com sucesso!");

    console.log("Todas as tabelas foram criadas com sucesso!");
    
    // Fechar pool de conexão
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
    process.exit(1);
  }
}

createTables();
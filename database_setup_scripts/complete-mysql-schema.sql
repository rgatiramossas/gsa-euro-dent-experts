-- Euro Dent Experts - Esquema Completo para MySQL
-- Este script cria todas as tabelas necessárias para o aplicativo

-- Remover tabelas existentes se necessário
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

-- Criar tabela de usuários
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'technician', 'manager', 'gestor') NOT NULL DEFAULT 'technician',
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão (senha 'admin')
INSERT INTO users (username, password, name, role) 
VALUES ('admin', '$2b$10$S/Fmwvz7SE/Z0MaKin/eQOUPcnU7qCoW6RQGy1Cy4Sjk/ugRQ/RMS', 'Admin User', 'admin');

-- Criar tabela de clientes
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de veículos
CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  make VARCHAR(255),
  model VARCHAR(255),
  year VARCHAR(4),
  license_plate VARCHAR(20),
  color VARCHAR(50),
  chassis_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Criar tabela de tipos de serviço
CREATE TABLE service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tipos de serviço padrão
INSERT INTO service_types (name, description, base_price) VALUES 
('Amassado de Rua', 'Serviço de reparo de amassados simples encontrados em estacionamentos ou rua', 100.00),
('Granizo', 'Reparo de danos causados por granizo', 200.00),
('Outros', 'Outros tipos de restauração e serviços', 150.00);

-- Criar tabela de orçamentos (budgets)
CREATE TABLE budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_info TEXT,
  date VARCHAR(50) NOT NULL,
  total_aw FLOAT,
  total_value FLOAT,
  photo_url VARCHAR(255),
  note TEXT,
  plate VARCHAR(50),
  chassis_number VARCHAR(50),
  damaged_parts TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Criar tabela de serviços
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_id INT,
  service_type_id INT NOT NULL,
  technician_id INT,
  description TEXT,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Inserir clientes de exemplo
INSERT INTO clients (name, email, phone, address)
VALUES 
('TESTE', 'teste@teste.com', '123456789', 'Endereço de Teste, 123'),
('João Silva', 'joao@email.com', '11998765432', 'Av. Paulista, 1000'),
('Maria Oliveira', 'maria@email.com', '11987654321', 'Rua Augusta, 500');
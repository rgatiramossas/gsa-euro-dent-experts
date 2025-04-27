-- Script para criar o esquema do banco de dados MySQL
-- Este arquivo cria todas as tabelas necessárias para o sistema

-- Remover tabelas existentes se necessário (em ordem inversa devido às restrições de chave estrangeira)
DROP TABLE IF EXISTS payment_request_items;
DROP TABLE IF EXISTS payment_requests;
DROP TABLE IF EXISTS service_photos;
DROP TABLE IF EXISTS manager_client_assignments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS event_types;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS users;

-- Criação das tabelas
CREATE TABLE IF NOT EXISTS users (
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
);

CREATE TABLE IF NOT EXISTS service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DOUBLE
);

CREATE TABLE IF NOT EXISTS event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(255),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(50),
  zip VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  make VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  color VARCHAR(255),
  license_plate VARCHAR(50),
  vin VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_info TEXT NOT NULL,
  date VARCHAR(50) NOT NULL,
  total_aw INT,
  total_value DOUBLE,
  photo_url TEXT,
  note TEXT,
  plate VARCHAR(50),
  chassis_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  service_type_id INT NOT NULL,
  technician_id INT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  description TEXT,
  scheduled_date TIMESTAMP NULL,
  start_date TIMESTAMP NULL,
  completion_date TIMESTAMP NULL,
  location_type VARCHAR(50) NOT NULL,
  address TEXT,
  latitude DOUBLE,
  longitude DOUBLE,
  price DOUBLE,
  administrative_fee DOUBLE DEFAULT 0,
  total DOUBLE,
  notes TEXT,
  aw_value DOUBLE,
  dents INT,
  size VARCHAR(50),
  is_vertical TINYINT,
  is_aluminum TINYINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  photo_type VARCHAR(50) NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date VARCHAR(50) NOT NULL,
  time VARCHAR(50) NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  event_type_id INT NOT NULL,
  technician_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  technician_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP NULL,
  payment_details TEXT,
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_request_id INT NOT NULL,
  service_id INT NOT NULL,
  FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  amount DOUBLE NOT NULL,
  date TIMESTAMP NOT NULL,
  description TEXT NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  provider VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_client_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manager_id INT NOT NULL,
  client_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Criar um usuário admin padrão
INSERT INTO users (username, password, name, email, role)
VALUES 
('admin', '$2b$10$RqsRQUZ3jVUCXnAss9zGO.VfvhGfnRPTFZbzQwTXKLi/c8/L31MrS', 'Admin User', 'admin@example.com', 'admin');

-- Inserir alguns tipos de serviços
INSERT INTO service_types (name, description, base_price) 
VALUES 
('Reparo Simples', 'Martelinho de ouro para pequenos amassados', 150.0),
('Reparo Complexo', 'Martelinho de ouro para amassados maiores', 300.0),
('Restauração', 'Restauração completa de painéis', 500.0);

-- Inserir alguns tipos de eventos
INSERT INTO event_types (name, color) 
VALUES 
('Reunião', '#4f46e5'),
('Serviço', '#10b981'),
('Visita', '#f59e0b');
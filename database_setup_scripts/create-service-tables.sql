-- Tabela de tipos de serviço
CREATE TABLE IF NOT EXISTS service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar um tipo de serviço padrão se não existir
INSERT INTO service_types (name, description, base_price)
SELECT 'Reparo Simples', 'Serviço básico de reparo', 100.00
WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE name = 'Reparo Simples');

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  service_type_id INT NOT NULL,
  technician_id INT,
  status VARCHAR(50) NOT NULL,
  scheduled_date DATETIME,
  start_date DATETIME,
  completion_date DATETIME,
  location_type VARCHAR(50),
  address TEXT,
  latitude DOUBLE,
  longitude DOUBLE,
  price DECIMAL(10, 2),
  administrative_fee DECIMAL(10, 2),
  total DECIMAL(10, 2),
  notes TEXT,
  description TEXT,
  dents INT,
  size INT,
  is_vertical BOOLEAN,
  is_aluminum BOOLEAN,
  aw_value DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);
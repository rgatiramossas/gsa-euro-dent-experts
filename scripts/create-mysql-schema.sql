-- Adaptado para PostgreSQL

-- Drop and recreate tables
DROP TABLE IF EXISTS clients;

-- Create simple clients table for PostgreSQL
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample data
INSERT INTO clients (name, email, phone, address)
VALUES 
('Cliente Teste 1', 'teste1@email.com', '11999999999', 'Rua de Teste, 123'),
('Cliente Teste 2', 'teste2@email.com', '11988888888', 'Avenida Principal, 456');
-- Backup do esquema do banco de dados
-- Executar este SQL para restaurar a estrutura do banco de dados

-- Configuração da extensão requerida para connect-pg-simple
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabelas
DROP TABLE IF EXISTS "payment_request_items";
DROP TABLE IF EXISTS "payment_requests";
DROP TABLE IF EXISTS "service_photos";
DROP TABLE IF EXISTS "manager_client_assignments";
DROP TABLE IF EXISTS "events";
DROP TABLE IF EXISTS "services";
DROP TABLE IF EXISTS "vehicles";
DROP TABLE IF EXISTS "budgets";
DROP TABLE IF EXISTS "clients";
DROP TABLE IF EXISTS "service_types";
DROP TABLE IF EXISTS "event_types";
DROP TABLE IF EXISTS "expenses";
DROP TABLE IF EXISTS "users";

-- Criação das tabelas
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'technician',
    "profile_image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "event_types" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4f46e5',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "service_types" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS "clients" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT,
    "license_plate" TEXT,
    "vin" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "services" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
    "vehicle_id" INTEGER NOT NULL REFERENCES "vehicles"("id"),
    "service_type_id" INTEGER NOT NULL REFERENCES "service_types"("id"),
    "technician_id" INTEGER REFERENCES "users"("id"),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "scheduled_date" TIMESTAMP,
    "start_date" TIMESTAMP,
    "completion_date" TIMESTAMP,
    "location_type" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "administrative_fee" DOUBLE PRECISION DEFAULT 0,
    "total" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "service_photos" (
    "id" SERIAL PRIMARY KEY,
    "service_id" INTEGER NOT NULL REFERENCES "services"("id"),
    "photo_type" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "events" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "event_type_id" INTEGER NOT NULL REFERENCES "event_types"("id"),
    "technician_id" INTEGER NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_requests" (
    "id" SERIAL PRIMARY KEY,
    "technician_id" INTEGER NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_date" TIMESTAMP,
    "payment_details" TEXT
);

CREATE TABLE IF NOT EXISTS "payment_request_items" (
    "id" SERIAL PRIMARY KEY,
    "payment_request_id" INTEGER NOT NULL REFERENCES "payment_requests"("id"),
    "service_id" INTEGER NOT NULL REFERENCES "services"("id")
);

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" SERIAL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "description" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "provider" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "manager_client_assignments" (
    "id" SERIAL PRIMARY KEY,
    "manager_id" INTEGER NOT NULL REFERENCES "users"("id"),
    "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "budgets" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
    "vehicle_info" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "total_aw" INTEGER,
    "total_value" DOUBLE PRECISION,
    "photo_url" TEXT,
    "note" TEXT,
    "plate" TEXT,
    "chassis_number" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais para testes
-- Usuários padrão: admin, técnico, gestor
INSERT INTO "users" ("username", "password", "name", "email", "role") VALUES
('admin', '$2b$10$rMuRYPAIgAnUNDZIwX9iOOZYMD.B3/P76Zwev6kZOPUFVYMJywu/G', 'Administrador', 'admin@eurodent.com', 'admin'),
('joao', '$2b$10$rMuRYPAIgAnUNDZIwX9iOOZYMD.B3/P76Zwev6kZOPUFVYMJywu/G', 'João Pereira', 'joao@eurodent.com', 'technician'),
('ana', '$2b$10$rMuRYPAIgAnUNDZIwX9iOOZYMD.B3/P76Zwev6kZOPUFVYMJywu/G', 'Ana Silva', 'ana@eurodent.com', 'technician'),
('gestor', '$2b$10$rMuRYPAIgAnUNDZIwX9iOOZYMD.B3/P76Zwev6kZOPUFVYMJywu/G', 'Carlos Oliveira', 'carlos@eurodent.com', 'gestor')
ON CONFLICT (username) DO NOTHING;

-- Tipos de serviço
INSERT INTO "service_types" ("name", "description", "base_price") VALUES
('Amassado de Rua', 'Reparos de amassados pequenos e médios em estacionamentos', 150),
('Granizo', 'Reparos de danos causados por granizo', 500),
('Amassados Múltiplos', 'Reparação de múltiplos pontos danificados', 300)
ON CONFLICT DO NOTHING;

-- Tipos de eventos
INSERT INTO "event_types" ("name", "color") VALUES
('Reunião', '#4f46e5'),
('Visita', '#10b981'),
('Serviço', '#f59e0b')
ON CONFLICT DO NOTHING;
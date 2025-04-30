-- Script para limpar dados de clientes, veículos, serviços e orçamentos
-- Mantém os usuários e tipos de serviço

-- Desativar verificações de chave estrangeira temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Limpar tabela de fotos (relacionada aos serviços)
TRUNCATE TABLE photos;

-- Limpar tabela de eventos
TRUNCATE TABLE events;

-- Limpar tabela de serviços
TRUNCATE TABLE services;

-- Limpar tabela de detalhes de orçamento
TRUNCATE TABLE budget_details;

-- Limpar tabela de orçamentos
TRUNCATE TABLE budgets;

-- Limpar tabela de granizo
TRUNCATE TABLE hail_calculation;

-- Limpar tabela de veículos
TRUNCATE TABLE vehicles;

-- Limpar tabela de clientes
TRUNCATE TABLE clients;

-- Reativar verificações de chave estrangeira
SET FOREIGN_KEY_CHECKS = 1;

-- Confirmar limpeza
SELECT 'Dados removidos com sucesso' AS message;
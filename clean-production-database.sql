-- Script para limpar dados de teste e preparar para ambiente de produção
-- Mantém apenas os usuários e configura o banco de dados para um estado inicial

-- Desativar verificação de chaves estrangeiras temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Limpar tabela de pagamentos se existir
SET @payment_exists = (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'payments');
SET @truncate_payments = IF(@payment_exists > 0, 'TRUNCATE TABLE payments', 'SELECT 1');
PREPARE stmt FROM @truncate_payments;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de despesas se existir
SET @expenses_exists = (SELECT COUNT(*) FROM information_schema.tables 
                      WHERE table_schema = DATABASE() 
                      AND table_name = 'expenses');
SET @truncate_expenses = IF(@expenses_exists > 0, 'TRUNCATE TABLE expenses', 'SELECT 1');
PREPARE stmt FROM @truncate_expenses;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de ordens de pagamento se existir
SET @po_exists = (SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'payment_orders');
SET @truncate_po = IF(@po_exists > 0, 'TRUNCATE TABLE payment_orders', 'SELECT 1');
PREPARE stmt FROM @truncate_po;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de fotos de serviços se existir
SET @photos_exists = (SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'service_photos');
SET @truncate_photos = IF(@photos_exists > 0, 'TRUNCATE TABLE service_photos', 'SELECT 1');
PREPARE stmt FROM @truncate_photos;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de serviços se existir
SET @services_exists = (SELECT COUNT(*) FROM information_schema.tables 
                      WHERE table_schema = DATABASE() 
                      AND table_name = 'services');
SET @truncate_services = IF(@services_exists > 0, 'TRUNCATE TABLE services', 'SELECT 1');
PREPARE stmt FROM @truncate_services;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de orçamentos se existir
SET @budgets_exists = (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'budgets');
SET @truncate_budgets = IF(@budgets_exists > 0, 'TRUNCATE TABLE budgets', 'SELECT 1');
PREPARE stmt FROM @truncate_budgets;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de veículos se existir
SET @vehicles_exists = (SELECT COUNT(*) FROM information_schema.tables 
                      WHERE table_schema = DATABASE() 
                      AND table_name = 'vehicles');
SET @truncate_vehicles = IF(@vehicles_exists > 0, 'TRUNCATE TABLE vehicles', 'SELECT 1');
PREPARE stmt FROM @truncate_vehicles;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de clientes se existir
SET @clients_exists = (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'clients');
SET @truncate_clients = IF(@clients_exists > 0, 'TRUNCATE TABLE clients', 'SELECT 1');
PREPARE stmt FROM @truncate_clients;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de tarefas se existir
SET @tasks_exists = (SELECT COUNT(*) FROM information_schema.tables 
                   WHERE table_schema = DATABASE() 
                   AND table_name = 'tasks');
SET @truncate_tasks = IF(@tasks_exists > 0, 'TRUNCATE TABLE tasks', 'SELECT 1');
PREPARE stmt FROM @truncate_tasks;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar tabela de notas se existir
SET @notes_exists = (SELECT COUNT(*) FROM information_schema.tables 
                   WHERE table_schema = DATABASE() 
                   AND table_name = 'notes');
SET @truncate_notes = IF(@notes_exists > 0, 'TRUNCATE TABLE notes', 'SELECT 1');
PREPARE stmt FROM @truncate_notes;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Reativar verificação de chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;

-- Confirmar as mudanças
COMMIT;

-- Verificar tabelas existentes e contagens
SELECT table_name, 
       CASE 
           WHEN table_name = 'users' THEN 
               (SELECT COUNT(*) FROM users)
           WHEN table_name = 'clients' AND @clients_exists > 0 THEN 
               (SELECT COUNT(*) FROM clients)
           WHEN table_name = 'services' AND @services_exists > 0 THEN 
               (SELECT COUNT(*) FROM services)
           WHEN table_name = 'budgets' AND @budgets_exists > 0 THEN 
               (SELECT COUNT(*) FROM budgets)
           WHEN table_name = 'vehicles' AND @vehicles_exists > 0 THEN 
               (SELECT COUNT(*) FROM vehicles)
           WHEN table_name = 'service_photos' AND @photos_exists > 0 THEN 
               (SELECT COUNT(*) FROM service_photos)
           WHEN table_name = 'payments' AND @payment_exists > 0 THEN 
               (SELECT COUNT(*) FROM payments)
           WHEN table_name = 'expenses' AND @expenses_exists > 0 THEN 
               (SELECT COUNT(*) FROM expenses)
           WHEN table_name = 'payment_orders' AND @po_exists > 0 THEN 
               (SELECT COUNT(*) FROM payment_orders)
           WHEN table_name = 'tasks' AND @tasks_exists > 0 THEN 
               (SELECT COUNT(*) FROM tasks)
           WHEN table_name = 'notes' AND @notes_exists > 0 THEN 
               (SELECT COUNT(*) FROM notes)
           ELSE 0
       END as count
FROM (
    SELECT 'users' as table_name UNION
    SELECT 'clients' UNION
    SELECT 'services' UNION
    SELECT 'budgets' UNION
    SELECT 'vehicles' UNION
    SELECT 'service_photos' UNION
    SELECT 'payments' UNION
    SELECT 'expenses' UNION
    SELECT 'payment_orders' UNION
    SELECT 'tasks' UNION
    SELECT 'notes'
) as tables;
-- Adiciona a coluna provider à tabela expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider TEXT;
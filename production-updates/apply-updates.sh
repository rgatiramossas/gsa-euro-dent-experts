#!/bin/bash

# Script para aplicar atualizações no ambiente de produção
# Deve ser executado na raiz do projeto

echo "=== Aplicando Atualizações Euro Dent Experts ==="
echo "Data: $(date '+%d/%m/%Y %H:%M:%S')"

# Verificar se está no diretório correto
if [ ! -d "client" ] || [ ! -d "server" ]; then
  echo "ERRO: Este script deve ser executado na raiz do projeto Euro Dent Experts."
  echo "Por favor, navegue até o diretório raiz e tente novamente."
  exit 1
fi

# Criar backup dos arquivos originais
echo "Criando backup dos arquivos originais..."
BACKUP_DIR="backup-$(date '+%Y%m%d-%H%M%S')"
mkdir -p "$BACKUP_DIR/client/src/components"
mkdir -p "$BACKUP_DIR/client/src/pages/services"

# Backup dos arquivos originais
if [ -f "client/src/components/NewBudgetForm.tsx" ]; then
  cp client/src/components/NewBudgetForm.tsx "$BACKUP_DIR/client/src/components/"
  echo "✓ Backup de NewBudgetForm.tsx criado"
else
  echo "! Arquivo NewBudgetForm.tsx não encontrado para backup"
fi

if [ -f "client/src/pages/services/new-service.tsx" ]; then
  cp client/src/pages/services/new-service.tsx "$BACKUP_DIR/client/src/pages/services/"
  echo "✓ Backup de new-service.tsx criado"
else
  echo "! Arquivo new-service.tsx não encontrado para backup"
fi

# Aplicar as atualizações
echo "Aplicando atualizações..."

# Copiar arquivos atualizados
cp "components/NewBudgetForm.tsx" "client/src/components/"
cp "pages/services/new-service.tsx" "client/src/pages/services/"

echo "✓ Arquivos substituídos com sucesso"

# Compilar o projeto
echo "Iniciando compilação do projeto..."
echo "Este processo pode levar alguns minutos..."
npm run build

# Verificar se a compilação foi bem-sucedida
if [ $? -eq 0 ]; then
  echo "✓ Compilação concluída com sucesso!"
  echo "As atualizações foram aplicadas e o sistema está pronto para uso."
else
  echo "! Erro durante a compilação. Restaurando backup..."
  
  # Restaurar backup em caso de erro
  cp "$BACKUP_DIR/client/src/components/NewBudgetForm.tsx" "client/src/components/"
  cp "$BACKUP_DIR/client/src/pages/services/new-service.tsx" "client/src/pages/services/"
  
  echo "✓ Backup restaurado"
  echo "! Por favor, verifique os erros acima e tente novamente."
  exit 1
fi

echo "=== Processo de Atualização Concluído ==="
echo "Backup dos arquivos originais disponível em: $BACKUP_DIR"
echo "Reinicie o servidor para aplicar as alterações."
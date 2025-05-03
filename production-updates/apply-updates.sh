#!/bin/bash

# Script para aplicar atualizações do sistema Euro Dent Experts
# Versão: 1.0.0
# Data: 03/05/2025

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}= Atualização do Sistema Euro Dent Experts =${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Verifique se está sendo executado como root ou com permissões suficientes
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Aviso: Este script não está sendo executado como root.${NC}"
  echo -e "${YELLOW}Algumas operações podem falhar se não houver permissões suficientes.${NC}"
  echo ""
  read -p "Continuar mesmo assim? (s/n): " continue_anyway
  if [ "$continue_anyway" != "s" ]; then
    echo -e "${RED}Operação cancelada pelo usuário.${NC}"
    exit 1
  fi
fi

# Verificar a existência dos arquivos necessários
echo -e "${BLUE}[1/5]${NC} Verificando arquivos de atualização..."
if [ ! -f "INSTRUCOES-FINAIS.md" ] || [ ! -d "components" ] || [ ! -d "pages" ]; then
  echo -e "${RED}Erro: Arquivos necessários não encontrados.${NC}"
  echo "Certifique-se de que este script está no diretório correto após extrair o pacote de atualização."
  exit 1
fi
echo -e "${GREEN}Arquivos de atualização encontrados com sucesso.${NC}"
echo ""

# Solicitar caminho para o diretório de instalação
echo -e "${BLUE}[2/5]${NC} Configuração do diretório de instalação"
read -p "Digite o caminho completo para o diretório raiz da aplicação: " app_dir

# Verificar se o diretório existe
if [ ! -d "$app_dir" ]; then
  echo -e "${RED}Erro: Diretório '$app_dir' não existe.${NC}"
  exit 1
fi

# Verificar se é realmente um diretório da aplicação Euro Dent Experts
if [ ! -d "$app_dir/client" ] || [ ! -d "$app_dir/server" ]; then
  echo -e "${YELLOW}Aviso: Este não parece ser um diretório válido da aplicação.${NC}"
  echo "Não foram encontrados os diretórios client/ e server/ no caminho especificado."
  read -p "Continuar mesmo assim? (s/n): " continue_anyway
  if [ "$continue_anyway" != "s" ]; then
    echo -e "${RED}Operação cancelada pelo usuário.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Diretório de instalação validado: $app_dir${NC}"
echo ""

# Criar backup antes de aplicar as alterações
echo -e "${BLUE}[3/5]${NC} Criando backup dos arquivos originais..."

backup_dir="$app_dir/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir/components"
mkdir -p "$backup_dir/pages/services"
mkdir -p "$backup_dir/pages/clients"

# Backup dos arquivos que serão modificados
if [ -f "$app_dir/client/src/components/NewBudgetForm.tsx" ]; then
  cp "$app_dir/client/src/components/NewBudgetForm.tsx" "$backup_dir/components/"
fi

if [ -f "$app_dir/client/src/pages/services/new-service.tsx" ]; then
  cp "$app_dir/client/src/pages/services/new-service.tsx" "$backup_dir/pages/services/"
fi

if [ -f "$app_dir/client/src/pages/clients/\$id.tsx" ]; then
  cp "$app_dir/client/src/pages/clients/\$id.tsx" "$backup_dir/pages/clients/"
fi

if [ -f "$app_dir/client/src/pages/clients/new-vehicle.tsx" ]; then
  cp "$app_dir/client/src/pages/clients/new-vehicle.tsx" "$backup_dir/pages/clients/"
fi

echo -e "${GREEN}Backup criado em: $backup_dir${NC}"
echo ""

# Aplicar as atualizações
echo -e "${BLUE}[4/5]${NC} Aplicando atualizações..."

# Atualizar o formulário de orçamento
echo "Atualizando o formulário de orçamento..."
cp "components/NewBudgetForm.tsx" "$app_dir/client/src/components/"

# Atualizar a página de criação de serviço
echo "Atualizando a página de criação de serviço..."
cp "pages/services/new-service.tsx" "$app_dir/client/src/pages/services/"

# Atualizar a página de detalhes do cliente (com tratamento especial para o $)
echo "Atualizando a página de detalhes do cliente..."
cp "pages/clients/id.tsx" "$app_dir/client/src/pages/clients/\$id.tsx"

# Atualizar a página de novo veículo
echo "Atualizando a página de cadastro de veículos..."
cp "pages/clients/new-vehicle.tsx" "$app_dir/client/src/pages/clients/"

echo -e "${GREEN}Todas as atualizações foram aplicadas com sucesso!${NC}"
echo ""

# Instruções finais
echo -e "${BLUE}[5/5]${NC} Instruções finais"
echo -e "${YELLOW}As seguintes alterações foram aplicadas:${NC}"
echo "1. Aprimoramento dos campos de amassados no formulário de orçamento"
echo "2. Melhoria na exibição de preços na seleção de tipos de serviço"
echo "3. Correção da atualização automática de veículos após cadastro"
echo ""
echo -e "${YELLOW}Para completar a instalação:${NC}"
echo "1. Reconstrua a aplicação executando: npm run build"
echo "2. Reinicie o servidor: pm2 restart all"
echo "3. Verifique se o sistema está funcionando corretamente seguindo o CHECKLIST-VERIFICACAO.md"
echo ""
echo -e "${BLUE}Em caso de problemas:${NC}"
echo "1. Restaure o backup de: $backup_dir"
echo "2. Entre em contato com o suporte através dos dados em INSTRUCOES-FINAIS.md"
echo ""
echo -e "${GREEN}Atualização concluída com sucesso!${NC}"
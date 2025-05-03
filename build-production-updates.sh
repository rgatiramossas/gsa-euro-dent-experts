#!/bin/bash

# Script para aplicar atualizações específicas na build de produção
# Este script é mais eficiente que uma compilação completa

echo "=== Script de Atualização de Produção ==="
echo "Preparando diretórios..."

# Criar diretório de build se não existir
mkdir -p production-updates
mkdir -p production-updates/components
mkdir -p production-updates/pages/services

# Copiar arquivos modificados
echo "Copiando arquivos modificados..."
cp client/src/components/NewBudgetForm.tsx production-updates/components/
cp client/src/pages/services/new-service.tsx production-updates/pages/services/

# Adicionar documentação
echo "Adicionando documentação..."
cp deployment-changes-readme.md production-updates/

# Criar arquivo de instruções
cat > production-updates/README.md << EOL
# Atualizações de Produção - Euro Dent Experts

Este pacote contém atualizações específicas para o sistema Euro Dent Experts que devem ser aplicadas no ambiente de produção.

## Arquivos Incluídos

- \`components/NewBudgetForm.tsx\`: Correção para campos de amassados no formulário de orçamento
- \`pages/services/new-service.tsx\`: Melhoria na exibição de preços na seleção de tipos de serviço

## Instruções de Aplicação

1. Substitua os arquivos correspondentes no seu ambiente de produção
2. Execute uma compilação de produção usando \`npm run build\`
3. Teste as funcionalidades após a implantação

## Registro de Alterações

Veja o arquivo \`deployment-changes-readme.md\` para detalhes completos das alterações realizadas.

## Data da Atualização

$(date '+%d/%m/%Y %H:%M:%S')
EOL

# Criar arquivo ZIP para facilitar o download
echo "Criando arquivo ZIP de atualização..."
zip -r production-updates.zip production-updates

echo "=== Processo de Atualização Concluído ==="
echo "Arquivo production-updates.zip criado com sucesso!"
echo "Este arquivo contém todas as alterações necessárias para atualizar o ambiente de produção."
echo "Faça o download deste arquivo e siga as instruções contidas em README.md para aplicá-lo."
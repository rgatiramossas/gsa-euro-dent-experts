# Guia de Implementação das Atualizações

Este documento fornece um passo a passo detalhado para implementar as atualizações no ambiente de produção do Euro Dent Experts.

## Pré-requisitos

- Acesso ao servidor de produção
- Permissões para modificar arquivos e executar scripts
- Backup recente do sistema (por segurança)

## Método 1: Utilizando o Script Automatizado

1. Descompacte o arquivo `production-updates.zip` no ambiente de produção
2. Navegue até o diretório onde o conteúdo foi extraído
3. Copie o script `apply-updates.sh` para a raiz do projeto Euro Dent Experts
4. Dê permissão de execução ao script:
   ```bash
   chmod +x apply-updates.sh
   ```
5. Execute o script:
   ```bash
   ./apply-updates.sh
   ```
6. Siga as instruções exibidas pelo script

## Método 2: Implementação Manual

Se preferir aplicar as alterações manualmente, siga estes passos:

1. Faça backup dos arquivos originais:
   ```bash
   mkdir -p backup/client/src/components
   mkdir -p backup/client/src/pages/services
   cp client/src/components/NewBudgetForm.tsx backup/client/src/components/
   cp client/src/pages/services/new-service.tsx backup/client/src/pages/services/
   ```

2. Substitua os arquivos com as versões atualizadas:
   ```bash
   cp production-updates/components/NewBudgetForm.tsx client/src/components/
   cp production-updates/pages/services/new-service.tsx client/src/pages/services/
   ```

3. Recompile o projeto:
   ```bash
   npm run build
   ```

4. Reinicie o servidor:
   ```bash
   # Se estiver usando PM2
   pm2 restart app-name
   
   # Se estiver usando Systemd
   sudo systemctl restart eurodent
   ```

## Verificação de Funcionamento

Após a implantação, verifique:

1. Acesse o sistema como usuário
2. Navegue até o formulário de orçamento
3. Verifique se os campos de amassados (20mm, 30mm, 40mm) ficam vazios ao clicar neles
4. Navegue até a tela de nova ordem de serviço
5. Verifique se a seleção de tipos de serviço mostra apenas o preço quando este existe

## Rollback (Em Caso de Problemas)

Se encontrar problemas, restaure os arquivos de backup:

```bash
cp backup/client/src/components/NewBudgetForm.tsx client/src/components/
cp backup/client/src/pages/services/new-service.tsx client/src/pages/services/
npm run build
# Reinicie o servidor conforme instruções acima
```

## Suporte

Em caso de dúvidas ou problemas durante a implementação, entre em contato com o desenvolvedor responsável.

Data de criação: 03/05/2025
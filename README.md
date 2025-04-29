# Euro Dent - Sistema de Gerenciamento de Serviços Automotivos

## Sobre o Projeto

Euro Dent é uma plataforma completa de gerenciamento de serviços automotivos que facilita a criação de orçamentos, gestão de técnicos e avaliação de danos para profissionais de serviços.

## Tecnologias Principais

- **Frontend**: React com Tailwind CSS para uma interface moderna e responsiva
- **Backend**: Node.js com Express
- **Banco de Dados**: MySQL com Drizzle ORM
- **Autenticação**: Sistema seguro baseado em sessões
- **UI/UX**: Componentes shadcn/ui personalizados

## Estrutura do Projeto

```
/
├── client/                 # Código frontend React
├── server/                 # Código backend Express
├── shared/                 # Tipos e schemas compartilhados
├── scripts/                # Scripts de utilidade
│   ├── one-time/           # Scripts executados uma única vez
│   ├── sql/                # Scripts SQL para manutenção do BD
│   └── data-generation/    # Scripts para gerar dados de teste
├── unused_components/      # Componentes não utilizados (arquivados)
├── unused_schemas/         # Schemas antigos (arquivados)
├── uploads/                # Arquivos enviados pelos usuários
└── clean-production-data.cjs  # Script para limpar dados de teste
```

## Otimizações Realizadas

### 1. Remoção de Componentes Não Utilizados
Para reduzir o tamanho do bundle e melhorar a manutenção, os seguintes componentes não utilizados foram movidos para `unused_components/`:
- accordion
- alert-dialog
- aspect-ratio
- breadcrumb
- carousel
- chart
- collapsible
- context-menu
- drawer
- hover-card
- input-otp
- menubar
- navigation-menu
- pagination
- resizable
- sidebar
- slider
- toggle-group

### 2. Organização de Schemas
- Schemas legados foram movidos para `unused_schemas/` mantendo compatibilidade
- Documentação clara sobre a estrutura atual do banco

### 3. Organização de Scripts
- Scripts de utilidade organizados em diretórios específicos
- Documentação sobre finalidade e uso de cada script

### 4. Preparação para Produção
O script `clean-production-data.cjs` realiza:
- Limpeza de dados de teste preservando contas de usuários
- Remoção de arquivos de upload de teste
- Preparação do banco de dados para ambiente de produção

## Como Usar o Script de Limpeza para Produção

O script `clean-production-data.cjs` limpa todos os dados de teste do sistema enquanto preserva as contas de usuário, preparando o banco de dados para uso em produção.

```bash
# Executar o script de limpeza
node clean-production-data.cjs
```

O script realiza as seguintes operações:
1. Limpa todas as tabelas exceto 'users'
2. Remove todos os arquivos de upload em uploads/service, uploads/vehicle, uploads/client
3. Gera um relatório com estatísticas das tabelas após a limpeza

## Desenvolvimento

### Ambientes
- **Desenvolvimento**: Configurado para desenvolvimento local
- **Produção**: Otimizado para desempenho e segurança

### Banco de Dados
- Configuração completa via variáveis de ambiente
- Migração automática de schema
- Backup e restauração facilitados

## Contato

Para mais informações sobre o projeto, entre em contato com a equipe de desenvolvimento.
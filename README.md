# Euro Dent Experts

Sistema de gerenciamento de serviços automotivos para profissionais, especializado em reparo de granizo (PDR - Paintless Dent Repair).

## Estrutura do Projeto

### Diretórios Principais
- `client/`: Contém o código do frontend React
- `server/`: Contém o código do backend Express
- `shared/`: Contém schemas e tipos compartilhados entre frontend e backend
- `uploads/`: Diretório para upload de arquivos de imagens
- `public/`: Arquivos estáticos públicos

### Diretórios de Componentes
- `client/src/components/`: Componentes React utilizados no aplicativo
- `client/src/pages/`: Páginas principais do aplicativo

### Diretórios de Utilitários
- `unused_components/`: Componentes UI removidos do projeto mas mantidos para referência
- `unused_schemas/`: Schemas antigos (PostgreSQL) mantidos para referência
- `database_setup_scripts/`: Scripts para configuração inicial do banco de dados MySQL
- `database_utility_scripts/`: Scripts de utilidades para manutenção do banco de dados
- `sample_data_scripts/`: Scripts para geração de dados de amostra

## Banco de Dados

O aplicativo utiliza MySQL para armazenamento de dados.

### Arquivos de Configuração
- `shared/schema.mysql.ts`: Define o schema do banco de dados usando Drizzle ORM
- `server/db-mysql.ts`: Configuração de conexão ao banco de dados MySQL

## Principais Recursos

- Cadastro e Gerenciamento de Clientes
- Cadastro e Gerenciamento de Veículos
- Criação de Orçamentos com Cálculos Automáticos
- Gerenciamento de Serviços
- Dashboard com Estatísticas
- Sistema de Autenticação e Controle de Acesso
- Upload de Imagens de Veículos e Serviços
- Histórico de Serviços por Cliente

## Tecnologias Utilizadas

- **Frontend**: React, TailwindCSS, Shadcn/UI
- **Backend**: Express.js, Drizzle ORM
- **Banco de Dados**: MySQL
- **Autenticação**: Passport.js, Express-Session
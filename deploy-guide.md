# Guia de Deploy para Produção - Euro Dent Experts

Este guia explica o processo de preparação e deploy do sistema Euro Dent Experts para um ambiente de produção.

## 1. Pré-requisitos

- Node.js 18.x ou superior
- MySQL 8.0 ou superior
- Acesso SSH ao servidor de produção
- Domínio configurado (opcional para HTTPS)

## 2. Preparação do Ambiente de Desenvolvimento

### 2.1 Limpeza de Dados de Teste

Antes de preparar o build, execute o script de limpeza para remover dados de teste:

```bash
node prepare-for-production.js
```

Este script:
- Remove todos os clientes, veículos, serviços e orçamentos de teste
- Mantém apenas os usuários do sistema (admin, técnicos)
- Limpa arquivos de upload não necessários
- Gera um relatório de verificação

### 2.2 Configuração do Ambiente

Crie ou modifique o arquivo `.env.production` com as configurações de produção:

```
# MySQL Database Configuration
MYSQL_HOST=seu-host-mysql
MYSQL_USER=seu-usuario-mysql
MYSQL_PASSWORD=sua-senha-mysql
MYSQL_DATABASE=seu-banco-mysql
MYSQL_PORT=3306

# Session secret - Use um valor forte e único
SESSION_SECRET=gere-um-valor-secreto-forte-e-unico

# Session configuration
COOKIE_MAX_AGE=86400000  # 24 horas em milissegundos (1 dia)
COOKIE_SECURE=true       # Usar HTTPS em produção
COOKIE_SAME_SITE=lax     # Configuração para navegações normais

# Uploads directory
UPLOADS_DIR=./uploads
```

> **IMPORTANTE:** Nunca comite o arquivo `.env.production` com credenciais reais em repositórios. Use variáveis de ambiente no servidor.

## 3. Processo de Build

### 3.1 Build do Projeto

Execute o comando de build:

```bash
npm run build
```

Este comando:
1. Compila o frontend React usando Vite
2. Compila o backend usando esbuild
3. Otimiza todos os assets estáticos

Se o processo de build falhar devido a timeout, tente construir o frontend e backend separadamente:

```bash
# Build do frontend
npx vite build

# Build do backend
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

### 3.2 Verificação da Build

Após o build, você terá:
- Diretório `dist/` com o código do servidor compilado
- Diretório `dist/assets/` com os assets estáticos do frontend
- Arquivos HTML, CSS e JS otimizados na raiz do diretório `dist/`

## 4. Deploy em Produção

### 4.1 Estrutura de Arquivos no Servidor

Transfira os seguintes arquivos para o servidor:

```
dist/            # Código compilado do backend e frontend
public/          # Arquivos estáticos públicos (SW, manifesto, ícones)
uploads/         # Diretório de uploads (crie as subpastas necessárias)
.env.production  # Configuração de produção (ou use variáveis de ambiente)
package.json     # Para instalar dependências
```

### 4.2 Instalação no Servidor

```bash
# Instalar dependências de produção
npm install --production

# Iniciar o servidor em modo de produção
NODE_ENV=production node dist/index.js
```

Recomenda-se usar um gerenciador de processos como PM2:

```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start dist/index.js --name eurodent-experts --env production
```

### 4.3 Configuração do Servidor Web (Nginx)

Para servir a aplicação através do Nginx:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Redirecionar para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name seu-dominio.com;

    # Configuração SSL
    ssl_certificate /caminho/para/certificado.pem;
    ssl_certificate_key /caminho/para/chave.pem;

    # Diretivas de segurança para PWA
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.seu-dominio.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    
    # Headers para PWA e caching
    location /sw.js {
        add_header Cache-Control "no-cache";
        proxy_pass http://localhost:5000/sw.js;
    }
    
    location /manifest.json {
        add_header Cache-Control "no-cache";
        proxy_pass http://localhost:5000/manifest.json;
    }

    # Arquivos estáticos
    location /assets {
        proxy_pass http://localhost:5000/assets;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Cache para assets estáticos
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    # Diretório de uploads
    location /uploads {
        proxy_pass http://localhost:5000/uploads;
        proxy_http_version 1.1;
        client_max_body_size 50M;
        proxy_set_header Host $host;
    }

    # Todas as outras requisições
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. Pós-deploy

### 5.1 Verificações

Verifique os seguintes aspectos após o deploy:

- Autenticação funciona corretamente
- PWA pode ser instalado
- Recursos offline estão disponíveis
- Sincronização funciona quando conexão é restabelecida
- Uploads de imagens funcionam corretamente

### 5.2 Monitoramento

Configure monitoramento para:

- Uso de memória do servidor Node.js
- Espaço em disco (importante para os uploads)
- Conexões ao banco de dados
- Tempo de resposta da API

## 6. Backup e Manutenção

### 6.1 Backup do Banco de Dados

Configure backups automáticos do banco de dados:

```bash
# Exemplo com mysqldump
mysqldump -u [usuario] -p [senha] eurodent_novobd > backup_$(date +%Y%m%d).sql
```

### 6.2 Backup de Arquivos de Upload

Faça backup regular do diretório de uploads:

```bash
# Exemplo com tar
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./uploads
```

## 7. Resolução de Problemas

### 7.1 Problemas comuns

- **Erro de conexão ao banco:** Verifique as credenciais MySQL e acesso à rede
- **Problemas de sessão:** Execute o script `fix-sessions-table.js` para corrigir a tabela de sessões
- **Arquivos de upload não aparecem:** Verifique permissões do diretório `uploads`
- **Service Worker não atualiza:** Force a atualização através do console do navegador

### 7.2 Logs e Diagnóstico

- Verifique os logs do PM2: `pm2 logs eurodent-experts`
- Utilize o console do navegador para erros de frontend
- Monitore o diretório de logs do MySQL para problemas de banco de dados

## 8. Atualização do Sistema

Para atualizar o sistema em produção:

1. Faça backup do banco de dados e arquivos
2. Git pull das atualizações (ou transfira os novos arquivos)
3. Execute `npm install` para atualizar dependências
4. Execute `npm run build` para criar uma nova build
5. Reinicie o serviço: `pm2 restart eurodent-experts`

---

## Informações Adicionais

- **Versão atual:** 1.0.0
- **Contato para suporte:** [seu-email@dominio.com]
- **Documentação do projeto:** [link para documentação interna]
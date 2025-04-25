# Euro Dent Experts - Pacote de Produção

## Informações da Build

Esta build foi otimizada para implantação na raiz de um servidor web, com funcionalidades de segurança melhoradas incluindo integração com AWS Parameter Store.

## Arquivos Incluídos

- **server/** - Código do servidor, incluindo a implementação AWS
- **shared/** - Código compartilhado entre cliente e servidor
- **client/** - Código do cliente (frontend)
- **public/** - Recursos públicos estáticos
- **scripts/** - Scripts de utilitário para verificação e diagnóstico
- **uploads/** - Diretório para upload de arquivos (deve ter permissões de escrita)
- **docs/** - Documentação técnica

## Instruções de Implantação

1. Descompacte este pacote na raiz do seu servidor web
2. Renomeie o arquivo `.env.production.template` para `.env` e preencha com valores apropriados
3. Execute `npm install --production` para instalar as dependências necessárias
4. Execute `node scripts/initialize-environment.js` para verificar se tudo está configurado corretamente
5. Inicie a aplicação com `npm start` ou configure-a para iniciar com seu gerenciador de processos (pm2, systemd, etc.)

## Configuração AWS Parameter Store (Recomendado)

Para usar o AWS Parameter Store para credenciais de banco de dados:

1. Configure um parâmetro no AWS Systems Manager com o seguinte formato JSON:
   ```json
   {
     "host": "seu-host-do-banco-de-dados",
     "user": "seu-usuario-do-banco",
     "password": "sua-senha-do-banco",
     "database": "nome-do-seu-banco-de-dados",
     "port": "3306"
   }
   ```

2. Configure as seguintes variáveis de ambiente no arquivo `.env`:
   ```
   USE_AWS_PARAMETER_STORE=true
   AWS_REGION=sua-região-aws
   DB_PARAM_NAME=/meuapp/segredoDB
   AWS_ACCESS_KEY_ID=sua-access-key-id
   AWS_SECRET_ACCESS_KEY=sua-secret-access-key
   ```

## Segurança

- Mantenha as credenciais AWS e de banco de dados seguras
- Certifique-se de que o diretório `uploads/` tenha permissões de escrita
- Use HTTPS para acesso ao site em produção
- Atualize regularmente todas as dependências

Para mais informações, consulte a documentação em `docs/`.

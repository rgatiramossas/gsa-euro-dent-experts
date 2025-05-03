# Checklist de Deploy - Euro Dent Experts

## 1. Preparação de Ambiente

- [ ] Credenciais MySQL de produção configuradas
- [ ] Variáveis de ambiente de produção definidas em `.env.production`
- [ ] Sessão configurada para HTTPS (COOKIE_SECURE=true)
- [ ] SESSION_SECRET atualizado com valor forte
- [ ] Diretório `uploads/` e subdiretórios criados

## 2. Limpeza de Dados

- [ ] Execute `node prepare-for-production.js` para limpar dados de teste
- [ ] Confirme que apenas usuários administrativos foram mantidos
- [ ] Verifique que arquivos de upload de teste foram removidos

## 3. Conteúdo do Service Worker

- [ ] Verificar atualização do CACHE_NAME (atualmente 'eurodent-cache-v3')
- [ ] Confirme que URLs críticas estão em INITIAL_CACHED_RESOURCES
- [ ] Verifique estratégias de cache para diferentes tipos de conteúdo

## 4. Build do Projeto

- [ ] Execute `npm run build` para compilar frontend e backend
- [ ] Verifique se diretório `dist/` foi criado com sucesso
- [ ] Confirme que arquivos de manifesto e service worker estão na pasta `dist/`

## 5. Deploy para Servidor

- [ ] Transfira arquivos necessários para o servidor de produção:
  - [ ] Pasta `dist/` (código compilado)
  - [ ] Pasta `public/` (static assets)
  - [ ] Pasta `uploads/` (diretório para uploads)
  - [ ] Arquivo `.env.production` ou configure variáveis de ambiente
  - [ ] Arquivo `package.json` para instalar dependências

## 6. Configuração do Servidor

- [ ] Instale dependências com `npm install --production`
- [ ] Configure nginx ou outro servidor web como proxy reverso
- [ ] Configure certificados SSL (para HTTPS)
- [ ] Configure o gerenciador de processos (PM2 recomendado)

## 7. Verificações Pós-Deploy

- [ ] Teste autenticação (login/logout)
- [ ] Teste funcionalidades principais online
- [ ] Teste funcionalidades offline (desconectando internet)
- [ ] Verifique sincronização ao reconectar
- [ ] Teste upload e visualização de imagens
- [ ] Verifique que app pode ser instalado como PWA
- [ ] Teste em diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Teste em dispositivos móveis

## 8. Backup e Monitoramento

- [ ] Configure backup automático do banco de dados
- [ ] Configure backup do diretório de uploads
- [ ] Implemente monitoramento de performance
- [ ] Configure alertas para problemas no servidor

## 9. Segurança

- [ ] Remova endpoint de debug `/api/debug/clear-sessions` após testes
- [ ] Verifique configurações de CORS
- [ ] Confirme que SESSION_SECRET é forte e único em produção
- [ ] Verifique que senhas de banco de dados são seguras

## 10. Documentação

- [ ] Documente o processo de deploy realizado
- [ ] Atualize documentação com detalhes de acesso
- [ ] Prepare documentação para usuários finais
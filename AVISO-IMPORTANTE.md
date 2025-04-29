# AVISO IMPORTANTE - PREPARAÇÃO PARA PRODUÇÃO

## Limpeza de Dados de Teste

Este projeto possui um script especial para preparar o sistema para uso em ambiente de produção. O script `clean-production-data.cjs` realiza as seguintes operações:

1. **Limpa todos os dados de teste** do banco de dados, incluindo:
   - Serviços
   - Fotos de serviços
   - Orçamentos
   - Veículos
   - Clientes
   - Despesas
   - Outros registros relacionados

2. **Preserva apenas as contas de usuários** para que você possa continuar acessando o sistema.

3. **Remove todos os arquivos de upload de teste** nas pastas:
   - `uploads/service/`
   - `uploads/vehicle/`
   - `uploads/client/`

## Como Executar a Limpeza

Para preparar o sistema para uso em produção, siga os passos abaixo:

1. Faça backup do banco de dados (caso necessário preservar dados)
2. Execute o comando:

```bash
node clean-production-data.cjs
```

3. Verifique o relatório gerado para confirmar que a limpeza foi realizada com sucesso.

## ATENÇÃO

⚠️ **Este processo é irreversível!** Todos os dados de teste serão permanentemente removidos.

⚠️ **Apenas execute em produção** quando estiver pronto para começar a usar o sistema com dados reais.

⚠️ **Mantenha backup** caso precise recuperar alguma informação específica.

---

Para mais informações sobre a estrutura e funcionamento do sistema, consulte o arquivo README.md.

Para suporte técnico, entre em contato com a equipe de desenvolvimento.
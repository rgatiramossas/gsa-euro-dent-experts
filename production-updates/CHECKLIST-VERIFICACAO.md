# Checklist de Verificação - Atualização de Produção

Este documento fornece um checklist detalhado para verificar o funcionamento correto das atualizações após sua implantação no ambiente de produção.

## Formulário de Orçamento - Campos de Amassados

### Verificar campo 20mm
- [ ] Ao abrir um novo orçamento, o campo mostra "0"
- [ ] Ao clicar no campo, o "0" desaparece
- [ ] Ao digitar um valor, ele é aceito corretamente
- [ ] Ao sair do campo sem digitar nada, o "0" retorna

### Verificar campo 30mm
- [ ] Ao abrir um novo orçamento, o campo mostra "0"
- [ ] Ao clicar no campo, o "0" desaparece
- [ ] Ao digitar um valor, ele é aceito corretamente
- [ ] Ao sair do campo sem digitar nada, o "0" retorna

### Verificar campo 40mm
- [ ] Ao abrir um novo orçamento, o campo mostra "0"
- [ ] Ao clicar no campo, o "0" desaparece
- [ ] Ao digitar um valor, ele é aceito corretamente
- [ ] Ao sair do campo sem digitar nada, o "0" retorna

### Verificar cálculos
- [ ] Ao inserir valores, o total é calculado corretamente
- [ ] Os cálculos consideram corretamente o tipo de material (alumínio, cola, pintura)

## Seleção de Tipos de Serviço

### Verificar exibição de preços
- [ ] Tipos de serviço com preço definido mostram o valor: "Nome (€ XX.XX)"
- [ ] Tipos de serviço sem preço definido mostram apenas o nome, sem "(€ 0.00)"

### Verificar comportamento ao selecionar
- [ ] Ao selecionar um tipo de serviço com preço, o valor é preenchido automaticamente
- [ ] A seleção funciona corretamente em todos os navegadores testados

## Testes Gerais

### Compatibilidade com navegadores
- [ ] Funciona no Chrome
- [ ] Funciona no Firefox
- [ ] Funciona no Safari (se aplicável)
- [ ] Funciona no Edge (se aplicável)

### Verificação em dispositivos móveis
- [ ] Funciona em smartphones Android
- [ ] Funciona em iPhones (se aplicável)
- [ ] A interface é responsiva e utilizável em telas menores

### Verificação de modo offline
- [ ] As alterações funcionam corretamente no modo offline
- [ ] Dados inseridos offline são sincronizados quando a conexão é restaurada

## Instruções para Teste

1. Para cada item do checklist, marque a caixa com um "x" quando verificado: `[x]`
2. Se encontrar algum problema, anote-o detalhadamente abaixo da seção correspondente
3. Após concluir todos os testes, encaminhe este checklist preenchido para o desenvolvedor responsável

## Problemas Encontrados

(Anote aqui qualquer problema encontrado durante a verificação)

---

**Testado por:** ________________________

**Data:** ______/______/____________

**Versão:** _________________________
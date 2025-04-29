/**
 * Script para executar todos os passos de preparação para produção
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== PREPARANDO SISTEMA PARA PRODUÇÃO ===');

// Função para executar comandos com tratamento de erro
function runCommand(command, message) {
  console.log(`\n> ${message}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ ${message} concluído com sucesso.`);
    return true;
  } catch (error) {
    console.error(`✗ Erro ao ${message.toLowerCase()}:`);
    console.error(error.message);
    return false;
  }
}

// Verificar se o script de limpeza existe
if (!fs.existsSync('./clean-production-data.cjs')) {
  console.error('Erro: O arquivo clean-production-data.cjs não foi encontrado.');
  console.error('Por favor, verifique se o arquivo existe na pasta raiz do projeto.');
  process.exit(1);
}

// Executar os passos de preparação para produção
console.log('\n1. Limpando dados de teste do banco de dados...');
const cleanResult = runCommand('node clean-production-data.cjs', 'Limpeza de dados');

if (!cleanResult) {
  console.error('\nErro durante a preparação. Processo interrompido.');
  process.exit(1);
}

console.log('\n=== SISTEMA PREPARADO PARA PRODUÇÃO ===');
console.log('✓ Dados de teste removidos');
console.log('✓ Arquivos de upload limpos');
console.log('✓ Contas de usuário preservadas');
console.log('\nO sistema está pronto para ser usado em ambiente de produção.');
console.log('Para mais informações, consulte o arquivo README.md e AVISO-IMPORTANTE.md');
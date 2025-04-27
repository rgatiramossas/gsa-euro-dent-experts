#!/usr/bin/env node
/**
 * Script de configuração do projeto Euro Dent Experts
 * Este script ajuda na configuração inicial do projeto após um remix ou reinstalação
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}=======================================${colors.reset}`);
console.log(`${colors.blue}    Euro Dent Experts - Setup Tool     ${colors.reset}`);
console.log(`${colors.blue}=======================================${colors.reset}`);

// Verifica se o banco de dados está configurado
function checkDbConnection() {
  console.log(`\n${colors.cyan}Verificando conexão com o banco de dados...${colors.reset}`);
  
  if (!process.env.DATABASE_URL) {
    console.log(`${colors.red}Erro: A variável DATABASE_URL não está definida.${colors.reset}`);
    console.log(`Por favor, adicione a variável de ambiente DATABASE_URL nas configurações do seu Replit.`);
    return false;
  }
  
  try {
    execSync('npx drizzle-kit introspect:pg', { stdio: 'inherit' });
    console.log(`${colors.green}Conexão com o banco de dados verificada com sucesso!${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}Erro ao se conectar com o banco de dados: ${error.message}${colors.reset}`);
    return false;
  }
}

// Configurar o banco de dados utilizando o arquivo de backup
function setupDatabase() {
  console.log(`\n${colors.cyan}Configurando o banco de dados...${colors.reset}`);
  
  try {
    // Primeiro, tenta usar drizzle-kit para fazer push do schema para o banco de dados
    console.log(`${colors.yellow}Aplicando schema com drizzle-kit...${colors.reset}`);
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log(`${colors.green}Schema aplicado com sucesso!${colors.reset}`);
    
    // Se for necessário, podemos executar o script SQL diretamente usando um client
    // console.log(`${colors.yellow}Aplicando dados iniciais...${colors.reset}`);
    // const dbBackupPath = path.join(rootDir, 'scripts', 'db-backup.sql');
    // execSync(`...comando para executar o SQL...`, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.log(`${colors.red}Erro ao configurar o banco de dados: ${error.message}${colors.reset}`);
    return false;
  }
}

// Executar as tarefas de configuração
async function runSetup() {
  // Verificar dependências
  console.log(`\n${colors.cyan}Verificando dependências...${colors.reset}`);
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log(`${colors.green}Dependências instaladas/verificadas com sucesso!${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}Erro ao instalar dependências: ${error.message}${colors.reset}`);
    return;
  }
  
  // Verificar conexão com o banco de dados
  if (!checkDbConnection()) {
    console.log(`${colors.yellow}Pulando a configuração do banco de dados devido a erros de conexão.${colors.reset}`);
  } else {
    // Configurar o banco de dados
    if (setupDatabase()) {
      console.log(`${colors.green}Banco de dados configurado com sucesso!${colors.reset}`);
    } else {
      console.log(`${colors.red}Não foi possível configurar o banco de dados completamente.${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.blue}=======================================${colors.reset}`);
  console.log(`${colors.green}Configuração concluída!${colors.reset}`);
  console.log(`${colors.yellow}Você pode iniciar o projeto com:${colors.reset} npm run dev`);
  console.log(`${colors.blue}=======================================${colors.reset}`);
}

// Iniciar o processo de configuração
runSetup().catch(error => {
  console.error(`${colors.red}Erro durante a configuração: ${error.message}${colors.reset}`);
  process.exit(1);
});
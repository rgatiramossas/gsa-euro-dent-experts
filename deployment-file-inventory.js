/**
 * Script para gerar um inventário dos arquivos essenciais para deploy
 * Usado para identificar todos os componentes necessários para construir o pacote de produção
 */

import fs from 'fs';
import path from 'path';

// Função para verificar e criar pasta de saída
const outputFolder = './deployment-info';
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

// Função para verificar se um caminho deve ser ignorado
function shouldIgnore(filePath) {
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    '.DS_Store',
    '.replit',
    '.upm',
    '.cache',
    '.config',
    'Backup_de_Seguranca',
    'attached_assets'
  ];
  
  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

// Função para mapear arquivos em um diretório (recursivamente)
function mapDirectory(directory, outputFile, depth = 0) {
  try {
    if (shouldIgnore(directory)) return;
    
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      if (shouldIgnore(filePath)) continue;
      
      const stat = fs.statSync(filePath);
      const indent = '  '.repeat(depth);
      
      if (stat.isDirectory()) {
        outputFile.write(`${indent}- ${file}/\n`);
        mapDirectory(filePath, outputFile, depth + 1);
      } else {
        outputFile.write(`${indent}- ${file}\n`);
      }
    }
  } catch (error) {
    console.error(`Erro ao mapear diretório ${directory}:`, error);
  }
}

// Função para listar arquivos críticos para PWA
function listPwaFiles() {
  const pwaFiles = [
    'public/sw.js',
    'public/manifest.json',
    'public/app-icon.png'
  ];
  
  const outputFile = fs.createWriteStream(path.join(outputFolder, 'pwa-files.md'));
  outputFile.write('# Arquivos Críticos para PWA\n\n');
  
  for (const file of pwaFiles) {
    try {
      if (fs.existsSync(file)) {
        outputFile.write(`- ✅ ${file} (Presente)\n`);
      } else {
        outputFile.write(`- ❌ ${file} (Ausente)\n`);
      }
    } catch (error) {
      outputFile.write(`- ❓ ${file} (Erro ao verificar)\n`);
    }
  }
  
  outputFile.close();
  console.log('Lista de arquivos PWA criada em:', path.join(outputFolder, 'pwa-files.md'));
}

// Função para listar scripts necessários para operação
function listOperationalScripts() {
  const scripts = [
    'server/index.ts',
    'server/routes.ts',
    'server/storage.ts',
    'server/vite.ts',
    'client/src/App.tsx',
    'client/src/main.tsx',
    'client/src/index.css',
    'client/src/lib/pwaManager.ts',
    'client/src/lib/apiWrapper.ts',
    'client/src/lib/queryClient.ts',
    'client/src/contexts/AuthContext.tsx',
    'vite.config.ts',
    'package.json',
    '.env.production'
  ];
  
  const outputFile = fs.createWriteStream(path.join(outputFolder, 'operational-scripts.md'));
  outputFile.write('# Scripts Essenciais para Operação\n\n');
  
  for (const script of scripts) {
    try {
      if (fs.existsSync(script)) {
        outputFile.write(`- ✅ ${script} (Presente)\n`);
      } else {
        outputFile.write(`- ❌ ${script} (Ausente)\n`);
      }
    } catch (error) {
      outputFile.write(`- ❓ ${script} (Erro ao verificar)\n`);
    }
  }
  
  outputFile.close();
  console.log('Lista de scripts operacionais criada em:', path.join(outputFolder, 'operational-scripts.md'));
}

// Função para verificar diretórios de uploads
function checkUploadDirectories() {
  const uploadDirs = [
    'uploads',
    'uploads/client',
    'uploads/vehicle',
    'uploads/service',
    'uploads/before',
    'uploads/after'
  ];
  
  const outputFile = fs.createWriteStream(path.join(outputFolder, 'upload-directories.md'));
  outputFile.write('# Diretórios de Upload\n\n');
  
  for (const dir of uploadDirs) {
    try {
      if (fs.existsSync(dir)) {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
          // Contar arquivos no diretório
          const fileCount = fs.readdirSync(dir).length;
          outputFile.write(`- ✅ ${dir} (Presente, ${fileCount} arquivos)\n`);
        } else {
          outputFile.write(`- ❌ ${dir} (Existe mas não é um diretório)\n`);
        }
      } else {
        outputFile.write(`- ❌ ${dir} (Ausente)\n`);
      }
    } catch (error) {
      outputFile.write(`- ❓ ${dir} (Erro ao verificar)\n`);
    }
  }
  
  outputFile.close();
  console.log('Verificação de diretórios de upload criada em:', path.join(outputFolder, 'upload-directories.md'));
}

// Função para criar mapa completo do projeto
function createProjectMap() {
  const outputFile = fs.createWriteStream(path.join(outputFolder, 'project-map.md'));
  outputFile.write('# Mapa do Projeto Euro Dent Experts\n\n');
  outputFile.write('Este arquivo contém a estrutura completa do projeto para referência durante o deploy.\n\n');
  
  mapDirectory('.', outputFile);
  
  outputFile.close();
  console.log('Mapa do projeto criado em:', path.join(outputFolder, 'project-map.md'));
}

// Função para verificar e listar dependências críticas
function listCriticalDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const outputFile = fs.createWriteStream(path.join(outputFolder, 'critical-dependencies.md'));
    outputFile.write('# Dependências Críticas\n\n');
    
    // Categorias de dependências
    const categories = {
      'Backend': ['express', 'express-session', 'mysql2', 'drizzle-orm', 'multer', 'passport', 'bcrypt'],
      'Frontend': ['react', 'react-dom', 'tailwindcss', 'recharts', 'wouter', '@tanstack/react-query'],
      'PWA': ['workbox-core', 'workbox-precaching', 'workbox-routing', 'vite-plugin-pwa'],
      'Ferramentas': ['vite', 'esbuild', 'typescript', 'dotenv']
    };
    
    // Dependências principais
    const deps = { ...packageJson.dependencies };
    
    for (const [category, list] of Object.entries(categories)) {
      outputFile.write(`## ${category}\n\n`);
      
      for (const dep of list) {
        const version = deps[dep] || 'não encontrado';
        outputFile.write(`- ${dep}: ${version}\n`);
      }
      
      outputFile.write('\n');
    }
    
    outputFile.close();
    console.log('Lista de dependências críticas criada em:', path.join(outputFolder, 'critical-dependencies.md'));
  } catch (error) {
    console.error('Erro ao listar dependências críticas:', error);
  }
}

// Executar todas as funções de inventário
console.log('Iniciando inventário de arquivos para deploy...');

listPwaFiles();
listOperationalScripts();
checkUploadDirectories();
createProjectMap();
listCriticalDependencies();

console.log('Inventário de arquivos concluído com sucesso!');
console.log(`Todos os relatórios foram salvos no diretório: ${outputFolder}`);
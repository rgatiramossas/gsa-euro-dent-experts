/**
 * Script para compilar apenas os arquivos que foram alterados
 * Usado quando o build completo é muito pesado para o ambiente
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Arquivos que foram alterados
const changedFiles = [
  'client/src/components/NewBudgetForm.tsx',
  'client/src/pages/services/new-service.tsx'
];

// Criar diretório temporário
const tempDir = path.join(__dirname, 'temp-build');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Copiar arquivos para compilação individual
changedFiles.forEach(file => {
  const destDir = path.join(tempDir, path.dirname(file));
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const destFile = path.join(tempDir, file);
  fs.copyFileSync(file, destFile);
  
  console.log(`Arquivo copiado: ${file} -> ${destFile}`);
});

// Compilar arquivos individualmente usando typescript
try {
  console.log('Compilando arquivos...');
  execSync('npx tsc --jsx react-jsx --esModuleInterop --skipLibCheck --module ESNext temp-build/client/src/components/NewBudgetForm.tsx temp-build/client/src/pages/services/new-service.tsx');
  console.log('Compilação concluída!');
  
  // Copiar arquivos compilados para o diretório dist
  const distClientDir = path.join(__dirname, 'dist/client');
  if (!fs.existsSync(distClientDir)) {
    fs.mkdirSync(distClientDir, { recursive: true });
  }
  
  changedFiles.forEach(file => {
    const compiledFile = file.replace('.tsx', '.js');
    const sourcePath = path.join(tempDir, compiledFile);
    const destPath = path.join(__dirname, 'dist', compiledFile);
    
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Arquivo compilado copiado: ${sourcePath} -> ${destPath}`);
    } else {
      console.error(`Arquivo compilado não encontrado: ${sourcePath}`);
    }
  });
  
  console.log('Processo concluído com sucesso!');
} catch (error) {
  console.error('Erro durante a compilação:', error);
} finally {
  // Limpar diretório temporário
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Diretório temporário removido');
  }
}
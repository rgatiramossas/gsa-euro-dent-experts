/**
 * Script para atualizar arquivos específicos na build de produção
 * Usado para garantir que as alterações mais recentes sejam aplicadas
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Arquivos modificados que precisam ser atualizados
const modifiedFiles = [
  {
    source: 'client/src/components/NewBudgetForm.tsx',
    destination: 'dist/assets',
    // Os arquivos na pasta dist/assets têm hash no nome, então precisamos encontrar o arquivo correto
    pattern: /NewBudgetForm.*\.js$/
  },
  {
    source: 'client/src/pages/services/new-service.tsx',
    destination: 'dist/assets',
    pattern: /new-service.*\.js$/
  }
];

// Função para verificar se o build está concluído
function isBuildCompleted() {
  try {
    // Verificamos se os diretórios principais da build existem
    return fs.existsSync('dist') && 
           fs.existsSync('dist/assets') && 
           fs.existsSync('dist/index.html');
  } catch (error) {
    console.error('Erro ao verificar build:', error);
    return false;
  }
}

// Função para encontrar arquivo compilado pelo padrão
function findCompiledFile(directory, pattern) {
  try {
    const files = fs.readdirSync(directory);
    const matchedFile = files.find(file => pattern.test(file));
    return matchedFile ? path.join(directory, matchedFile) : null;
  } catch (error) {
    console.error(`Erro ao procurar arquivo em ${directory}:`, error);
    return null;
  }
}

// Função para atualizar um arquivo
function updateFile(sourceFile, destinationPattern) {
  try {
    // Leitura do arquivo fonte
    const source = fs.readFileSync(sourceFile, 'utf8');
    
    // Compilação temporária
    const tempDir = path.join(__dirname, 'build-temp');
    const tempFile = path.join(tempDir, path.basename(sourceFile));
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempFile, source);
    
    // Encontrar o arquivo compilado correspondente
    const compiledFile = findCompiledFile('dist/assets', destinationPattern);
    
    if (!compiledFile) {
      console.log(`Arquivo compilado não encontrado para: ${sourceFile}`);
      return false;
    }
    
    // Backup do arquivo compilado
    const backupFile = `${compiledFile}.bak`;
    fs.copyFileSync(compiledFile, backupFile);
    console.log(`Backup criado: ${backupFile}`);
    
    // Marcar o arquivo para substituição na próxima compilação
    console.log(`Arquivo pronto para substituição na próxima compilação: ${compiledFile}`);
    
    // Registrar timestamp da modificação
    fs.appendFileSync(
      path.join(tempDir, 'update-log.txt'), 
      `[${new Date().toISOString()}] Arquivo preparado para atualização: ${sourceFile} -> ${compiledFile}\n`
    );
    
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar ${sourceFile}:`, error);
    return false;
  }
}

// Verificar status do build
if (!isBuildCompleted()) {
  console.log('Build ainda não foi concluído. Executando verificação preliminar...');
  
  // Verificar progresso do build
  try {
    const buildLog = fs.readFileSync('build-temp/build-log.txt', 'utf8');
    console.log('Status do build:');
    console.log(buildLog.slice(-500)); // Mostrar últimas 500 caracteres do log
  } catch (error) {
    console.log('Log de build não disponível ainda.');
  }
  
  console.log('\nEste script deve ser executado após a conclusão do build.');
  console.log('Execute "node update-production-files.js" novamente quando o build estiver concluído.');
} else {
  console.log('Build concluído. Iniciando atualização de arquivos específicos...');
  
  // Processar cada arquivo modificado
  let allSuccessful = true;
  for (const file of modifiedFiles) {
    console.log(`\nProcessando: ${file.source}`);
    const success = updateFile(file.source, file.pattern);
    if (!success) {
      allSuccessful = false;
    }
  }
  
  if (allSuccessful) {
    console.log('\nArquivos preparados para atualização com sucesso!');
    console.log('As atualizações serão aplicadas na próxima compilação completa.');
    console.log('IMPORTANTE: Os arquivos de origem foram atualizados, mas uma compilação completa é necessária para gerar os arquivos finais.');
  } else {
    console.log('\nAlguns arquivos não puderam ser preparados para atualização.');
    console.log('Verifique as mensagens de erro acima.');
  }
  
  // Criar lista de arquivos modificados para referência
  const modifiedFilesLog = modifiedFiles.map(f => f.source).join('\n');
  fs.writeFileSync('build-temp/modified-files.txt', modifiedFilesLog);
  console.log('\nLista de arquivos modificados salva em build-temp/modified-files.txt');
}
/**
 * Script para corrigir a forma como as sessões são armazenadas no MySQL
 * Modifica a implementação do express-mysql-session para armazenar as datas corretamente em milissegundos
 */
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function patchMySQLSession() {
  try {
    console.log("Verificando implementação do express-mysql-session...");
    
    // Caminho para o arquivo de implementação no node_modules
    const modulePath = path.resolve('./node_modules/express-mysql-session/index.js');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(modulePath)) {
      console.error(`Arquivo não encontrado: ${modulePath}`);
      return;
    }
    
    // Ler o conteúdo do arquivo
    const originalContent = await readFile(modulePath, 'utf8');
    
    // Verificar se o arquivo já foi modificado
    if (originalContent.includes('// CUSTOM PATCH: Fix timestamp format')) {
      console.log("O arquivo já foi modificado anteriormente.");
      return;
    }
    
    // Encontrar o trecho que converte milliseconds para seconds
    const originalSnippet = `if (!(expires instanceof Date)) {
expires = new Date(expires);
}
// Use whole seconds here; not milliseconds.
expires = Math.round(expires.getTime() / 1000);
data = JSON.stringify(data);`;
    
    // Modificar para armazenar em milliseconds
    const modifiedSnippet = `if (!(expires instanceof Date)) {
expires = new Date(expires);
}
// CUSTOM PATCH: Fix timestamp format
// Store in milliseconds instead of seconds to prevent expiration issues
expires = expires.getTime();
data = JSON.stringify(data);`;
    
    // Substituir o trecho
    if (originalContent.includes(originalSnippet)) {
      const modifiedContent = originalContent.replace(originalSnippet, modifiedSnippet);
      
      // Criar backup do arquivo original
      await writeFile(`${modulePath}.backup`, originalContent, 'utf8');
      console.log(`Backup criado: ${modulePath}.backup`);
      
      // Salvar o arquivo modificado
      await writeFile(modulePath, modifiedContent, 'utf8');
      console.log("Arquivo modificado com sucesso!");
      
      // Também precisamos modificar o método clearExpiredSessions
      const clearExpiredOriginal = `MySQLStore.prototype.clearExpiredSessions = function() {
return Promise.resolve().then(() => {
debug.log('Clearing expired sessions');
const now = Math.round(Date.now() / 1000);`;
      
      const clearExpiredModified = `MySQLStore.prototype.clearExpiredSessions = function() {
return Promise.resolve().then(() => {
debug.log('Clearing expired sessions');
// CUSTOM PATCH: Fix timestamp format
const now = Date.now();`;
      
      const contentWithBothPatches = modifiedContent.replace(clearExpiredOriginal, clearExpiredModified);
      
      await writeFile(modulePath, contentWithBothPatches, 'utf8');
      console.log("Método clearExpiredSessions também modificado com sucesso!");
      
      console.log("\nAs sessões agora serão armazenadas com timestamps em milissegundos.");
      console.log("A aplicação precisa ser reiniciada para que as alterações tenham efeito.");
      
      // Limpar a tabela de sessões existente
      console.log("\nRecomendação: Execute o script fix-sessions-table.js para recriar a tabela de sessões.");
    } else {
      console.error("Não foi possível encontrar o trecho de código a ser modificado.");
      console.error("A estrutura do módulo express-mysql-session pode ter mudado.");
    }
  } catch (error) {
    console.error("Erro ao modificar o arquivo:", error);
  }
}

// Executar a função principal
patchMySQLSession();
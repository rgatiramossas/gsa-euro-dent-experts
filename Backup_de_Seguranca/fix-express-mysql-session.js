/**
 * Script para corrigir a persistência de sessão no MySQL
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo do módulo express-mysql-session
const modulePath = './node_modules/express-mysql-session/index.js';

async function fixModuleCode() {
  console.log(`Modificando o módulo express-mysql-session para usar milissegundos em vez de segundos`);
  
  try {
    // Ler o arquivo
    let content = fs.readFileSync(modulePath, 'utf8');
    
    // Backup do arquivo original
    fs.writeFileSync(`${modulePath}.backup`, content, 'utf8');
    console.log(`Backup criado em ${modulePath}.backup`);
    
    // Substituir todas as ocorrências de divisão por 1000 no cálculo de expiração
    content = content.replace(/expires = Math\.round\(expires\.getTime\(\) \/ 1000\);/g, 
                             'expires = expires.getTime(); // FIXED: Store in milliseconds instead of seconds');
    
    // Também corrigir o método clearExpiredSessions
    content = content.replace(/const now = Math\.round\(Date\.now\(\) \/ 1000\);/g,
                             'const now = Date.now(); // FIXED: Check expiration in milliseconds');
    
    // Salvar as mudanças
    fs.writeFileSync(modulePath, content, 'utf8');
    console.log(`O módulo express-mysql-session foi modificado com sucesso.`);
    console.log(`Agora as sessões serão armazenadas com timestamps em milissegundos.`);
    
    // Limpar tabela de sessões
    console.log(`\nExecute o comando 'node fix-sessions-table.js' para recriar a tabela de sessões.`);
    console.log(`Em seguida, reinicie a aplicação para que as alterações tenham efeito.`);
    
    return true;
  } catch (error) {
    console.error(`Erro ao modificar o módulo express-mysql-session:`, error);
    return false;
  }
}

// Executar a função
fixModuleCode();
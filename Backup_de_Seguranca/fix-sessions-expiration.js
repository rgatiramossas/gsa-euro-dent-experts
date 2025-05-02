/**
 * Script para corrigir a forma como as sessões são armazenadas no MySQL
 * Modifica a implementação do express-mysql-session para armazenar as datas corretamente
 */
import { resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { promisify } from 'util';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function fixSessionImplementation() {
  try {
    console.log("Verificando implementação do express-mysql-session...");
    
    // Caminho para o arquivo de implementação no node_modules
    const modulePath = resolve('./node_modules/express-mysql-session/lib/express-mysql-session.js');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(modulePath)) {
      console.error(`Arquivo não encontrado: ${modulePath}`);
      return;
    }
    
    // Ler o conteúdo do arquivo
    const originalContent = await readFile(modulePath, 'utf8');
    
    // Verificar se o arquivo já foi modificado
    if (originalContent.includes('// CUSTOM PATCH: Fixed timestamp handling')) {
      console.log("O arquivo já foi modificado anteriormente.");
      return;
    }
    
    // Função que manipula a expiração do cookie no arquivo original
    const originalSnippet = `
	MySQLStore.prototype.set = function(sid, session, callback) {
		const expires = session.cookie.expires instanceof Date
			? session.cookie.expires.getTime() / 1000
			: session.cookie.expires;
		const data = JSON.stringify(session);`;
    
    // Função corrigida que irá substituir a original
    const modifiedSnippet = `
	// CUSTOM PATCH: Fixed timestamp handling
	// Modificado para armazenar timestamp em milissegundos em vez de segundos
	MySQLStore.prototype.set = function(sid, session, callback) {
		const expires = session.cookie.expires instanceof Date
			? session.cookie.expires.getTime()
			: session.cookie.expires;
		const data = JSON.stringify(session);`;
    
    // Fazer a substituição
    if (originalContent.includes(originalSnippet)) {
      const modifiedContent = originalContent.replace(originalSnippet, modifiedSnippet);
      
      // Criar backup do arquivo original
      await writeFile(`${modulePath}.backup`, originalContent, 'utf8');
      console.log(`Backup criado: ${modulePath}.backup`);
      
      // Salvar o arquivo modificado
      await writeFile(modulePath, modifiedContent, 'utf8');
      console.log("Arquivo de implementação do express-mysql-session modificado com sucesso!");
      console.log("As sessões agora serão armazenadas com timestamps corretos.");
      console.log("\nA aplicação precisa ser reiniciada para que as alterações tenham efeito.");
    } else {
      console.error("Não foi possível encontrar o trecho de código a ser modificado.");
      console.error("A estrutura do módulo express-mysql-session pode ter mudado.");
    }
  } catch (error) {
    console.error("Erro ao modificar a implementação do express-mysql-session:", error);
  }
}

// Executar a função principal
fixSessionImplementation();
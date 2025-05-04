/**
 * Script para limpar o banco de dados IndexedDB e forçar sua reconstrução
 * Use quando houver alterações estruturais, como adição de novas tabelas
 */

const readline = require('readline');

async function cleanIndexedDB() {
  console.log("=============================================");
  console.log("FERRAMENTA DE MANUTENÇÃO DO INDEXEDDB");
  console.log("=============================================");
  console.log("");
  console.log("Este script vai ajudar a limpar o IndexedDB quando houver");
  console.log("problemas de versão ou estrutura. Execute este script no");
  console.log("navegador com o aplicativo aberto.");
  console.log("");
  console.log("INSTRUÇÕES PARA USO:");
  console.log("1. Abra o console do navegador (F12 ou Ctrl+Shift+J)");
  console.log("2. Cole o seguinte código:");
  console.log("");
  console.log("---------------------------------------------");
  
  const cleanupCode = `
// Função para limpar o IndexedDB
(async function cleanupIndexedDB() {
  try {
    // Listagem de bancos de dados
    const databases = await window.indexedDB.databases();
    console.log('Bancos de dados IndexedDB encontrados:', databases);
    
    // Procurar pelo banco de dados da aplicação
    const appDb = databases.find(db => db.name === 'EuroDentOfflineDB');
    
    if (appDb) {
      console.log(\`Encontrado banco de dados: \${appDb.name}, versão: \${appDb.version}\`);
      
      // Confirmação
      if (!confirm('Isso excluirá o banco de dados local e todos os dados offline não sincronizados. Continuar?')) {
        console.log('Operação cancelada pelo usuário.');
        return;
      }
      
      // Deletar o banco de dados
      const deleteRequest = window.indexedDB.deleteDatabase('EuroDentOfflineDB');
      
      deleteRequest.onsuccess = function() {
        console.log('Banco de dados IndexedDB excluído com sucesso!');
        alert('Banco de dados limpo com sucesso! A página será recarregada.');
        
        // Recarregar a página para reconstruir o banco
        setTimeout(() => {
          location.reload();
        }, 1000);
      };
      
      deleteRequest.onerror = function(event) {
        console.error('Erro ao excluir o banco de dados:', event.target.error);
        alert('Erro ao limpar o banco de dados: ' + event.target.error.message);
      };
      
      deleteRequest.onblocked = function() {
        console.warn('Exclusão do banco de dados bloqueada. Tente fechar outras abas e recarregar.');
        alert('A limpeza do banco de dados está bloqueada. Feche todas as outras abas e tente novamente.');
      };
    } else {
      console.log('Banco de dados da aplicação não encontrado. Nada a limpar.');
      alert('Banco de dados não encontrado.');
    }
  } catch (error) {
    console.error('Erro ao limpar IndexedDB:', error);
    alert('Erro: ' + error.message);
  }
})();`;
  
  console.log(cleanupCode);
  console.log("---------------------------------------------");
  console.log("");
  console.log("3. Pressione Enter para executar");
  console.log("4. Confirme quando o diálogo aparecer");
  console.log("5. A página será recarregada automaticamente");
  console.log("");
  console.log("=============================================");
  console.log("");

  // Aguarda confirmação do usuário
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Pressione Enter para salvar este script como arquivo HTML...', () => {
    console.log("\nCriando arquivo HTML com instruções e script...");
    
    // Código para gerar um arquivo HTML que o usuário pode abrir
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Limpeza do IndexedDB - EuroDent</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2 {
      color: #005b96;
    }
    .code-block {
      background-color: #f4f4f4;
      border-left: 4px solid #005b96;
      padding: 15px;
      margin: 20px 0;
      overflow-x: auto;
      font-family: monospace;
      white-space: pre;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      background-color: #005b96;
      color: white;
      border: none;
      padding: 10px 15px;
      cursor: pointer;
      font-size: 16px;
      border-radius: 4px;
    }
    .button:hover {
      background-color: #003d66;
    }
  </style>
</head>
<body>
  <h1>Ferramenta de Manutenção do IndexedDB</h1>
  
  <p>Esta ferramenta ajuda a limpar o banco de dados IndexedDB quando houver problemas de versão ou estrutura.</p>
  
  <div class="warning">
    <strong>Atenção:</strong> Este processo limpará todos os dados offline ainda não sincronizados. Certifique-se de estar online e sincronizar todos os dados antes de continuar.
  </div>
  
  <h2>Opção 1: Executar no Console</h2>
  <p>Siga estas instruções para limpar o banco de dados usando o console do navegador:</p>
  <ol>
    <li>Abra o aplicativo EuroDent no navegador</li>
    <li>Abra o console do navegador (F12 ou Ctrl+Shift+J)</li>
    <li>Cole o seguinte código no console:</li>
  </ol>
  
  <div class="code-block">${cleanupCode}</div>
  
  <p>Pressione Enter para executar o código e siga as instruções na tela.</p>
  
  <h2>Opção 2: Executar com Um Clique</h2>
  <p>Você também pode executar o script diretamente clicando no botão abaixo:</p>
  
  <button class="button" onclick="cleanupIndexedDB()">Limpar IndexedDB</button>
  
  <script>
    // Função para limpar o IndexedDB
    async function cleanupIndexedDB() {
      try {
        // Listagem de bancos de dados
        const databases = await window.indexedDB.databases();
        console.log('Bancos de dados IndexedDB encontrados:', databases);
        
        // Procurar pelo banco de dados da aplicação
        const appDb = databases.find(db => db.name === 'EuroDentOfflineDB');
        
        if (appDb) {
          console.log(\`Encontrado banco de dados: \${appDb.name}, versão: \${appDb.version}\`);
          
          // Confirmação
          if (!confirm('Isso excluirá o banco de dados local e todos os dados offline não sincronizados. Continuar?')) {
            console.log('Operação cancelada pelo usuário.');
            return;
          }
          
          // Deletar o banco de dados
          const deleteRequest = window.indexedDB.deleteDatabase('EuroDentOfflineDB');
          
          deleteRequest.onsuccess = function() {
            console.log('Banco de dados IndexedDB excluído com sucesso!');
            alert('Banco de dados limpo com sucesso! A página será recarregada.');
            
            // Recarregar a página para reconstruir o banco
            setTimeout(() => {
              if (confirm('Banco de dados limpo. Deseja voltar ao aplicativo?')) {
                window.location.href = '/';
              }
            }, 1000);
          };
          
          deleteRequest.onerror = function(event) {
            console.error('Erro ao excluir o banco de dados:', event.target.error);
            alert('Erro ao limpar o banco de dados: ' + event.target.error.message);
          };
          
          deleteRequest.onblocked = function() {
            console.warn('Exclusão do banco de dados bloqueada. Tente fechar outras abas e recarregar.');
            alert('A limpeza do banco de dados está bloqueada. Feche todas as outras abas e tente novamente.');
          };
        } else {
          console.log('Banco de dados da aplicação não encontrado. Nada a limpar.');
          alert('Banco de dados não encontrado.');
        }
      } catch (error) {
        console.error('Erro ao limpar IndexedDB:', error);
        alert('Erro: ' + error.message);
      }
    }
  </script>
</body>
</html>`;
    
    const fs = require('fs');
    fs.writeFileSync('clean-indexeddb.html', html);
    
    console.log("\nArquivo 'clean-indexeddb.html' criado com sucesso!");
    console.log("Você pode distribuir este arquivo para usuários que precisam limpar o IndexedDB.");
    
    rl.close();
  });
}

// Executar o script
cleanIndexedDB();
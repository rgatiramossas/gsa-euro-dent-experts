/**
 * Script para limpar o banco de dados IndexedDB e forçar sua reconstrução
 * Use quando houver alterações estruturais, como adição de novas tabelas
 */

const { indexedDB } = window;

async function cleanIndexedDB() {
  try {
    console.log('Iniciando limpeza do IndexedDB...');

    // Obter todos os bancos de dados
    const databases = await indexedDB.databases();
    console.log('Bancos de dados indexedDB encontrados:', databases);

    // Procurar pelo banco de dados da aplicação
    const appDb = databases.find(db => db.name === 'EuroDentOfflineDB');
    
    if (appDb) {
      console.log(`Encontrado banco de dados: ${appDb.name}, versão: ${appDb.version}`);
      
      // Deletar o banco de dados
      const deleteRequest = indexedDB.deleteDatabase('EuroDentOfflineDB');
      
      deleteRequest.onsuccess = function() {
        console.log('Banco de dados IndexedDB excluído com sucesso!');
        console.log('Recarregando a página para reconstruir o banco de dados...');
        
        // Esperar um momento e recarregar a página para reconstruir o banco
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };
      
      deleteRequest.onerror = function(event) {
        console.error('Erro ao excluir o banco de dados:', event.target.error);
      };
      
      deleteRequest.onblocked = function() {
        console.warn('Exclusão do banco de dados bloqueada. Fechando todas as conexões...');
        alert('Feche todas as outras guias com este aplicativo e tente novamente.');
      };
    } else {
      console.log('Banco de dados da aplicação não encontrado. Nada a limpar.');
    }
  } catch (error) {
    console.error('Erro ao limpar IndexedDB:', error);
  }
}

// Exportar a função para uso externo
module.exports = cleanIndexedDB;

// Se executado diretamente (não importado)
if (typeof require !== 'undefined' && require.main === module) {
  cleanIndexedDB().catch(console.error);
}
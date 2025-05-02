/**
 * Script para limpar o banco de dados IndexedDB do navegador
 * Use esta função para limpar todos os dados offline
 */
import offlineDb from './offlineDb';

export async function clearOfflineDatabase(): Promise<{success: boolean, message: string}> {
  try {
    console.log("Iniciando limpeza do banco de dados offline...");
    
    // Limpar todas as tabelas
    console.log("Limpando tabela clients...");
    await offlineDb.clients.clear();
    
    console.log("Limpando tabela services...");
    await offlineDb.services.clear();
    
    console.log("Limpando tabela budgets...");
    await offlineDb.budgets.clear();
    
    console.log("Limpando tabela technicians...");
    await offlineDb.technicians.clear();
    
    console.log("Limpando tabela service_types...");
    await offlineDb.service_types.clear();
    
    console.log("Limpando requisições pendentes...");
    await offlineDb.pendingRequests.clear();
    
    console.log("Limpeza do banco de dados offline concluída com sucesso!");
    return {
      success: true,
      message: "Banco de dados offline limpo com sucesso!"
    };
  } catch (error) {
    console.error("Erro ao limpar banco de dados offline:", error);
    return {
      success: false,
      message: `Erro ao limpar banco de dados offline: ${error}`
    };
  }
}

export default clearOfflineDatabase;
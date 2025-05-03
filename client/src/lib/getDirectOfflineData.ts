// Utilitário para buscar dados diretamente do banco de dados IndexedDB
// Complementa o sistema de events e evita dependência de requisições pendentes

import Dexie from 'dexie';
import offlineDb from './offlineDb';

/**
 * Busca todos os registros de uma tabela específica no IndexedDB
 * Retorna tanto registros offline (ID negativo) quanto registros sincronizados (ID positivo)
 * 
 * @param tableName Nome da tabela no IndexedDB
 * @returns Promise com array de objetos
 */
export async function getDirectOfflineData<T>(tableName: string): Promise<T[]> {
  try {
    // Obter referência à tabela
    const table = offlineDb[tableName];
    
    if (!table) {
      console.warn(`Tabela '${tableName}' não encontrada no IndexedDB`);
      return [];
    }
    
    // Buscar todos os registros da tabela
    const records = await table.toArray();
    console.log(`[getDirectOfflineData] Recuperados ${records.length} registros da tabela '${tableName}'`, records);
    
    return records as T[];
  } catch (error) {
    console.error(`[getDirectOfflineData] Erro ao buscar dados offline da tabela '${tableName}':`, error);
    return [];
  }
}

/**
 * Busca todos os registros de uma tabela específica do armazenamento de requisições pendentes
 * Útil para encontrar dados criados em offline que ainda não foram sincronizados
 * 
 * @param tableName Nome da tabela relacionada às requisições pendentes
 * @param operationType Tipo de operação (create, update, delete)
 * @returns Promise com array de objetos pendentes
 */
export async function getPendingRequestsData(
  tableName: string, 
  operationType: 'create' | 'update' | 'delete' = 'create'
): Promise<any[]> {
  try {
    // Buscar requisições pendentes para a tabela específica
    const pendingRequests = await offlineDb.pendingRequests
      .where({ tableName, operationType })
      .toArray();
    
    console.log(
      `[getPendingRequestsData] Encontradas ${pendingRequests.length} requisições pendentes para ${tableName} (${operationType})`,
      pendingRequests
    );
    
    // Extrair dados do corpo das requisições
    return pendingRequests.map(request => {
      // Se for criação, adicionar ID temporário
      if (operationType === 'create' && request.resourceId) {
        return {
          ...request.body,
          id: request.resourceId,
          _isOffline: true,
          _pendingRequestId: request.id
        };
      }
      
      // Para outras operações, retornar apenas o corpo
      return request.body;
    });
  } catch (error) {
    console.error(`[getPendingRequestsData] Erro ao buscar requisições pendentes para '${tableName}':`, error);
    return [];
  }
}

/**
 * Combina dados do IndexedDB com requisições pendentes para obter a visão completa
 * dos dados, incluindo alterações ainda não sincronizadas.
 * 
 * @param tableName Nome da tabela no IndexedDB
 * @returns Promise com array de objetos combinados
 */
export async function getCompleteOfflineData<T>(tableName: string): Promise<T[]> {
  try {
    // Buscar dados diretamente da tabela e pendingRequests
    const [tableData, pendingData] = await Promise.all([
      getDirectOfflineData<T>(tableName),
      getPendingRequestsData(tableName, 'create')
    ]);
    
    // Combinação: inclui registros da tabela + pendingRequests não duplicados
    const combinedData: T[] = [...tableData];
    
    // Adicionar pendingData se não existir na tableData
    pendingData.forEach(pending => {
      const exists = combinedData.some(item => (item as any).id === pending.id);
      if (!exists) {
        combinedData.push(pending as T);
      }
    });
    
    console.log(`[getCompleteOfflineData] Total combinado para '${tableName}': ${combinedData.length} registros`);
    return combinedData;
  } catch (error) {
    console.error(`[getCompleteOfflineData] Erro ao combinar dados offline para '${tableName}':`, error);
    return [];
  }
}
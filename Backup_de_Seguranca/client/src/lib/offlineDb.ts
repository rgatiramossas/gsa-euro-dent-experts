import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { checkNetworkStatus, triggerSyncIfNeeded } from './pwaManager';
import { queryClient } from "./queryClient";

// Definir interface para pedidos pendentes
interface PendingRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  tableName: string;
  resourceId?: number | string;
  operationType: 'create' | 'update' | 'delete';
  // Campos para controle de tentativas de sincronização
  retryCount?: number;
  lastAttempt?: number;
  lastErrorMessage?: string;
}

// Definir interface para status de sincronização de tabelas
interface TableSyncStatus {
  tableName: string;
  lastSync: number; // timestamp
}

// Classe para o banco de dados offline
class OfflineDatabase extends Dexie {
  // Tabelas para os dados principais
  clients: Dexie.Table<any, number>;
  services: Dexie.Table<any, number>;
  budgets: Dexie.Table<any, number>;
  technicians: Dexie.Table<any, number>;
  service_types: Dexie.Table<any, number>;
  
  // Tabelas para sistema de sincronização
  pendingRequests: Dexie.Table<PendingRequest, string>;
  syncStatus: Dexie.Table<TableSyncStatus, string>;
  
  constructor() {
    super('EuroDentOfflineDB');
    
    // Definir esquema com versão
    this.version(1).stores({
      // Tabelas principais
      clients: '++id, name, email, phone, document, created_at, modified_at',
      services: '++id, client_id, vehicle_id, description, status, created_at, modified_at',
      budgets: '++id, client_id, vehicle_id, technician_id, status, created_at, modified_at',
      technicians: '++id, name, email, username, active, role, created_at, modified_at',
      service_types: '++id, name, description',
      
      // Tabelas de sincronização
      pendingRequests: 'id, timestamp, url, method, tableName, resourceId, operationType',
      syncStatus: 'tableName, lastSync'
    });
    
    // Inicializar referências das tabelas
    this.clients = this.table('clients');
    this.services = this.table('services');
    this.budgets = this.table('budgets');
    this.technicians = this.table('technicians');
    this.service_types = this.table('service_types');
    this.pendingRequests = this.table('pendingRequests');
    this.syncStatus = this.table('syncStatus');
  }
  
  // Inicializar status de sincronização para todas as tabelas se necessário
  async initSyncStatus() {
    const tables = ['clients', 'services', 'budgets', 'technicians', 'service_types'];
    
    for (const tableName of tables) {
      const existingStatus = await this.syncStatus.get(tableName);
      
      if (!existingStatus) {
        await this.syncStatus.put({
          tableName,
          lastSync: 0 // Nunca sincronizado
        });
      }
    }
  }
  
  // Obter tabela com base no nome
  getTableByName(tableName: string): Dexie.Table<any, any> {
    const tables: Record<string, Dexie.Table<any, any>> = {
      'clients': this.clients,
      'services': this.services,
      'budgets': this.budgets,
      'technicians': this.technicians,
      'service_types': this.service_types
    };
    
    return tables[tableName];
  }
  
  // Registrar uma requisição pendente para sincronização futura
  async addPendingRequest(
    url: string, 
    method: string, 
    body: any, 
    headers: Record<string, string>,
    tableName: string,
    resourceId?: number | string,
    operationType: 'create' | 'update' | 'delete' = 'create'
  ): Promise<string> {
    const requestId = uuidv4();
    
    await this.pendingRequests.add({
      id: requestId,
      timestamp: Date.now(),
      url,
      method,
      headers,
      body,
      tableName,
      resourceId,
      operationType
    });
    
    return requestId;
  }
  
  // Obter requisições pendentes com filtros opcionais
  async getPendingRequests({
    tableName,
    operationType
  }: {
    tableName?: string,
    operationType?: 'create' | 'update' | 'delete'
  } = {}): Promise<PendingRequest[]> {
    try {
      console.log(`[offlineDb] Buscando requisições pendentes. Filtros: tableName=${tableName || 'todos'}, operationType=${operationType || 'todos'}`);
      
      // Primeiro, vamos verificar quantas requisições existem no total
      const totalRequests = await this.pendingRequests.count();
      console.log(`[offlineDb] Total de requisições pendentes no banco: ${totalRequests}`);
      
      let collection = this.pendingRequests.toCollection();
      
      // Aplicar filtros se fornecidos
      if (tableName) {
        collection = collection.filter(req => req.tableName === tableName);
      }
      
      if (operationType) {
        collection = collection.filter(req => req.operationType === operationType);
      }
      
      // Obter resultados
      const requests = await collection.toArray();
      
      console.log(`[offlineDb] ${requests.length} requisições encontradas com os filtros aplicados`);
      requests.forEach((req, index) => {
        console.log(`[offlineDb] Requisição #${index+1}:`, {
          id: req.id,
          tableName: req.tableName,
          operationType: req.operationType,
          url: req.url,
          bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 100) + '...' : 'sem body'
        });
      });
      
      return requests;
    } catch (error) {
      console.error('[offlineDb] Erro ao buscar requisições pendentes:', error);
      return [];
    }
  }
  
  // Obter todas as requisições pendentes
  async getAllPendingRequests(): Promise<PendingRequest[]> {
    try {
      return await this.pendingRequests.toArray();
    } catch (error) {
      console.error('Erro ao obter todas as requisições pendentes:', error);
      return [];
    }
  }
  
  // Processar requisições pendentes e tentar sincronizar com o servidor
  async processPendingRequests(): Promise<{success: number, failed: number}> {
    if (!navigator.onLine) {
      console.log('Offline - sincronização adiada');
      return { success: 0, failed: 0 };
    }
    
    const stats = { success: 0, failed: 0 };
    
    try {
      // Obter todas as requisições pendentes
      const pendingRequests = await this.getAllPendingRequests();
      
      if (pendingRequests.length === 0) {
        return stats;
      }
      
      // Processar cada requisição
      for (const request of pendingRequests) {
        try {
          // Verificar se a requisição já falhou muitas vezes
          const retryCount = request.retryCount || 0;
          if (retryCount >= 3) {
            console.log(`Abandonando requisição após ${retryCount} tentativas: ${request.url}`);
            await this.pendingRequests.delete(request.id);
            continue;
          }
          
          // Tentar enviar a requisição
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
            credentials: 'include'
          });
          
          if (response.ok) {
            // Remover a requisição da fila
            await this.pendingRequests.delete(request.id);
            stats.success++;
          } else {
            // Incrementar contador de tentativas
            const updatedRequest = {
              ...request,
              retryCount: retryCount + 1,
              lastErrorMessage: `HTTP ${response.status}`,
              lastAttempt: Date.now()
            };
            
            await this.pendingRequests.put(updatedRequest);
            stats.failed++;
          }
        } catch (error) {
          console.error('Erro ao sincronizar requisição:', error);
          stats.failed++;
          
          // Incrementar contagem de tentativas
          const retryCount = request.retryCount || 0;
          const updatedRequest = {
            ...request,
            retryCount: retryCount + 1,
            lastErrorMessage: error instanceof Error ? error.message : String(error),
            lastAttempt: Date.now()
          };
          
          await this.pendingRequests.put(updatedRequest);
        }
      }
      
      // Invalidar caches após a sincronização
      if (stats.success > 0) {
        queryClient.invalidateQueries();
      }
      
      return stats;
    } catch (error) {
      console.error('Erro ao processar requisições pendentes:', error);
      return stats;
    }
  }
  
  // Limpar todas as requisições pendentes
  async clearPendingRequests(): Promise<void> {
    try {
      await this.pendingRequests.clear();
      console.log('Todas as requisições pendentes foram removidas');
    } catch (error) {
      console.error('Erro ao limpar requisições pendentes:', error);
      throw error;
    }
  }
  
  // Sincronizar dados com o servidor quando estiver online
  async syncWithServer() {
    if (!checkNetworkStatus()) {
      console.log('Offline - sincronização adiada');
      return false;
    }
    
    try {
      // Pegar todas as requisições pendentes ordenadas por timestamp
      const pendingRequests = await this.pendingRequests
        .orderBy('timestamp')
        .toArray();
      
      if (pendingRequests.length === 0) {
        return true; // Nada para sincronizar
      }
      
      // Processar cada requisição pendente
      for (const request of pendingRequests) {
        try {
          // Enviar a requisição para o servidor
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
              ...request.headers
            },
            body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro na sincronização: ${response.status} ${response.statusText}`);
          }
          
          // Se for uma operação de criação, precisamos atualizar o ID local
          if (request.operationType === 'create') {
            const serverData = await response.json();
            
            if (serverData.id && request.resourceId) {
              // Atualizar o ID local para o ID do servidor
              const table = this.getTableByName(request.tableName);
              
              // Buscar o objeto local pelo ID temporário
              const localItem = await table.get(request.resourceId);
              
              if (localItem) {
                // Remover o item com ID temporário
                await table.delete(request.resourceId as number);
                
                // Adicionar com o ID do servidor
                localItem.id = serverData.id;
                await table.add(localItem);
              }
            }
          }
          
          // Remover a requisição processada
          await this.pendingRequests.delete(request.id);
          
        } catch (error) {
          console.error(`Falha ao processar requisição pendente ${request.id}:`, error);
          // Manter a requisição na fila para tentar novamente mais tarde
          
          // Se a falha for devido a problema de rede, paramos a sincronização
          if (!navigator.onLine) {
            break;
          }
        }
      }
      
      // Atualizar o status de sincronização de todas as tabelas
      const tables = ['clients', 'services', 'budgets', 'technicians', 'service_types'];
      const now = Date.now();
      
      for (const tableName of tables) {
        await this.syncStatus.put({
          tableName,
          lastSync: now
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erro durante a sincronização:', error);
      return false;
    }
  }
  
  // CRUD Operations com suporte a transparência offline
  
  // CREATE - Adicionar um item à tabela
  async addItem<T>(tableName: string, item: Partial<T>, apiUrl: string): Promise<number> {
    const table = this.getTableByName(tableName);
    
    if (!table) {
      throw new Error(`Tabela ${tableName} não encontrada`);
    }
    
    try {
      // Se estiver online, tenta primeiro salvar no servidor
      if (checkNetworkStatus()) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item),
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          const serverData = await response.json();
          // Salva localmente com o ID do servidor
          return await table.add({
            ...item,
            id: serverData.id,
            last_sync: Date.now()
          });
        } catch (error) {
          console.error('Falha ao salvar no servidor, salvando offline:', error);
          // Em caso de falha, continua para modo offline
        }
      }
      
      // Modo Offline: Gera ID temporário negativo para evitar conflitos com IDs do servidor
      const tempId = -(Date.now());
      const offlineItem = {
        ...item,
        id: tempId,
        _isOffline: true
      };
      
      // Salva localmente
      await table.add(offlineItem);
      
      // Registra para sincronização futura
      await this.addPendingRequest(
        apiUrl,
        'POST',
        item,
        { 'Content-Type': 'application/json' },
        tableName,
        tempId,
        'create'
      );
      
      // Tenta sincronizar se online (background)
      triggerSyncIfNeeded();
      
      return tempId;
    } catch (error) {
      console.error(`Erro ao adicionar item à tabela ${tableName}:`, error);
      throw error;
    }
  }
  
  // READ - Buscar um item pelo ID
  async getItem<T>(tableName: string, id: number, apiUrl: string): Promise<T | null> {
    const table = this.getTableByName(tableName);
    
    if (!table) {
      throw new Error(`Tabela ${tableName} não encontrada`);
    }
    
    try {
      // Se estiver online, tenta primeiro buscar do servidor
      if (checkNetworkStatus() && id > 0) { // IDs negativos são locais
        try {
          const response = await fetch(`${apiUrl}/${id}`, {
            method: 'GET',
            credentials: 'include'
          });
          
          if (!response.ok) {
            if (response.status === 404) {
              // Item não existe no servidor, verificar localmente
              const localItem = await table.get(id);
              return localItem || null;
            }
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          const serverData = await response.json();
          
          // Atualiza o cache local
          await table.put({
            ...serverData,
            last_sync: Date.now()
          });
          
          return serverData;
        } catch (error) {
          console.error('Falha ao buscar do servidor, usando cache local:', error);
          // Em caso de falha, continua para busca local
        }
      }
      
      // Busca local
      return await table.get(id);
    } catch (error) {
      console.error(`Erro ao buscar item da tabela ${tableName}:`, error);
      throw error;
    }
  }
  
  // UPDATE - Atualizar um item
  async updateItem<T>(tableName: string, id: number, data: Partial<T>, apiUrl: string): Promise<number> {
    const table = this.getTableByName(tableName);
    
    if (!table) {
      throw new Error(`Tabela ${tableName} não encontrada`);
    }
    
    try {
      // Verificar se o item existe localmente
      const localItem = await table.get(id);
      
      if (!localItem) {
        throw new Error(`Item com id ${id} não encontrado na tabela ${tableName}`);
      }
      
      // Se estiver online e não for um item offline (ID positivo), tenta primeiro atualizar no servidor
      if (checkNetworkStatus() && id > 0) {
        try {
          const response = await fetch(`${apiUrl}/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          // Atualizar localmente
          await table.update(id, {
            ...data,
            last_sync: Date.now()
          });
          
          return id;
        } catch (error) {
          console.error('Falha ao atualizar no servidor, atualizando offline:', error);
          // Em caso de falha, continua para modo offline
        }
      }
      
      // Atualizar localmente
      await table.update(id, {
        ...data,
        _isOffline: true
      });
      
      // Registrar para sincronização futura
      const fullUrl = id > 0 ? `${apiUrl}/${id}` : apiUrl;
      
      await this.addPendingRequest(
        fullUrl,
        id > 0 ? 'PUT' : 'POST', // Se ID for positivo usa PUT, senão POST (item local criado offline)
        id > 0 ? data : {...localItem, ...data}, // Se for update envia só as mudanças, se for create envia tudo
        { 'Content-Type': 'application/json' },
        tableName,
        id,
        id > 0 ? 'update' : 'create'
      );
      
      // Tenta sincronizar se online (background)
      triggerSyncIfNeeded();
      
      return id;
    } catch (error) {
      console.error(`Erro ao atualizar item na tabela ${tableName}:`, error);
      throw error;
    }
  }
  
  // DELETE - Remover um item
  async deleteItem(tableName: string, id: number, apiUrl: string): Promise<void> {
    const table = this.getTableByName(tableName);
    
    if (!table) {
      throw new Error(`Tabela ${tableName} não encontrada`);
    }
    
    try {
      // Se estiver online e não for um item offline (ID positivo), tenta primeiro remover do servidor
      if (checkNetworkStatus() && id > 0) {
        try {
          const response = await fetch(`${apiUrl}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          // Remover localmente
          await table.delete(id);
          return;
        } catch (error) {
          console.error('Falha ao remover no servidor, removendo offline:', error);
          // Em caso de falha, continua para modo offline
        }
      }
      
      // Se for um item que só existe localmente (ID negativo)
      if (id < 0) {
        // Verificar se há uma requisição pendente para criar este item
        const pendingCreate = await this.pendingRequests
          .where({ resourceId: id, operationType: 'create' })
          .first();
        
        if (pendingCreate) {
          // Se o item ainda não foi sincronizado, podemos simplesmente remover a requisição pendente
          await this.pendingRequests.delete(pendingCreate.id);
        }
        
        // Remover o item local
        await table.delete(id);
        return;
      }
      
      // Se for um item do servidor mas estamos offline
      // Marcar para remoção futura
      await this.addPendingRequest(
        `${apiUrl}/${id}`,
        'DELETE',
        null,
        {},
        tableName,
        id,
        'delete'
      );
      
      // Remover localmente
      await table.delete(id);
      
      // Tenta sincronizar se online (background)
      triggerSyncIfNeeded();
    } catch (error) {
      console.error(`Erro ao remover item da tabela ${tableName}:`, error);
      throw error;
    }
  }
  
  // LIST - Listar itens com suporte a paginação e filtros
  async listItems<T>(
    tableName: string, 
    apiUrl: string, 
    page: number = 1, 
    limit: number = 50,
    filters: Record<string, any> = {}
  ): Promise<{ data: T[], total: number, page: number, limit: number }> {
    const table = this.getTableByName(tableName);
    
    if (!table) {
      throw new Error(`Tabela ${tableName} não encontrada`);
    }
    
    // Construir a URL com filtros e paginação
    let filteredUrl = apiUrl;
    const queryParams = new URLSearchParams();
    
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    
    // Adicionar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    filteredUrl += queryString ? `?${queryString}` : '';
    
    try {
      // Se estiver online, tenta primeiro buscar do servidor
      if (checkNetworkStatus()) {
        try {
          const response = await fetch(filteredUrl, {
            method: 'GET',
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          const serverData = await response.json();
          
          // Atualizar cache local (bulk upsert)
          const transaction = this.transaction('rw', table, async () => {
            for (const item of serverData.data) {
              await table.put({
                ...item,
                last_sync: Date.now()
              });
            }
          });
          
          await transaction;
          
          // Atualizar status de sincronização
          await this.syncStatus.put({
            tableName,
            lastSync: Date.now()
          });
          
          return serverData;
        } catch (error) {
          console.error('Falha ao buscar do servidor, usando dados locais:', error);
          // Em caso de falha, continua para busca local
        }
      }
      
      // Busca local com paginação
      let query = table.toCollection();
      
      // Aplicar filtros localmente (simplificado)
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.filter(item => item[key] === value);
        }
      });
      
      const total = await query.count();
      const offset = (page - 1) * limit;
      const items = await query.offset(offset).limit(limit).toArray();
      
      return {
        data: items,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error(`Erro ao listar itens da tabela ${tableName}:`, error);
      throw error;
    }
  }
  
  // Método para contar requisições pendentes
  async countPendingRequests(): Promise<number> {
    try {
      return await this.pendingRequests.count();
    } catch (error) {
      console.error('Erro ao contar requisições pendentes:', error);
      return 0;
    }
  }
  
  // Método para atualizar ID local para o ID do servidor
  async updateLocalId(tableName: string, localId: string | number, serverId: string | number): Promise<boolean> {
    try {
      // Obter a tabela correspondente
      const table = this.getTableByName(tableName);
      if (!table) {
        throw new Error(`Tabela não encontrada: ${tableName}`);
      }
      
      // Obter o item local
      const item = await table.get(localId);
      if (!item) {
        console.warn(`Item não encontrado: ${tableName}/${localId}`);
        return false;
      }
      
      // Remover o item com ID local
      await table.delete(localId);
      
      // Adicionar o item com ID do servidor
      item.id = serverId;
      item._syncedWithServer = true;
      delete item._offline;
      
      await table.put(item);
      
      console.log(`ID atualizado com sucesso: ${tableName} ${localId} -> ${serverId}`);
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar ID: ${tableName} ${localId} -> ${serverId}`, error);
      return false;
    }
  }
}

// Função para armazenar requisições offline para sincronização posterior
export async function storeOfflineRequest(request: PendingRequest): Promise<any> {
  // Armazenar a requisição para sincronização futura
  await offlineDb.pendingRequests.add(request);
  
  // Adicionar imediatamente ao IndexedDB para uso offline
  if (request.operationType === 'create' && request.tableName && request.body) {
    const tempId = -(Date.now());
    const offlineItem = {
      ...request.body,
      id: tempId,
      _isOffline: true,
      _offlineId: request.id
    };
    
    // Salvar no banco de dados Dexie
    const table = offlineDb.getTableByName(request.tableName);
    if (table) {
      await table.add(offlineItem);
      
      // Obter todos os itens da tabela para atualizar o cache
      const allItems = await table.toArray();
      
      // Determinar a chave de consulta correspondente
      const queryKey = `/api/${request.tableName}`;
      
      // Atualizar o cache do React Query para renderização imediata na UI
      queryClient.setQueryData([queryKey], allItems);
      
      return { ...offlineItem, id: tempId };
    }
  }
  
  return null;
}

// Criar e exportar a instância do banco de dados
const offlineDb = new OfflineDatabase();

// Inicializar status de sincronização
offlineDb.initSyncStatus().catch(error => {
  console.error('Erro ao inicializar status de sincronização:', error);
});

// Exportar função para recuperar requisições pendentes
export const getPendingRequests = async ({
  tableName,
  operationType
}: {
  tableName?: string,
  operationType?: 'create' | 'update' | 'delete'
} = {}): Promise<PendingRequest[]> => {
  return await offlineDb.getPendingRequests({ tableName, operationType });
};

export default offlineDb;
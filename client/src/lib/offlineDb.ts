import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { queryClient } from "./queryClient";

// Função para verificar o status da rede
export const checkNetworkStatus = (): boolean => {
  return navigator.onLine;
};

// Função para iniciar sincronização quando necessário
export const triggerSyncIfNeeded = (): void => {
  if (navigator.onLine) {
    // Chama a função de sincronização real
    console.log('Solicitando sincronização de dados pendentes...');
    syncPendingRequests().catch(err => 
      console.error('Erro ao sincronizar dados:', err)
    );
  }
};

// Eventos de sincronização para componentes
export const SYNC_EVENTS = {
  DATA_ADDED: 'data_added',
  DATA_UPDATED: 'data_updated',
  DATA_DELETED: 'data_deleted',
  SYNC_COMPLETED: 'sync_completed'
};

// Sistema básico de eventos para comunicação entre componentes
class SyncEventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`Erro ao executar listener de evento ${event}:`, e);
        }
      });
    }
  }
}

// Exportar instância do emissor de eventos
export const syncEvents = new SyncEventEmitter();

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

// Classe para o banco de dados offline - versão aprimorada
class OfflineDatabase extends Dexie {
  // Tabelas para os dados principais
  clients: Dexie.Table<any, number>;
  services: Dexie.Table<any, number>;
  budgets: Dexie.Table<any, number>;
  technicians: Dexie.Table<any, number>;
  service_types: Dexie.Table<any, number>;
  vehicles: Dexie.Table<any, number>; // Adicionado tabela de veículos
  technician_performance!: Dexie.Table<any, number>; // Tabela para desempenho dos técnicos (definida na v3)
  dashboard_stats!: Dexie.Table<any, number>; // Tabela para estatísticas do dashboard (definida na v3)
  
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
    
    // Adicionar a tabela de veículos na versão 2
    this.version(2).stores({
      vehicles: '++id, client_id, make, model, year, license_plate, color, created_at, modified_at'
    });
    
    // Adicionar tabelas para dashboard e desempenho dos técnicos na versão 3
    this.version(3).stores({
      technician_performance: '++id, name, completionRate, servicesCount, completedCount',
      dashboard_stats: '++id, totalPendingServices, totalInProgressServices, totalCompletedServices, totalRevenue'
    });
    
    // Inicializar referências das tabelas
    this.clients = this.table('clients');
    this.services = this.table('services');
    this.budgets = this.table('budgets');
    this.technicians = this.table('technicians');
    this.service_types = this.table('service_types');
    this.vehicles = this.table('vehicles');
    
    // Inicializar tabelas de dashboard adicionadas na v3
    try {
      this.technician_performance = this.table('technician_performance');
      this.dashboard_stats = this.table('dashboard_stats');
    } catch (e) {
      console.log("[offlineDb] Tabelas de dashboard serão inicializadas durante a verificação de estrutura");
    }
    
    this.pendingRequests = this.table('pendingRequests');
    this.syncStatus = this.table('syncStatus');

    // Verificar estrutura do banco ao inicializar
    this.verifyDatabaseStructure().catch(err => {
      console.error("Erro ao verificar estrutura do banco:", err);
    });
  }

  // Método para verificar e corrigir a estrutura do banco de dados
  async verifyDatabaseStructure() {
    console.log("[offlineDb] Verificando estrutura do banco de dados IndexedDB...");
    
    try {
      // Verificar se todas as tabelas principais existem
      const tables = [
        'clients', 'services', 'budgets', 'technicians', 'service_types', 'vehicles',
        'technician_performance', 'dashboard_stats'
      ];
      
      for (const tableName of tables) {
        try {
          // Testar acesso à tabela
          const count = await this.table(tableName).count();
          console.log(`[offlineDb] Tabela ${tableName} existe e contém ${count} registros`);
        } catch (tableError) {
          console.error(`[offlineDb] Erro ao acessar tabela ${tableName}:`, tableError);
          
          // Se a tabela não existe, tentar recriar a estrutura do banco
          console.log(`[offlineDb] Tentando recriar a tabela ${tableName}...`);
          
          // Se for a versão 1 e a tabela vehicles não existe, tente atualizar para v2
          if (tableName === 'vehicles') {
            console.log("[offlineDb] Atualizando para versão 2 do schema para adicionar tabela de veículos");
            
            // Força atualização do banco para a versão 2
            await this.version(2).stores({
              vehicles: '++id, client_id, make, model, year, license_plate, color, created_at, modified_at'
            });
          }
          
          // Se for a versão 2 e as tabelas de dashboard não existem, atualizar para v3
          if (tableName === 'technician_performance' || tableName === 'dashboard_stats') {
            console.log("[offlineDb] Atualizando para versão 3 do schema para adicionar tabelas de dashboard");
            
            // Força atualização do banco para a versão 3
            await this.version(3).stores({
              technician_performance: '++id, name, completionRate, servicesCount, completedCount',
              dashboard_stats: '++id, totalPendingServices, totalInProgressServices, totalCompletedServices, totalRevenue'
            });
          }
        }
      }
      
      console.log("[offlineDb] Verificação da estrutura do banco concluída com sucesso");
    } catch (error) {
      console.error("[offlineDb] Erro ao verificar estrutura do banco:", error);
      throw error;
    }
  }
  
  // Inicializar status de sincronização para todas as tabelas se necessário
  async initSyncStatus() {
    const tables = [
      'clients', 'services', 'budgets', 'technicians', 'service_types', 'vehicles',
      'technician_performance', 'dashboard_stats'
    ];
    
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
  
  // Obter tabela com base no nome - versão aprimorada com suporte a todas as tabelas
  getTableByName(tableName: string): Dexie.Table<any, any> {
    const tables: Record<string, Dexie.Table<any, any>> = {
      'clients': this.clients,
      'services': this.services,
      'budgets': this.budgets,
      'technicians': this.technicians,
      'service_types': this.service_types,
      'vehicles': this.vehicles,
      'technician_performance': this.technician_performance,
      'dashboard_stats': this.dashboard_stats
    };
    
    const table = tables[tableName];
    if (!table) {
      console.error(`[offlineDb] Tabela não encontrada: ${tableName}`);
    }
    return table;
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
    if (!navigator.onLine) {
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
      
      console.log(`Iniciando sincronização de ${pendingRequests.length} operações pendentes`);
      
      // Acompanhar dados sincronizados por tabela
      const syncedDataByTable: Record<string, any[]> = {};
      let successCount = 0;
      
      // Processar cada requisição pendente
      for (const request of pendingRequests) {
        try {
          console.log(`Processando solicitação ${request.id}: ${request.method} ${request.url} [${request.operationType}]`);
          
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
                
                // Registrar o item atualizado para notificar componentes depois
                if (!syncedDataByTable[request.tableName]) {
                  syncedDataByTable[request.tableName] = [];
                }
                syncedDataByTable[request.tableName].push(localItem);
                
                // Emitir evento específico para a sincronização de um item
                console.log(`Emitindo evento de sincronização para ${request.tableName}, ID ${serverData.id}`);
                syncEvents.emit(SYNC_EVENTS.DATA_UPDATED, request.tableName, localItem);
              }
            }
          } else if (request.operationType === 'update') {
            // Se for uma atualização, registrar para notificar depois
            if (!syncedDataByTable[request.tableName]) {
              syncedDataByTable[request.tableName] = [];
            }
            
            // Obter os dados do servidor se disponíveis
            let updatedData;
            try {
              updatedData = await response.json();
              syncedDataByTable[request.tableName].push(updatedData);
              
              // Emitir evento específico para a sincronização de um item
              console.log(`Emitindo evento de atualização para ${request.tableName}, ID ${updatedData.id}`);
              syncEvents.emit(SYNC_EVENTS.DATA_UPDATED, request.tableName, updatedData);
            } catch (e) {
              // Se não conseguir obter dados JSON, usar o próprio corpo da requisição
              console.log(`Sem dados JSON na resposta, usando dados da requisição para ${request.tableName}`);
              syncedDataByTable[request.tableName].push(request.body);
              
              // Emitir evento específico com os dados da requisição
              syncEvents.emit(SYNC_EVENTS.DATA_UPDATED, request.tableName, request.body);
            }
          } else if (request.operationType === 'delete') {
            // Para exclusões, emitir evento de exclusão
            console.log(`Emitindo evento de exclusão para ${request.tableName}, ID ${request.resourceId}`);
            syncEvents.emit(SYNC_EVENTS.DATA_DELETED, request.tableName, { id: request.resourceId });
          }
          
          // Remover a requisição processada
          await this.pendingRequests.delete(request.id);
          successCount++;
          
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
      const tables = [
        'clients', 'services', 'budgets', 'technicians', 'service_types', 'vehicles',
        'technician_performance', 'dashboard_stats'
      ];
      const now = Date.now();
      
      for (const tableName of tables) {
        await this.syncStatus.put({
          tableName,
          lastSync: now
        });
        
        // Emitir evento de sincronização completa para cada tabela
        // se houver dados que foram sincronizados
        if (syncedDataByTable[tableName] && syncedDataByTable[tableName].length > 0) {
          console.log(`Emitindo evento de sincronização completa para ${tableName}`);
          syncEvents.emit(SYNC_EVENTS.SYNC_COMPLETED, tableName, syncedDataByTable[tableName]);
        }
      }
      
      // Emitir evento geral de sincronização completa
      if (successCount > 0) {
        console.log(`Sincronização bem-sucedida: ${successCount} operações processadas`);
        syncEvents.emit(SYNC_EVENTS.SYNC_COMPLETED, 'all', syncedDataByTable);
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
      if (navigator.onLine) {
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
          const savedId = await table.add({
            ...item,
            id: serverData.id,
            last_sync: Date.now()
          });
          
          // Emitir evento para notificar outros componentes que um novo item foi adicionado
          console.log(`Emitindo evento de dados adicionados para ${tableName}, ID ${serverData.id}`);
          syncEvents.emit(SYNC_EVENTS.DATA_ADDED, tableName, {
            ...item,
            id: serverData.id
          });
          
          return savedId;
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
      
      // Emitir evento para notificar outros componentes que um novo item foi adicionado offline
      console.log(`Emitindo evento de dados adicionados offline para ${tableName}, ID temporário ${tempId}`);
      syncEvents.emit(SYNC_EVENTS.DATA_ADDED, tableName, offlineItem);
      
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
      this.processPendingRequests();
      
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
      this.processPendingRequests();
      
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
      this.processPendingRequests();
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
      if (navigator.onLine) {
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
    
    try {
      // Salvar no banco de dados Dexie - com verificação de tabela aprimorada
      const table = offlineDb.getTableByName(request.tableName);
      if (table) {
        await table.add(offlineItem);
        console.log(`[offlineDb] Item offline adicionado à tabela ${request.tableName} com ID ${tempId}`);
        
        // Obter todos os itens da tabela para atualizar o cache
        const allItems = await table.toArray();
        
        // Atualizar várias chaves de cache para garantir a visibilidade em diferentes componentes
        
        // 1. Atualizar cache básico da tabela
        const baseQueryKey = `/api/${request.tableName}`;
        queryClient.setQueryData([baseQueryKey], allItems);
        console.log(`[offlineDb] Cache atualizado para ${baseQueryKey}`);
        
        // 2. Atualizar cache com opções de offline (usado em componentes com suporte offline)
        const offlineQueryKey = [baseQueryKey, { enableOffline: true, offlineTableName: request.tableName }];
        queryClient.setQueryData(offlineQueryKey, allItems);
        console.log(`[offlineDb] Cache atualizado para ${JSON.stringify(offlineQueryKey)}`);
        
        // 3. Se for um veículo, atualizar também o cache de veículos do cliente
        if (request.tableName === 'vehicles' && request.body.client_id) {
          const clientVehiclesKey = ['/api/clients', request.body.client_id, 'vehicles'];
          
          // Buscar veículos existentes do cliente no cache
          const existingVehicles = queryClient.getQueryData<any[]>(clientVehiclesKey) || [];
          
          // Adicionar o novo veículo à lista
          const updatedVehicles = [...existingVehicles, offlineItem];
          
          // Atualizar o cache
          queryClient.setQueryData(clientVehiclesKey, updatedVehicles);
          console.log(`[offlineDb] Cache de veículos do cliente ${request.body.client_id} atualizado`);
          
          // Atualizar também a versão com suporte offline
          const clientVehiclesOfflineKey = [
            '/api/clients', 
            request.body.client_id, 
            'vehicles', 
            { enableOffline: true, offlineTableName: 'vehicles' }
          ];
          queryClient.setQueryData(clientVehiclesOfflineKey, updatedVehicles);
        }
        
        // Notificar componentes sobre a mudança via sistema de eventos
        syncEvents.emit(SYNC_EVENTS.DATA_ADDED, request.tableName, offlineItem);
        
        return { ...offlineItem, id: tempId };
      } else {
        console.error(`[offlineDb] Erro: Tabela ${request.tableName} não encontrada para armazenar item offline`);
      }
    } catch (error) {
      console.error(`[offlineDb] Erro ao armazenar item offline na tabela ${request.tableName}:`, error);
    }
  }
  
  return null;
}

// Criar e exportar a instância do banco de dados
const offlineDb = new OfflineDatabase();

// Implementa a verdadeira funcionalidade de sincronização
export const syncPendingRequests = () => {
  if (navigator.onLine) {
    console.log('Iniciando sincronização de dados pendentes...');
    return offlineDb.processPendingRequests().then(stats => {
      console.log(`Sincronização concluída: ${stats.success} com sucesso, ${stats.failed} falhas`);
      return stats;
    }).catch(error => {
      console.error('Erro durante sincronização:', error);
      throw error;
    });
  }
  return Promise.resolve({ success: 0, failed: 0 });
};

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

// Função interna para buscar todos os registros de uma tabela
async function _getAllFromTable(tableName: string): Promise<any[]> {
  try {
    const table = offlineDb.getTableByName(tableName);
    
    if (!table) {
      console.error(`[offlineDb] Tabela não encontrada: ${tableName}`);
      return [];
    }
    
    console.log(`[offlineDb] Buscando todos os registros da tabela ${tableName}`);
    const records = await table.toArray();
    console.log(`[offlineDb] Encontrados ${records.length} registros em ${tableName}`);
    
    return records;
  } catch (error) {
    console.error(`[offlineDb] Erro ao buscar registros da tabela ${tableName}:`, error);
    return [];
  }
}

// Função exportada para buscar todos os registros de uma tabela
export const getAllFromTable = async (tableName: string): Promise<any[]> => {
  return await _getAllFromTable(tableName);
};

/**
 * Adiciona um registro diretamente a uma tabela no IndexedDB
 * Útil para armazenar dados offline que precisam estar disponíveis imediatamente
 * @param tableName Nome da tabela no IndexedDB
 * @param data Dados a serem armazenados
 * @returns Promise com o ID do registro adicionado
 */
export const addToOfflineTable = async (tableName: string, data: any): Promise<any> => {
  try {
    console.log(`[offlineDb] Adicionando registro diretamente à tabela '${tableName}'`);
    
    // Verificar se a tabela existe
    if (!Object.prototype.hasOwnProperty.call(offlineDb, tableName)) {
      console.error(`[offlineDb] Tabela '${tableName}' não existe. Tabelas disponíveis:`, 
        Object.keys(offlineDb).filter(key => typeof (offlineDb as any)[key]?.add === 'function'));
      throw new Error(`Tabela '${tableName}' não existe no banco de dados offline`);
    }
    
    // Adicionar marca de timestamp se não existir
    const dataToStore = {
      ...data,
      _timestamp: data._timestamp || new Date().getTime(),
      _isOffline: true
    };
    
    // Adicionar à tabela usando casting seguro para TypeScript
    const id = await (offlineDb as any)[tableName].add(dataToStore);
    console.log(`[offlineDb] Registro adicionado com sucesso à tabela '${tableName}', ID:`, id);
    
    // Emitir evento para notificar componentes
    syncEvents.emit(SYNC_EVENTS.DATA_ADDED, tableName, { ...dataToStore, id });
    
    return id;
  } catch (error) {
    console.error(`[offlineDb] Erro ao adicionar registro à tabela '${tableName}':`, error);
    throw error;
  }
};

export default offlineDb;
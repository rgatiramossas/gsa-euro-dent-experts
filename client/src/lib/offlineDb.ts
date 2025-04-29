import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// Definição da classe do banco de dados Dexie
export class EuroDentDatabase extends Dexie {
  // Definição das tabelas
  clients: Dexie.Table<ClientSchema, number>;
  vehicles: Dexie.Table<VehicleSchema, number>;
  services: Dexie.Table<ServiceSchema, number>;
  budgets: Dexie.Table<BudgetSchema, number>;
  technicians: Dexie.Table<TechnicianSchema, number>;
  events: Dexie.Table<EventSchema, number>;
  pendingSync: Dexie.Table<PendingSyncSchema, string>;

  constructor() {
    super('euroDentExpertsOfflineDb');
    
    // Definir versão e schema do banco de dados
    this.version(1).stores({
      clients: '++id, name, email, phone, active, deleted, &sync_id',
      vehicles: '++id, client_id, make, model, year, &sync_id',
      services: '++id, client_id, vehicle_id, service_type, status, &sync_id',
      budgets: '++id, client_id, vehicle_info, total_value, &sync_id',
      technicians: '++id, name, email, username, role, active, &sync_id',
      events: '++id, title, start_date, end_date, &sync_id',
      pendingSync: 'id, table, action, data, timestamp'
    });

    // Typing para TypeScript
    this.clients = this.table('clients');
    this.vehicles = this.table('vehicles');
    this.services = this.table('services');
    this.budgets = this.table('budgets');
    this.technicians = this.table('technicians');
    this.events = this.table('events');
    this.pendingSync = this.table('pendingSync');
  }
}

// Criar e exportar uma instância do banco
export const offlineDb = new EuroDentDatabase();

// Interfaces para as tabelas
export interface ClientSchema {
  id?: number;
  sync_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  active: boolean;
  deleted?: boolean;
  local_created?: boolean;
  last_sync?: Date;
}

export interface VehicleSchema {
  id?: number;
  sync_id: string;
  client_id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  plate?: string;
  local_created?: boolean;
  last_sync?: Date;
}

export interface ServiceSchema {
  id?: number;
  sync_id: string;
  client_id: number;
  vehicle_id: number;
  service_type: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  status: string;
  price?: number;
  technician_id?: number;
  local_created?: boolean;
  last_sync?: Date;
}

export interface BudgetSchema {
  id?: number;
  sync_id: string;
  client_id: number;
  vehicle_info: string;
  date: Date;
  total_value?: number;
  note?: string;
  local_created?: boolean;
  last_sync?: Date;
}

export interface TechnicianSchema {
  id?: number;
  sync_id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: string;
  active: boolean;
  phone?: string;
  profile_image?: string;
  local_created?: boolean;
  last_sync?: Date;
}

export interface EventSchema {
  id?: number;
  sync_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  all_day?: boolean;
  event_type_id?: number;
  local_created?: boolean;
  last_sync?: Date;
}

export interface PendingSyncSchema {
  id: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  attempts?: number;
}

// Função para gerar um sync_id único para novos registros
export const generateSyncId = () => uuidv4();

// Funções de ajuda para operações de CRUD com suporte a offline

// Função para adicionar um item e registrar para sincronização
export async function addItemOffline<T>(
  table: Dexie.Table<T, any>,
  item: any,
  tableName: string
): Promise<T> {
  // Adicionar sync_id se não existir
  if (!item.sync_id) {
    item.sync_id = generateSyncId();
  }
  
  // Marcar como criado localmente
  item.local_created = true;
  item.last_sync = new Date();
  
  // Adicionar à tabela local
  const id = await table.add(item as any);
  
  // Registrar para sincronização futura
  await offlineDb.pendingSync.add({
    id: generateSyncId(),
    table: tableName,
    action: 'create',
    data: { ...item, id },
    timestamp: new Date()
  });
  
  return { ...item, id } as T;
}

// Função para atualizar um item e registrar para sincronização
export async function updateItemOffline<T>(
  table: Dexie.Table<T, any>,
  id: number,
  changes: Partial<T>,
  tableName: string
): Promise<void> {
  // Buscar item atual
  const currentItem = await table.get(id);
  
  if (!currentItem) {
    throw new Error(`Item com id ${id} não encontrado na tabela ${tableName}`);
  }
  
  // Atualizar last_sync
  changes.last_sync = new Date();
  
  // Atualizar no banco local
  await table.update(id, changes as any);
  
  // Registrar para sincronização
  await offlineDb.pendingSync.add({
    id: generateSyncId(),
    table: tableName,
    action: 'update',
    data: { ...currentItem, ...changes, id },
    timestamp: new Date()
  });
}

// Função para excluir um item e registrar para sincronização
export async function deleteItemOffline<T>(
  table: Dexie.Table<T, any>,
  id: number,
  tableName: string
): Promise<void> {
  // Buscar item a ser excluído
  const itemToDelete = await table.get(id);
  
  if (!itemToDelete) {
    throw new Error(`Item com id ${id} não encontrado na tabela ${tableName}`);
  }
  
  // Excluir do banco local
  await table.delete(id);
  
  // Registrar para sincronização
  await offlineDb.pendingSync.add({
    id: generateSyncId(),
    table: tableName,
    action: 'delete',
    data: { id, sync_id: (itemToDelete as any).sync_id },
    timestamp: new Date()
  });
}

// Função para sincronizar dados pendentes quando online
export async function syncPendingData(): Promise<void> {
  // Verificar se está online
  if (!navigator.onLine) {
    return;
  }
  
  // Buscar todas as operações pendentes
  const pendingOperations = await offlineDb.pendingSync.toArray();
  
  // Ordenar por timestamp
  pendingOperations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Processar cada operação
  for (const operation of pendingOperations) {
    try {
      let endpoint = `/api/${operation.table}`;
      let method = 'POST';
      let data = operation.data;
      
      if (operation.action === 'update') {
        endpoint = `/api/${operation.table}/${operation.data.id}`;
        method = 'PUT';
      } else if (operation.action === 'delete') {
        endpoint = `/api/${operation.table}/${operation.data.id}`;
        method = 'DELETE';
        data = null;
      }
      
      // Fazer requisição
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao sincronizar: ${response.statusText}`);
      }
      
      // Se foi bem sucedido, remover da fila
      await offlineDb.pendingSync.delete(operation.id);
      
      // Se foi uma criação, atualizar o ID do item com o retornado pelo servidor
      if (operation.action === 'create') {
        const responseData = await response.json();
        
        if (responseData.id && operation.data.id !== responseData.id) {
          // Atualizar o ID no banco local se necessário
          const table = offlineDb[operation.table as keyof typeof offlineDb] as Dexie.Table<any, any>;
          
          if (table) {
            // Buscar pelo sync_id
            const localItem = await table.where('sync_id').equals(operation.data.sync_id).first();
            
            if (localItem) {
              // Criar novo item com ID do servidor
              const newItem = { ...localItem, id: responseData.id, local_created: false };
              
              // Excluir o antigo e adicionar o novo
              await table.delete(localItem.id);
              await table.add(newItem);
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`Erro ao sincronizar operação: ${operation.id}`, error);
      
      // Incrementar contagem de tentativas
      const attempts = (operation.attempts || 0) + 1;
      
      // Atualizar para tentar novamente mais tarde (máximo 5 tentativas)
      if (attempts < 5) {
        await offlineDb.pendingSync.update(operation.id, {
          attempts,
          timestamp: new Date(Date.now() + (attempts * 60000)) // Aumentar intervalo em cada tentativa
        });
      }
    }
  }
}

// Iniciar sincronização periódica
export function startPeriodicSync(intervalMs: number = 60000): void {
  setInterval(syncPendingData, intervalMs);
  
  // Também sincronizar quando a conexão for restaurada
  window.addEventListener('online', () => {
    console.log('Conexão restaurada, iniciando sincronização...');
    syncPendingData();
  });
}

// Função para saber se há operações pendentes de sincronização
export async function hasPendingSyncOperations(): Promise<boolean> {
  const count = await offlineDb.pendingSync.count();
  return count > 0;
}
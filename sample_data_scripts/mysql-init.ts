import { initDb } from "../server/db-mysql";
import * as schema from "../shared/schema.mysql";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";

async function initDatabase() {
  try {
    console.log("Inicializando conexão com MySQL...");
    const { db } = await initDb();
    console.log("Conexão com MySQL estabelecida com sucesso!");

    // Lista de todas as tabelas no esquema
    const tables = [
      schema.users,
      schema.clients,
      schema.vehicles,
      schema.serviceTypes,
      schema.services,
      schema.servicePhotos,
      schema.eventTypes,
      schema.events,
      schema.paymentRequests,
      schema.paymentRequestItems,
      schema.expenses,
      schema.managerClientAssignments,
      schema.budgets
    ];

    // Criar tabelas uma a uma
    for (const table of tables) {
      try {
        const tableName = table.name;
        // Verificar se a tabela existe
        console.log(`Verificando se a tabela ${tableName} existe...`);
        
        try {
          await db.select().from(table).limit(1);
          console.log(`Tabela ${tableName} já existe. Pulando.`);
        } catch (error: any) {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log(`Criando tabela ${tableName}...`);
            
            // Extrair definição da tabela
            const columns = Object.entries(table);
            let createTableSQL = `CREATE TABLE ${tableName} (`;
            
            // Mapear propriedades para SQL
            columns.forEach(([columnName, columnDef]: any) => {
              if (columnName !== 'name' && typeof columnDef === 'object' && columnDef._column) {
                // Isso é um campo
                let fieldType = '';
                
                // Determinar tipo de campo com base no tipo de dados
                if (columnDef.dataType === 'number') {
                  if (columnDef.autoIncrement) {
                    fieldType = 'INT AUTO_INCREMENT';
                  } else {
                    fieldType = 'INT';
                  }
                } else if (columnDef.dataType === 'string') {
                  fieldType = 'VARCHAR(255)';
                } else if (columnDef.dataType === 'boolean') {
                  fieldType = 'BOOLEAN';
                } else if (columnDef.dataType === 'date') {
                  fieldType = 'DATETIME';
                } else {
                  fieldType = 'TEXT';
                }
                
                createTableSQL += `${columnName} ${fieldType}${columnDef.notNull ? ' NOT NULL' : ''}, `;
                
                // Adicionar PRIMARY KEY se aplicável
                if (columnDef.primaryKey) {
                  createTableSQL += `PRIMARY KEY (${columnName}), `;
                }
              }
            });
            
            // Remover a vírgula final e fechar parênteses
            createTableSQL = createTableSQL.slice(0, -2) + ")";
            
            // Executar o SQL
            await db.execute(sql.raw(createTableSQL));
            console.log(`Tabela ${tableName} criada com sucesso!`);
          } else {
            console.error(`Erro ao verificar tabela ${tableName}:`, error);
          }
        }
      } catch (tableError) {
        console.error(`Erro ao processar tabela:`, tableError);
      }
    }

    console.log("Inicialização do banco de dados MySQL concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro durante inicialização do banco de dados:", error);
    process.exit(1);
  }
}

initDatabase();
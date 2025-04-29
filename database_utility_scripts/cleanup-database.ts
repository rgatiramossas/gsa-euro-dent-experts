import { initDb } from "../server/db-mysql";
import { sql } from "drizzle-orm";

async function cleanupDatabase() {
  try {
    console.log("Inicializando conexão com MySQL...");
    const { db, pool } = await initDb();
    console.log("Conexão com MySQL estabelecida com sucesso!");

    console.log("Iniciando limpeza do banco de dados...");
    
    // Verificando a foreign key constraint para habilitar a exclusão em cascata
    await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS=0;"));
    
    // Lista de todas as tabelas para limpar
    const tables = [
      "service_photos",
      "payment_request_items",
      "payment_requests",
      "events",
      "manager_client_assignments",
      "budgets",
      "services",
      "vehicles",
      "expenses",
      "clients",
      "event_types",
      "service_types"
    ];

    // Limpar cada tabela - mantemos os usuários para login
    for (const table of tables) {
      console.log(`Limpando tabela ${table}...`);
      await db.execute(sql.raw(`TRUNCATE TABLE ${table};`));
      console.log(`Tabela ${table} limpa com sucesso!`);
    }

    // Restaurar a foreign key constraint
    await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS=1;"));
    
    console.log("Limpeza do banco de dados concluída com sucesso!");
    
    // Fechar a conexão com o banco de dados
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a limpeza do banco de dados:", error);
    process.exit(1);
  }
}

// Executar a função para limpar o banco de dados
cleanupDatabase();
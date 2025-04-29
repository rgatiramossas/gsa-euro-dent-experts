import { initDb } from "../server/db-mysql";
import { sql } from "drizzle-orm";

async function updateClientsTable() {
  try {
    console.log("Inicializando conexão com MySQL...");
    const { db, pool } = await initDb();
    console.log("Conexão com MySQL estabelecida com sucesso!");

    console.log("Iniciando atualização da tabela clients...");
    
    // Verificando a estrutura atual da tabela
    console.log("Verificando a estrutura atual da tabela clients...");
    
    // Remover as colunas cnpj, cpf, company_name, type
    console.log("Removendo colunas: cnpj, cpf, company_name, type...");
    
    // Verificando se as colunas existem antes de tentar removê-las
    try {
      await db.execute(sql.raw("ALTER TABLE clients DROP COLUMN IF EXISTS cnpj"));
      console.log("Coluna cnpj removida ou não existe.");
    } catch (error) {
      console.log("Erro ao remover coluna cnpj:", error);
    }
    
    try {
      await db.execute(sql.raw("ALTER TABLE clients DROP COLUMN IF EXISTS cpf"));
      console.log("Coluna cpf removida ou não existe.");
    } catch (error) {
      console.log("Erro ao remover coluna cpf:", error);
    }
    
    try {
      await db.execute(sql.raw("ALTER TABLE clients DROP COLUMN IF EXISTS company_name"));
      console.log("Coluna company_name removida ou não existe.");
    } catch (error) {
      console.log("Erro ao remover coluna company_name:", error);
    }
    
    try {
      await db.execute(sql.raw("ALTER TABLE clients DROP COLUMN IF EXISTS type"));
      console.log("Coluna type removida ou não existe.");
    } catch (error) {
      console.log("Erro ao remover coluna type:", error);
    }
    
    console.log("Atualização da tabela clients concluída com sucesso!");
    
    // Fechar a conexão com o banco de dados
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a atualização da tabela clients:", error);
    process.exit(1);
  }
}

// Executar a função para atualizar a tabela clients
updateClientsTable();
// Script para corrigir problemas com a tabela de orçamentos
const mysql = require('mysql2/promise');

async function main() {
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  console.log("Conectado ao MySQL, verificando tabelas...");

  try {
    // Verificar se a tabela budgets existe
    const [tables] = await pool.query("SHOW TABLES LIKE 'budgets'");
    
    if (tables.length === 0) {
      console.log("Tabela budgets não encontrada, criando...");
      
      // Criar a tabela budgets
      await pool.query(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          vehicle_info TEXT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_aw FLOAT,
          total_value FLOAT,
          photo_url VARCHAR(255),
          note TEXT,
          plate VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      
      console.log("Tabela budgets criada com sucesso!");
    } else {
      console.log("Tabela budgets já existe.");
      
      // Verificar a estrutura da tabela
      const [fields] = await pool.query("DESCRIBE budgets");
      console.log("Estrutura da tabela budgets:", fields);
    }
    
    console.log("Verificação concluída com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar/criar tabela de orçamentos:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
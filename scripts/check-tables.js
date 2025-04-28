// Script para verificar a tabela budgets e corrigi-la se necessário
const mysql = require('mysql2/promise');

async function main() {
  // Conexão com o banco de dados
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  try {
    console.log("Conectado ao MySQL. Verificando tabelas...");
    
    // Verifica se a tabela budgets existe
    const [tables] = await pool.query("SHOW TABLES LIKE 'budgets'");
    
    if (tables.length === 0) {
      console.log("Tabela budgets não existe. Criando...");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          vehicle_info TEXT,
          date VARCHAR(50) NOT NULL,
          total_aw FLOAT,
          total_value FLOAT,
          photo_url VARCHAR(255),
          note TEXT,
          plate VARCHAR(50),
          chassis_number VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      
      console.log("Tabela budgets criada com sucesso!");
    } else {
      console.log("Tabela budgets já existe. Verificando estrutura...");
      
      // Verifica a estrutura da tabela
      const [columns] = await pool.query("DESCRIBE budgets");
      console.log("Colunas da tabela budgets:", columns.map(c => c.Field));
      
      // Verifica se existem orçamentos
      const [budgetsCount] = await pool.query("SELECT COUNT(*) as count FROM budgets");
      console.log(`Total de orçamentos: ${budgetsCount[0].count}`);
    }
    
    // Verificar se a função createBudget está funcionando
    console.log("Testando inserção de orçamento...");
    try {
      // Adicionar um cliente de teste se não existir
      const [clients] = await pool.query("SELECT id FROM clients LIMIT 1");
      
      if (clients.length === 0) {
        console.log("Não há clientes no banco. Adicionando cliente de teste...");
        const [result] = await pool.query(`
          INSERT INTO clients (name, email, phone, address) 
          VALUES ('Cliente Teste', 'teste@teste.com', '123456789', 'Endereço de Teste')
        `);
        console.log(`Cliente de teste adicionado com ID: ${result.insertId}`);
        var clientId = result.insertId;
      } else {
        var clientId = clients[0].id;
      }
      
      // Tenta inserir um orçamento de teste
      const [budgetResult] = await pool.query(`
        INSERT INTO budgets (client_id, vehicle_info, date, total_aw, total_value, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [clientId, 'Veiculo Teste', '2025-04-28', 10, 100, 'Orçamento de teste']);
      
      console.log(`Orçamento de teste inserido com ID: ${budgetResult.insertId}`);
    } catch (insertError) {
      console.error("Erro ao inserir orçamento de teste:", insertError);
    }
    
    console.log("Verificação finalizada.");
  } catch (error) {
    console.error("Erro durante a verificação:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
// Script para verificar a visualização de orçamentos
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log("Conectado ao MySQL. Verificando orçamentos...");
    
    // Verifica se há orçamentos
    const [budgets] = await pool.query(`
      SELECT b.*, c.name as client_name 
      FROM budgets b 
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.id DESC
    `);
    
    console.log(`Total de orçamentos encontrados: ${budgets.length}`);
    
    if (budgets.length === 0) {
      console.log("Nenhum orçamento encontrado. Criando um orçamento de teste...");
      
      // Verificar se existem clientes
      const [clients] = await pool.query("SELECT id FROM clients LIMIT 1");
      
      if (clients.length === 0) {
        console.log("Não há clientes no banco. Adicionando cliente de teste...");
        const [result] = await pool.query(`
          INSERT INTO clients (name, email, phone, address) 
          VALUES ('Cliente Verificação', 'verificacao@teste.com', '987654321', 'Rua de Teste, 123')
        `);
        console.log(`Cliente de teste adicionado com ID: ${result.insertId}`);
        var clientId = result.insertId;
      } else {
        var clientId = clients[0].id;
      }
      
      // Criando orçamento de teste
      const [budgetResult] = await pool.query(`
        INSERT INTO budgets (client_id, vehicle_info, date, total_aw, total_value, note, plate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [clientId, 'Veículo de Verificação', '2025-04-28', 15, 500, 'Orçamento de verificação', 'ABC1234']);
      
      console.log(`Orçamento de teste inserido com ID: ${budgetResult.insertId}`);
      
      // Buscar o orçamento recém-criado
      const [newBudget] = await pool.query(`
        SELECT b.*, c.name as client_name 
        FROM budgets b 
        LEFT JOIN clients c ON b.client_id = c.id
        WHERE b.id = ?
      `, [budgetResult.insertId]);
      
      if (newBudget.length > 0) {
        console.log("Orçamento criado com sucesso:", newBudget[0]);
      }
    } else {
      console.log("Orçamentos encontrados:");
      budgets.forEach((budget, index) => {
        console.log(`${index + 1}. ID: ${budget.id}, Cliente: ${budget.client_name}, Valor: ${budget.total_value}`);
      });
      
      // Testar busca por ID para o primeiro orçamento
      const firstBudgetId = budgets[0].id;
      console.log(`\nVerificando detalhes do orçamento ID ${firstBudgetId}...`);
      
      const [budgetDetails] = await pool.query(`
        SELECT b.*, c.name as client_name 
        FROM budgets b 
        LEFT JOIN clients c ON b.client_id = c.id
        WHERE b.id = ?
      `, [firstBudgetId]);
      
      if (budgetDetails.length > 0) {
        console.log("Detalhes do orçamento:", budgetDetails[0]);
      } else {
        console.log(`Erro: Orçamento com ID ${firstBudgetId} não encontrado`);
      }
    }
    
    console.log("\nVerificação de orçamentos concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a verificação:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
// Script para criar dados de teste no sistema
// Execute este script diretamente no terminal: node scripts/create-test-data.js

async function createTestData() {
  try {
    console.log("\n=== SCRIPT DE CRIAÇÃO DE DADOS DE TESTE ===");
    console.log("Iniciando script para criar dados de teste...");
    
    console.log("\nInformação: Este script chama diretamente a API que cria 5 clientes, cada um com 1 veículo,")
    console.log("5 serviços e 5 orçamentos. Não é necessária autenticação para o endpoint de teste.\n");
    
    // Fazer chamada para API que cria os dados de teste
    console.log("Chamando API em http://localhost:5000/api/test-setup...");
    const response = await fetch('http://localhost:5000/api/test-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Falha na API: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log("\n✅ OPERAÇÃO CONCLUÍDA COM SUCESSO!");
    if (result.note) {
      console.log(`Nota: ${result.note}`);
    }
    
    console.log(`Resumo: ${result.summary.clients} clientes, ${result.summary.vehicles} veículos, ` +
                `${result.summary.services} serviços e ${result.summary.budgets} orçamentos.`);
    
    console.log("\nEm um ambiente real, os dados estariam disponíveis no sistema:");
    console.log("- Clientes: para ver a lista de clientes");
    console.log("- Serviços: para ver a lista de serviços");
    console.log("- Orçamentos: para ver a lista de orçamentos");
    console.log("\n============================================\n");
    
  } catch (error) {
    console.error("\n❌ ERRO AO CRIAR DADOS DE TESTE:", error.message);
    console.error("\nDicas de solução:");
    console.error("1. Verifique se o servidor está rodando em http://localhost:5000");
    console.error("2. Verifique se há técnicos cadastrados no sistema");
    console.error("3. Verifique se há tipos de serviço cadastrados no sistema");
    console.error("4. Verifique os logs do servidor para mais detalhes");
    console.error("\n============================================\n");
  }
}

// Executar a função
createTestData();
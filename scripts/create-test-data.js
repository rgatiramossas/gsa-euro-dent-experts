// Script para criar dados de teste no sistema

async function createTestData() {
  try {
    console.log("Iniciando script para criar dados de teste...");
    
    // Fazer chamada para API que cria os dados de teste
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
    
    console.log("Dados de teste criados com sucesso!");
    console.log(`Resumo: ${result.summary.clients} clientes, ${result.summary.vehicles} veículos, ` +
                `${result.summary.services} serviços e ${result.summary.budgets} orçamentos.`);
    
  } catch (error) {
    console.error("Erro ao criar dados de teste:", error.message);
  }
}

// Executar a função
createTestData();
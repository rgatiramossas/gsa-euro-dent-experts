import { db } from "../server/db";
import { budgets } from "../shared/schema";
import { format } from "date-fns";

async function generateBudgets() {
  console.log("Iniciando geração de orçamentos...");

  // Dados de exemplo para os orçamentos
  const budgetData = [
    {
      client_id: 1,
      vehicle_info: "Toyota Corolla Prata - Amassado na porta traseira esquerda",
      plate: "ABC1234",
      chassisNumber: "JT2BF22K1X0123456",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 3,
      total_value: 450.00,
      note: "Cliente solicitou urgência no reparo"
    },
    {
      client_id: 2,
      vehicle_info: "Volkswagen Golf Branco - Vários amassados no capô devido a granizo",
      plate: "GHI9012",
      chassisNumber: "WVWZZZ1JZXW123456",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 8,
      total_value: 1200.00,
      note: "Danos por granizo. Cliente possui seguro."
    },
    {
      client_id: 3,
      vehicle_info: "Chevrolet Onix Azul - Amassado na porta dianteira direita",
      plate: "MNO7890",
      chassisNumber: "9BGKD48U0KG123456",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 2,
      total_value: 350.00,
      note: "Cliente solicitou desconto por ser recorrente"
    },
    {
      client_id: 4,
      vehicle_info: "Ford Ka Branco - Pequeno amassado no paralama dianteiro",
      plate: "STU5678",
      chassisNumber: "9BFZH54L6K8123456",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 1,
      total_value: 180.00,
      note: "Reparo simples, sem pintura"
    },
    {
      client_id: 5,
      vehicle_info: "BMW X3 Preto - Múltiplos amassados devido a granizo",
      plate: "YZA3456",
      chassisNumber: "WBA12AB1XCDW12345",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 12,
      total_value: 2400.00,
      note: "Veículo de luxo, cuidado especial. Cliente solicitou visita no local."
    }
  ];

  // Inserir orçamentos no banco de dados
  for (const data of budgetData) {
    try {
      const [newBudget] = await db.insert(budgets).values(data).returning();
      console.log(`Orçamento criado para o cliente ${data.client_id}: ${newBudget.id}`);
    } catch (error) {
      console.error(`Erro ao criar orçamento para cliente ${data.client_id}:`, error);
    }
  }

  console.log("Geração de orçamentos concluída!");
}

// Executar a função
generateBudgets()
  .then(() => {
    console.log("Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });
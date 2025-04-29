// Nota: Este script não está sendo usado ativamente e requer ajustes para funcionar 
// com a configuração MySQL atual. Importação comentada para evitar erros.
// import { db } from "../server/db-mysql";
// import { clients, vehicles, services } from "@shared/schema.mysql";
// O db precisaria ser inicializado usando initDb() neste arquivo

// Placeholder para evitar erro de compilação
const db = null;
const clients = null;
const vehicles = null;
const services = null;

async function generateServices() {
  console.log("Gerando serviços com taxa administrativa...");
  
  // Obter todos os clientes
  const allClients = await db.select().from(clients);
  console.log(`Encontrados ${allClients.length} clientes.`);
  
  // Obter todos os veículos
  const allVehicles = await db.select().from(vehicles);
  console.log(`Encontrados ${allVehicles.length} veículos.`);
  
  // Datas
  const currentDate = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  // Valores base para serviços
  const basePrices = [750, 1680, 280, 1120, 420, 560, 2100, 280, 1400, 840];
  
  // Apenas para metade dos clientes (5 primeiros) vamos criar serviços
  for (let i = 0; i < 5; i++) {
    try {
      // Verificar se temos cliente e veículo disponíveis
      const client = allClients[i];
      if (!client) {
        console.log(`Cliente ${i+1} não encontrado.`);
        continue;
      }
      
      // Encontrar o veículo deste cliente
      const vehicle = allVehicles.find(v => v.client_id === client.id);
      if (!vehicle) {
        console.log(`Veículo para cliente ${client.name} (ID: ${client.id}) não encontrado.`);
        continue;
      }
      
      // Valor base do serviço
      const basePrice = basePrices[i];
      
      // Taxa administrativa (10% do valor do serviço)
      const administrativeFee = basePrice * 0.10;
      
      // Total (valor base + taxa administrativa)
      const total = basePrice + administrativeFee;
      
      // Status alternados
      const statusOptions = ['completed', 'pending', 'completed', 'pending', 'completed'];
      const status = statusOptions[i % 5];
      
      const serviceData = {
        client_id: client.id,
        vehicle_id: vehicle.id,
        service_type_id: ((i % 3) + 1), // Alterna entre os 3 tipos de serviço
        technician_id: 2, // ID do João (técnico)
        status: status,
        description: `Reparo de amassados - Cliente: ${client.name}, Veículo: ${vehicle.make} ${vehicle.model}`,
        scheduled_date: currentDate,
        start_date: twoWeeksAgo,
        completion_date: status === 'completed' ? currentDate : null,
        location_type: i % 2 === 0 ? 'client_location' : 'workshop',
        address: i % 2 === 0 ? client.address : 'Oficina Central, Rua Principal, 1000, São Paulo',
        price: basePrice,
        administrative_fee: administrativeFee,
        total: total,
        notes: `Serviço baseado no orçamento. Taxa administrativa de 10% aplicada (${administrativeFee.toFixed(2)}).`,
      };
      
      const [service] = await db.insert(services).values(serviceData).returning();
      console.log(`Serviço criado para ${client.name}: ID ${service.id}, Valor ${service.price}, Taxa Adm ${service.administrative_fee}, Total ${service.total}`);
    } catch (error) {
      console.error(`Erro ao criar serviço para cliente ${i+1}:`, error);
    }
  }

  console.log("Geração de serviços concluída!");
}

// Executar a geração de serviços
generateServices()
  .then(() => {
    console.log("Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });
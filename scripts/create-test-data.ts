// Script para criar clientes e ordens de serviço de teste
import { db } from "../server/db";
import { clients, vehicles, serviceTypes, services } from "../shared/schema";

async function createTestData() {
  console.log("Iniciando criação de dados de teste...");

  // 1. Criar tipos de serviço se não existirem
  const existingServiceTypes = await db.select().from(serviceTypes);
  if (existingServiceTypes.length === 0) {
    console.log("Criando tipos de serviço...");
    await db.insert(serviceTypes).values([
      { name: "Amassado Pequeno", description: "Reparação de amassado pequeno", base_price: 80 },
      { name: "Amassado Médio", description: "Reparação de amassado médio", base_price: 120 },
      { name: "Amassado Grande", description: "Reparação de amassado grande", base_price: 200 },
      { name: "Granizo", description: "Reparação de danos por granizo", base_price: 350 },
    ]);
  }
  
  // Obter tipos de serviço para usar nas ordens de serviço
  const serviceTypesList = await db.select().from(serviceTypes);
  
  // 2. Criar clientes de teste
  console.log("Criando clientes de teste...");
  const testClients = [
    {
      name: "Maria Silva",
      email: "maria.silva@email.com",
      phone: "(11) 98765-4321",
      address: "Rua das Flores, 123",
      city: "São Paulo",
      state: "SP",
      zip: "01234-567"
    },
    {
      name: "João Oliveira",
      email: "joao.oliveira@email.com",
      phone: "(21) 97654-3210",
      address: "Avenida Rio Branco, 456",
      city: "Rio de Janeiro",
      state: "RJ",
      zip: "20030-002"
    },
    {
      name: "Ana Souza",
      email: "ana.souza@email.com",
      phone: "(31) 96543-2109",
      address: "Praça da Liberdade, 789",
      city: "Belo Horizonte",
      state: "MG",
      zip: "30140-010"
    },
    {
      name: "Carlos Ferreira",
      email: "carlos.ferreira@email.com",
      phone: "(41) 95432-1098",
      address: "Rua XV de Novembro, 1010",
      city: "Curitiba",
      state: "PR",
      zip: "80020-310"
    },
    {
      name: "Lúcia Santos",
      email: "lucia.santos@email.com",
      phone: "(51) 94321-0987",
      address: "Avenida Ipiranga, 1515",
      city: "Porto Alegre",
      state: "RS",
      zip: "90160-093"
    }
  ];

  // Inserir clientes e armazenar os IDs retornados
  const clientIds = [];
  for (const client of testClients) {
    const [newClient] = await db.insert(clients).values(client).returning();
    clientIds.push(newClient.id);
    console.log(`Cliente criado: ${newClient.name} (ID: ${newClient.id})`);
  }

  // 3. Criar veículos para cada cliente
  console.log("Criando veículos...");
  const testVehicles = [
    // Cliente 1
    {
      client_id: clientIds[0],
      make: "Toyota",
      model: "Corolla",
      year: 2019,
      color: "Prata",
      license_plate: "ABC1234"
    },
    {
      client_id: clientIds[0],
      make: "Honda",
      model: "Fit",
      year: 2020,
      color: "Azul",
      license_plate: "DEF5678"
    },
    // Cliente 2
    {
      client_id: clientIds[1],
      make: "Volkswagen",
      model: "Golf",
      year: 2021,
      color: "Preto",
      license_plate: "GHI9012"
    },
    {
      client_id: clientIds[1],
      make: "Fiat",
      model: "Toro",
      year: 2022,
      color: "Vermelho",
      license_plate: "JKL3456"
    },
    // Cliente 3
    {
      client_id: clientIds[2],
      make: "Chevrolet",
      model: "Onix",
      year: 2020,
      color: "Branco",
      license_plate: "MNO7890"
    },
    {
      client_id: clientIds[2],
      make: "Hyundai",
      model: "HB20",
      year: 2021,
      color: "Cinza",
      license_plate: "PQR1234"
    },
    // Cliente 4
    {
      client_id: clientIds[3],
      make: "Renault",
      model: "Kwid",
      year: 2022,
      color: "Amarelo",
      license_plate: "STU5678"
    },
    {
      client_id: clientIds[3],
      make: "Nissan",
      model: "Kicks",
      year: 2023,
      color: "Verde",
      license_plate: "VWX9012"
    },
    // Cliente 5
    {
      client_id: clientIds[4],
      make: "Jeep",
      model: "Renegade",
      year: 2021,
      color: "Laranja",
      license_plate: "YZA3456"
    },
    {
      client_id: clientIds[4],
      make: "Ford",
      model: "Ka",
      year: 2020,
      color: "Roxo",
      license_plate: "BCD7890"
    }
  ];

  const vehicleIds = [];
  for (const vehicle of testVehicles) {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    vehicleIds.push(newVehicle.id);
    console.log(`Veículo criado: ${newVehicle.make} ${newVehicle.model} (ID: ${newVehicle.id})`);
  }

  // 4. Criar 2 ordens de serviço para cada cliente
  console.log("Criando ordens de serviço...");
  
  // Status possíveis: 'pending', 'completed', 'aguardando_aprovacao', 'faturado', 'pago'
  const statusOptions = ['pending', 'completed', 'aguardando_aprovacao', 'faturado', 'pago'];
  
  for (let i = 0; i < clientIds.length; i++) {
    const clientId = clientIds[i];
    // Cada cliente tem 2 veículos, então pegamos os IDs correspondentes
    const clientVehicleIds = [vehicleIds[i * 2], vehicleIds[i * 2 + 1]];
    
    // Criar 2 OS para cada cliente
    for (let j = 0; j < 2; j++) {
      const vehicleId = clientVehicleIds[j];
      // Selecionar aleatoriamente um tipo de serviço
      const serviceTypeId = serviceTypesList[Math.floor(Math.random() * serviceTypesList.length)].id;
      
      // Configurar datas (entre hoje e 30 dias atrás)
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() - randomDaysAgo);
      
      // Status aleatório
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      // Definir preços
      const basePrice = serviceTypesList.find(st => st.id === serviceTypeId)?.base_price || 100;
      const price = basePrice;
      const displacementFee = 25;
      const administrativeFee = basePrice * 0.1; // 10% do preço base
      const total = price + displacementFee + administrativeFee;
      
      const serviceData = {
        client_id: clientId,
        vehicle_id: vehicleId,
        service_type_id: serviceTypeId,
        technician_id: null, // Deixar null por enquanto
        status: status,
        description: `Serviço de martelinho de ouro para reparação de amassado - Cliente ${i + 1}, Veículo ${j + 1}`,
        scheduled_date: scheduledDate,
        start_date: status !== 'pending' ? scheduledDate : null,
        completion_date: ['completed', 'faturado', 'pago'].includes(status) ? scheduledDate : null,
        location_type: Math.random() > 0.5 ? "client_location" : "workshop",
        address: testClients[i].address,
        price: price,
        displacement_fee: displacementFee,
        administrative_fee: administrativeFee,
        total: total,
        notes: `Notas para o serviço ${i + 1}-${j + 1}`
      };
      
      const [newService] = await db.insert(services).values(serviceData).returning();
      console.log(`OS criada: ID ${newService.id} - Cliente ${clientId} - Status: ${status}`);
    }
  }

  console.log("Criação de dados de teste concluída!");
}

// Executar a função principal
createTestData()
  .then(() => {
    console.log("Script concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });
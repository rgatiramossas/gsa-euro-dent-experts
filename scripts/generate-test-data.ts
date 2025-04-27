import { db } from "../server/db";
import { 
  clients, vehicles, serviceTypes, budgets 
} from "../shared/schema";

async function generateTestData() {
  console.log("Gerando dados de teste para o sistema...");

  // Criar 3 clientes
  const clientsData = [
    {
      name: "Empresa ABC Ltda",
      email: "contato@empresaabc.com",
      phone: "(11) 98765-4321",
      address: "Rua das Flores, 123, São Paulo, SP",
      notes: "Cliente corporativo premium"
    },
    {
      name: "Transportes Rápidos S.A.",
      email: "contato@transportesrapidos.com",
      phone: "(11) 91234-5678",
      address: "Av. Paulista, 1000, São Paulo, SP",
      notes: "Frota com mais de 50 veículos"
    },
    {
      name: "Construtora Horizonte",
      email: "atendimento@horizonteconstrutora.com",
      phone: "(11) 97777-8888",
      address: "Rua dos Engenheiros, 500, São Paulo, SP",
      notes: "Veículos de construção e maquinário pesado"
    }
  ];

  console.log("Inserindo clientes...");
  const createdClients = await Promise.all(
    clientsData.map(async (clientData) => {
      const [client] = await db.insert(clients).values(clientData).returning();
      return client;
    })
  );
  console.log(`Criados ${createdClients.length} clientes`);

  // Criar veículos para cada cliente
  const vehiclesData = [
    // Veículos para Empresa ABC
    {
      client_id: createdClients[0].id,
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      license_plate: "ABC1234",
      color: "Prata",
      notes: "Sedan executivo"
    },
    {
      client_id: createdClients[0].id,
      make: "Honda",
      model: "Civic",
      year: 2021,
      license_plate: "DEF5678",
      color: "Preto",
      notes: "Usado pela diretoria"
    },
    // Veículos para Transportes Rápidos
    {
      client_id: createdClients[1].id,
      make: "Volkswagen",
      model: "Amarok",
      year: 2023,
      license_plate: "TRA1001",
      color: "Branco",
      notes: "Picape para transporte de cargas leves"
    },
    {
      client_id: createdClients[1].id,
      make: "Mercedes-Benz",
      model: "Sprinter",
      year: 2020,
      license_plate: "TRA2002",
      color: "Branco",
      notes: "Van para entregas urbanas"
    },
    // Veículos para Construtora Horizonte
    {
      client_id: createdClients[2].id,
      make: "Ford",
      model: "F-4000",
      year: 2021,
      license_plate: "HOR1000",
      color: "Amarelo",
      notes: "Caminhão para transporte de materiais"
    },
    {
      client_id: createdClients[2].id,
      make: "Toyota",
      model: "Hilux",
      year: 2022,
      license_plate: "HOR2000",
      color: "Prata",
      notes: "Picape para supervisores de obra"
    }
  ];

  console.log("Inserindo veículos...");
  const createdVehicles = await Promise.all(
    vehiclesData.map(async (vehicleData) => {
      const [vehicle] = await db.insert(vehicles).values(vehicleData).returning();
      return vehicle;
    })
  );
  console.log(`Criados ${createdVehicles.length} veículos`);

  // Criar tipos de serviço se não existirem
  const existingServiceTypes = await db.select().from(serviceTypes);
  if (existingServiceTypes.length === 0) {
    console.log("Criando tipos de serviço padrão...");
    const serviceTypesData = [
      { name: "Granizo", description: "Reparo de danos causados por granizo", color: "#FF9800" },
      { name: "Martelinho", description: "Reparos com martelinho de ouro", color: "#4CAF50" },
      { name: "Pintura", description: "Serviços de pintura automotiva", color: "#2196F3" }
    ];

    await Promise.all(
      serviceTypesData.map(async (typeData) => {
        await db.insert(serviceTypes).values(typeData);
      })
    );
    console.log("Tipos de serviço padrão criados");
  }

  // Obter os tipos de serviço para usar nos orçamentos
  const serviceTypesList = await db.select().from(serviceTypes);

  // Criar orçamentos para os veículos
  const budgetsData = [
    // Orçamentos para Empresa ABC
    {
      client_id: createdClients[0].id,
      vehicle_id: createdVehicles[0].id,
      service_type_id: serviceTypesList[0].id, // Granizo
      status: "aguardando",
      total: 1200.00,
      dents: 8,
      size: 2, // médio
      is_vertical: false,
      is_aluminum: false,
      notes: "Capô danificado por tempestade de granizo",
      vehicle_info: "Toyota Corolla 2022 - Prata",
      date: new Date().toISOString().split('T')[0]
    },
    {
      client_id: createdClients[0].id,
      vehicle_id: createdVehicles[1].id,
      service_type_id: serviceTypesList[1].id, // Martelinho
      status: "aguardando",
      total: 850.00,
      dents: 4,
      size: 3, // grande
      is_vertical: true,
      is_aluminum: false,
      notes: "Porta motorista amassada",
      vehicle_info: "Honda Civic 2021 - Preto",
      date: new Date().toISOString().split('T')[0]
    },
    // Orçamentos para Transportes Rápidos
    {
      client_id: createdClients[1].id,
      vehicle_id: createdVehicles[2].id,
      service_type_id: serviceTypesList[0].id, // Granizo
      status: "aguardando",
      total: 2300.00,
      dents: 15,
      size: 1, // pequeno
      is_vertical: false,
      is_aluminum: false,
      notes: "Teto com múltiplos amassados",
      vehicle_info: "Volkswagen Amarok 2023 - Branco",
      date: new Date().toISOString().split('T')[0]
    },
    {
      client_id: createdClients[1].id,
      vehicle_id: createdVehicles[3].id,
      service_type_id: serviceTypesList[2].id, // Pintura
      status: "aguardando",
      total: 1500.00,
      dents: 0, // não é reparo de amassado
      size: 0, // não aplicável
      is_vertical: false,
      is_aluminum: false,
      notes: "Repintura de porta lateral",
      vehicle_info: "Mercedes-Benz Sprinter 2020 - Branco",
      date: new Date().toISOString().split('T')[0]
    },
    // Orçamentos para Construtora Horizonte
    {
      client_id: createdClients[2].id,
      vehicle_id: createdVehicles[4].id,
      service_type_id: serviceTypesList[1].id, // Martelinho
      status: "aguardando",
      total: 1800.00,
      dents: 6,
      size: 4, // muito grande
      is_vertical: true,
      is_aluminum: true,
      notes: "Lateral da caçamba amassada",
      vehicle_info: "Ford F-4000 2021 - Amarelo",
      date: new Date().toISOString().split('T')[0]
    },
    {
      client_id: createdClients[2].id,
      vehicle_id: createdVehicles[5].id,
      service_type_id: serviceTypesList[0].id, // Granizo
      status: "aguardando",
      total: 3200.00,
      dents: 22,
      size: 2, // médio
      is_vertical: false,
      is_aluminum: false,
      notes: "Capô, teto e porta-malas com danos de granizo",
      vehicle_info: "Toyota Hilux 2022 - Prata"
    }
  ];

  console.log("Inserindo orçamentos...");
  const createdBudgets = await Promise.all(
    budgetsData.map(async (budgetData) => {
      const [budget] = await db.insert(budgets).values(budgetData).returning();
      return budget;
    })
  );
  console.log(`Criados ${createdBudgets.length} orçamentos`);

  console.log("Dados de teste gerados com sucesso!");
  return {
    clients: createdClients,
    vehicles: createdVehicles,
    budgets: createdBudgets
  };
}

// Executar a função
generateTestData()
  .then(() => {
    console.log("Processo concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao gerar dados de teste:", error);
    process.exit(1);
  });
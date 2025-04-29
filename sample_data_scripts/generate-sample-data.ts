// Nota: Este script não está sendo usado ativamente e requer ajustes para funcionar 
// com a configuração MySQL atual. Importação comentada para evitar erros.
// import { db } from "../server/db-mysql"; 
// import { clients, budgets, services, vehicles } from "@shared/schema.mysql";
// O db precisaria ser inicializado usando initDb() neste arquivo

// Placeholder para evitar erro de compilação
const db = null;
const clients = null;
const budgets = null;
const services = null;
const vehicles = null;
import bcrypt from "bcrypt";
import { format } from "date-fns";

async function generateSampleData() {
  console.log("Gerando dados de exemplo...");
  
  // Dados para clientes
  const clientsData = [
    {
      name: "Maria Silva",
      email: "maria.silva@exemplo.com",
      phone: "(11) 98765-4321",
      address: "Rua das Flores, 123",
      city: "São Paulo",
      state: "SP",
      zip: "01234-567"
    },
    {
      name: "João Santos",
      email: "joao.santos@exemplo.com",
      phone: "(11) 97654-3210",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      state: "SP",
      zip: "01310-100"
    },
    {
      name: "Ana Oliveira",
      email: "ana.oliveira@exemplo.com",
      phone: "(11) 96543-2109",
      address: "Rua Augusta, 500",
      city: "São Paulo",
      state: "SP",
      zip: "01305-000"
    },
    {
      name: "Carlos Ferreira",
      email: "carlos.ferreira@exemplo.com",
      phone: "(11) 95432-1098",
      address: "Rua Oscar Freire, 200",
      city: "São Paulo",
      state: "SP",
      zip: "01426-000"
    },
    {
      name: "Patricia Souza",
      email: "patricia.souza@exemplo.com",
      phone: "(11) 94321-0987",
      address: "Av. Brigadeiro Faria Lima, 3000",
      city: "São Paulo",
      state: "SP",
      zip: "01451-000"
    },
    {
      name: "Roberto Almeida",
      email: "roberto.almeida@exemplo.com",
      phone: "(11) 93210-9876",
      address: "Rua Haddock Lobo, 400",
      city: "São Paulo",
      state: "SP",
      zip: "01414-000"
    },
    {
      name: "Fernanda Costa",
      email: "fernanda.costa@exemplo.com",
      phone: "(11) 92109-8765",
      address: "Alameda Santos, 800",
      city: "São Paulo",
      state: "SP",
      zip: "01419-000"
    },
    {
      name: "Marcelo Lima",
      email: "marcelo.lima@exemplo.com",
      phone: "(11) 91098-7654",
      address: "Rua da Consolação, 1500",
      city: "São Paulo",
      state: "SP",
      zip: "01301-100"
    },
    {
      name: "Juliana Martins",
      email: "juliana.martins@exemplo.com",
      phone: "(11) 90987-6543",
      address: "Av. Rebouças, 1200",
      city: "São Paulo",
      state: "SP",
      zip: "05402-000"
    },
    {
      name: "Ricardo Pereira",
      email: "ricardo.pereira@exemplo.com",
      phone: "(11) 90876-5432",
      address: "Rua dos Pinheiros, 600",
      city: "São Paulo",
      state: "SP",
      zip: "05422-000"
    }
  ];

  // Dados para veículos
  const vehiclesData = [
    {
      make: "Toyota",
      model: "Corolla",
      color: "Prata",
      license_plate: "ABC1234",
      vin: "JT2BF22K1X0123456",
      notes: "Sedã em ótimo estado"
    },
    {
      make: "Volkswagen",
      model: "Golf",
      color: "Branco",
      license_plate: "DEF5678",
      vin: "WVWZZZ1JZXW123456",
      notes: "Hatch bem conservado"
    },
    {
      make: "Chevrolet",
      model: "Onix",
      color: "Azul",
      license_plate: "GHI9012",
      vin: "9BGKD48U0KG123456",
      notes: "Veículo de uso diário"
    },
    {
      make: "Honda",
      model: "Civic",
      color: "Preto",
      license_plate: "JKL3456",
      vin: "SHHFK2740KU123456",
      notes: "Sedã esportivo"
    },
    {
      make: "Ford",
      model: "Ka",
      color: "Vermelho",
      license_plate: "MNO7890",
      vin: "9BFZH54L6K8123456",
      notes: "Compacto urbano"
    },
    {
      make: "Hyundai",
      model: "HB20",
      color: "Prata",
      license_plate: "PQR1234",
      vin: "9BHBG51NAMP123456",
      notes: "Hatch econômico"
    },
    {
      make: "Renault",
      model: "Sandero",
      color: "Bege",
      license_plate: "STU5678",
      vin: "93YBSR7UHEJ123456",
      notes: "Hatch compacto"
    },
    {
      make: "Fiat",
      model: "Argo",
      color: "Cinza",
      license_plate: "VWX9012",
      vin: "9BD358A4HLYL123456",
      notes: "Hatch moderno"
    },
    {
      make: "Nissan",
      model: "Kicks",
      color: "Laranja",
      license_plate: "YZA3456",
      vin: "94DVSB7L5KP123456",
      notes: "SUV compacto"
    },
    {
      make: "Jeep",
      model: "Renegade",
      color: "Verde",
      license_plate: "BCD7890",
      vin: "98866812VCKP123456",
      notes: "SUV robusto"
    }
  ];

  // Dados para orçamentos
  const budgetsData = [
    {
      vehicle_info: "Toyota Corolla Prata - Amassados na porta dianteira esquerda e capô",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 5,
      total_value: 750.00,
      note: "Danos causados em estacionamento. Cliente tem urgência.",
      plate: "ABC1234",
      chassisNumber: "JT2BF22K1X0123456"
    },
    {
      vehicle_info: "Volkswagen Golf Branco - Múltiplos amassados de granizo no teto e capô",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 12,
      total_value: 1680.00,
      note: "Danos significativos por granizo recente. Seguro irá cobrir.",
      plate: "DEF5678",
      chassisNumber: "WVWZZZ1JZXW123456"
    },
    {
      vehicle_info: "Chevrolet Onix Azul - Amassado no para-lama dianteiro direito",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 2,
      total_value: 280.00,
      note: "Dano pequeno, reparo rápido possível em 1-2 horas.",
      plate: "GHI9012",
      chassisNumber: "9BGKD48U0KG123456"
    },
    {
      vehicle_info: "Honda Civic Preto - Amassados em múltiplos pontos da lataria",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 8,
      total_value: 1120.00,
      note: "Veículo atingido por galhos durante tempestade.",
      plate: "JKL3456",
      chassisNumber: "SHHFK2740KU123456"
    },
    {
      vehicle_info: "Ford Ka Vermelho - Amassado na porta traseira direita",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 3,
      total_value: 420.00,
      note: "Cliente solicitou desconto por ser recorrente.",
      plate: "MNO7890",
      chassisNumber: "9BFZH54L6K8123456"
    },
    {
      vehicle_info: "Hyundai HB20 Prata - Amassado no capô e para-choque",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 4,
      total_value: 560.00,
      note: "Colisão leve em estacionamento.",
      plate: "PQR1234",
      chassisNumber: "9BHBG51NAMP123456"
    },
    {
      vehicle_info: "Renault Sandero Bege - Danos por granizo em toda a parte superior",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 15,
      total_value: 2100.00,
      note: "Veículo bastante afetado por granizo. Necessita avaliação detalhada.",
      plate: "STU5678",
      chassisNumber: "93YBSR7UHEJ123456"
    },
    {
      vehicle_info: "Fiat Argo Cinza - Amassado na porta dianteira direita",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 2,
      total_value: 280.00,
      note: "Dano causado por carrinho de supermercado.",
      plate: "VWX9012",
      chassisNumber: "9BD358A4HLYL123456"
    },
    {
      vehicle_info: "Nissan Kicks Laranja - Amassados múltiplos por granizo",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 10,
      total_value: 1400.00,
      note: "Danos por granizo. Cliente possui seguro.",
      plate: "YZA3456",
      chassisNumber: "94DVSB7L5KP123456"
    },
    {
      vehicle_info: "Jeep Renegade Verde - Amassado no teto e porta-malas",
      date: format(new Date(), "yyyy-MM-dd"),
      total_aw: 6,
      total_value: 840.00,
      note: "Danos causados por queda de objeto. Urgente.",
      plate: "BCD7890",
      chassisNumber: "98866812VCKP123456"
    }
  ];

  // Criar clientes
  const createdClients = [];
  for (const clientData of clientsData) {
    try {
      const [client] = await db.insert(clients).values(clientData).returning();
      console.log(`Cliente criado: ${client.name}`);
      createdClients.push(client);
    } catch (error) {
      console.error(`Erro ao criar cliente ${clientData.name}:`, error);
    }
  }

  // Criar veículos
  for (let i = 0; i < createdClients.length; i++) {
    try {
      const vehicleData = {
        ...vehiclesData[i],
        client_id: createdClients[i].id
      };
      const [vehicle] = await db.insert(vehicles).values(vehicleData).returning();
      console.log(`Veículo criado: ${vehicle.make} ${vehicle.model} para ${createdClients[i].name}`);
    } catch (error) {
      console.error(`Erro ao criar veículo para cliente ${createdClients[i].name}:`, error);
    }
  }

  // Criar orçamentos
  for (let i = 0; i < createdClients.length; i++) {
    try {
      const budgetData = {
        ...budgetsData[i],
        client_id: createdClients[i].id
      };
      const [budget] = await db.insert(budgets).values(budgetData).returning();
      console.log(`Orçamento criado para ${createdClients[i].name}: AW ${budget.total_aw}, Valor ${budget.total_value}`);
    } catch (error) {
      console.error(`Erro ao criar orçamento para cliente ${createdClients[i].name}:`, error);
    }
  }

  // Criar Serviços com Taxa Administrativa
  const currentDate = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Obter todos os veículos para criar serviços
  const allVehicles = await db.select().from(vehicles);
  
  // Apenas para metade dos clientes (5 primeiros) vamos criar serviços
  for (let i = 0; i < 5; i++) {
    try {
      const vehicle = allVehicles[i];
      if (!vehicle) continue;
      
      const budget = budgetsData[i];
      
      // Valor base do serviço
      const basePrice = budget.total_value;
      
      // Taxa administrativa (10% do valor do serviço)
      const administrativeFee = basePrice * 0.10;
      
      // Total (valor base + taxa administrativa)
      const total = basePrice + administrativeFee;
      
      const serviceData = {
        client_id: vehicle.client_id,
        vehicle_id: vehicle.id,
        service_type_id: ((i % 3) + 1), // Alterna entre os 3 tipos de serviço
        technician_id: 2, // ID do João (técnico)
        status: ['completed', 'pending', 'completed', 'pending', 'completed'][i], // Alterna entre status
        description: `Reparo de ${budget.vehicle_info}`,
        scheduled_date: format(currentDate, "yyyy-MM-dd'T'HH:mm:ss"),
        start_date: format(twoWeeksAgo, "yyyy-MM-dd'T'HH:mm:ss"),
        completion_date: ['completed', 'pending', 'completed', 'pending', 'completed'][i] === 'completed' 
          ? format(currentDate, "yyyy-MM-dd'T'HH:mm:ss") 
          : null,
        location_type: i % 2 === 0 ? 'client_location' : 'workshop',
        address: i % 2 === 0 ? clientsData[i].address : 'Oficina Central, Rua Principal, 1000, São Paulo',
        price: basePrice,
        administrative_fee: administrativeFee,
        total: total,
        notes: `Serviço baseado no orçamento. ${budget.note} Taxa administrativa de 10% aplicada.`,
      };
      
      const [service] = await db.insert(services).values(serviceData).returning();
      console.log(`Serviço criado para ${clientsData[i].name}: Valor ${service.price}, Taxa Adm ${service.administrative_fee}, Total ${service.total}`);
    } catch (error) {
      console.error(`Erro ao criar serviço para cliente ${i+1}:`, error);
    }
  }

  console.log("Geração de dados de exemplo concluída!");
}

// Executar a geração de dados
generateSampleData()
  .then(() => {
    console.log("Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });
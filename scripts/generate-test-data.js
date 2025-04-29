// Gerar clientes, técnicos e orçamentos para teste
import fetch from 'node-fetch';

// URLs base
const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Armazenar o cookie de sessão após login
let sessionCookie = '';

// Função para fazer requisições autenticadas
async function apiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    credentials: 'include'
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  // Capturar o cookie de sessão, se disponível
  if (response.headers.get('set-cookie')) {
    sessionCookie = response.headers.get('set-cookie');
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Erro ${response.status}: ${errorText}`);
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null; // No content
  }

  return response.json();
}

// Fazer login como administrador
async function login() {
  try {
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    // Capturar o cookie de sessão
    if (response.headers.get('set-cookie')) {
      sessionCookie = response.headers.get('set-cookie');
      console.log('Login bem-sucedido! Cookie de sessão obtido.');
    }
    
    const userData = await response.json();
    console.log('Logado como:', userData.name);
    return userData;
  } catch (error) {
    console.error('Erro ao fazer login:', error.message);
    throw error;
  }
}

// Gerar técnicos
async function createTechnicians() {
  const technicians = [
    {
      username: 'tecnico1',
      password: '12345678',
      name: 'Técnico Um',
      email: 'tecnico1@exemplo.com',
      phone: '11987654321',
      role: 'technician',
      active: 1
    },
    {
      username: 'tecnico2',
      password: '12345678',
      name: 'Técnico Dois',
      email: 'tecnico2@exemplo.com',
      phone: '11912345678',
      role: 'technician',
      active: 1
    }
  ];

  const createdTechnicians = [];
  
  for (const technician of technicians) {
    try {
      console.log(`Criando técnico: ${technician.name}...`);
      const newTechnician = await apiRequest('/users', 'POST', technician);
      console.log(`Técnico ${technician.name} criado com ID ${newTechnician.id}`);
      createdTechnicians.push(newTechnician);
    } catch (error) {
      console.error(`Erro ao criar técnico ${technician.name}:`, error.message);
    }
  }
  
  return createdTechnicians;
}

// Função para criar clientes
async function createClients() {
  const clients = [
    {
      name: 'Cliente Teste 1',
      email: 'cliente1@exemplo.com',
      phone: '11999887766',
      address: 'Rua Exemplo 1',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zip: '01001-000'
    },
    {
      name: 'Cliente Teste 2',
      email: 'cliente2@exemplo.com',
      phone: '11988776655',
      address: 'Rua Exemplo 2',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP',
      zip: '04001-000'
    },
    {
      name: 'Cliente Teste 3',
      email: 'cliente3@exemplo.com',
      phone: '11977665544',
      address: 'Rua Exemplo 3',
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      zip: '05422-010'
    },
    {
      name: 'Cliente Teste 4',
      email: 'cliente4@exemplo.com',
      phone: '11966554433',
      address: 'Rua Exemplo 4',
      neighborhood: 'Moema',
      city: 'São Paulo',
      state: 'SP',
      zip: '04077-000'
    },
    {
      name: 'Cliente Teste 5',
      email: 'cliente5@exemplo.com',
      phone: '11955443322',
      address: 'Rua Exemplo 5',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
      zip: '04538-132'
    }
  ];

  const createdClients = [];
  
  for (const client of clients) {
    try {
      console.log(`Criando cliente: ${client.name}...`);
      const newClient = await apiRequest('/clients', 'POST', client);
      console.log(`Cliente ${client.name} criado com ID ${newClient.id}`);
      createdClients.push(newClient);
    } catch (error) {
      console.error(`Erro ao criar cliente ${client.name}:`, error.message);
    }
  }
  
  return createdClients;
}

// Função para criar veículos para os clientes
async function createVehicles(clients) {
  const vehicles = [
    { model: 'Onix', brand: 'Chevrolet', year: 2022, plate: 'ABC1234', color: 'Preto' },
    { model: 'HB20', brand: 'Hyundai', year: 2021, plate: 'DEF5678', color: 'Branco' },
    { model: 'Gol', brand: 'Volkswagen', year: 2020, plate: 'GHI9012', color: 'Prata' },
    { model: 'Kwid', brand: 'Renault', year: 2023, plate: 'JKL3456', color: 'Vermelho' },
    { model: 'Argo', brand: 'Fiat', year: 2022, plate: 'MNO7890', color: 'Azul' }
  ];

  const createdVehicles = [];
  
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const vehicle = vehicles[i];
    
    try {
      console.log(`Criando veículo ${vehicle.model} para o cliente ${client.name}...`);
      const newVehicle = await apiRequest(`/clients/${client.id}/vehicles`, 'POST', vehicle);
      console.log(`Veículo ${vehicle.model} (${vehicle.plate}) criado para o cliente ${client.name}`);
      createdVehicles.push({ ...newVehicle, clientId: client.id });
    } catch (error) {
      console.error(`Erro ao criar veículo para cliente ${client.name}:`, error.message);
    }
  }
  
  return createdVehicles;
}

// Função para criar serviços para os veículos
async function createServices(vehicles, technicians) {
  const serviceStatuses = ['pending', 'in_progress', 'completed'];
  const serviceTypes = [1, 2, 3]; // 1=Amassado de Rua, 2=Granizo, 3=Outros
  
  const services = [];
  
  // Distribuir 2 serviços completos entre os técnicos
  const completedVehicles = [vehicles[0], vehicles[1]];
  
  for (let i = 0; i < completedVehicles.length; i++) {
    const vehicle = completedVehicles[i];
    const technician = technicians[i % technicians.length];
    
    try {
      const serviceData = {
        vehicle_id: vehicle.id,
        technician_id: technician.id,
        type_id: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
        status: 'completed',
        price: Math.floor(Math.random() * 500) + 200, // Entre 200 e 700
        administrative_fee: Math.floor(Math.random() * 50) + 20, // Entre 20 e 70
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        description: `Serviço de reparo na ${['porta', 'capô', 'lateral', 'para-choque'][Math.floor(Math.random() * 4)]} do veículo`
      };
      
      console.log(`Criando serviço para o veículo ${vehicle.model} (${vehicle.plate}) com o técnico ${technician.name}...`);
      const newService = await apiRequest(`/clients/${vehicle.clientId}/services`, 'POST', serviceData);
      console.log(`Serviço criado para o veículo ${vehicle.model} (${vehicle.plate}) com status completed`);
      services.push(newService);
    } catch (error) {
      console.error(`Erro ao criar serviço para veículo:`, error.message);
    }
  }
  
  // Criar serviços com status variados para os demais veículos
  for (let i = 2; i < vehicles.length; i++) {
    const vehicle = vehicles[i];
    const technician = technicians[i % technicians.length];
    const status = serviceStatuses[Math.floor(Math.random() * (serviceStatuses.length - 1))]; // Não usar completed
    
    try {
      const serviceData = {
        vehicle_id: vehicle.id,
        technician_id: technician.id,
        type_id: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
        status: status,
        price: Math.floor(Math.random() * 500) + 200,
        administrative_fee: Math.floor(Math.random() * 50) + 20,
        start_date: new Date().toISOString(),
        end_date: status === 'completed' ? new Date().toISOString() : null,
        description: `Serviço de reparo na ${['porta', 'capô', 'lateral', 'para-choque'][Math.floor(Math.random() * 4)]} do veículo`
      };
      
      console.log(`Criando serviço para o veículo ${vehicle.model} (${vehicle.plate}) com o técnico ${technician.name}...`);
      const newService = await apiRequest(`/clients/${vehicle.clientId}/services`, 'POST', serviceData);
      console.log(`Serviço criado para o veículo ${vehicle.model} (${vehicle.plate}) com status ${status}`);
      services.push(newService);
    } catch (error) {
      console.error(`Erro ao criar serviço para veículo:`, error.message);
    }
  }
  
  return services;
}

// Função para criar orçamentos
async function createBudgets(clients, vehicles, services) {
  const budgets = [];
  
  // Criar 2 orçamentos para cada cliente
  for (const client of clients) {
    // Encontrar o veículo deste cliente
    const clientVehicle = vehicles.find(v => v.clientId === client.id);
    
    if (!clientVehicle) {
      console.error(`Veículo não encontrado para o cliente ${client.name}`);
      continue;
    }

    for (let i = 0; i < 2; i++) {
      try {
        const budgetData = {
          vehicle_id: clientVehicle.id,
          total: Math.floor(Math.random() * 1000) + 500, // Entre 500 e 1500
          status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
          notes: `Orçamento ${i+1} para ${client.name}`,
          created_at: new Date().toISOString()
        };
        
        console.log(`Criando orçamento ${i+1} para o cliente ${client.name}...`);
        const newBudget = await apiRequest(`/clients/${client.id}/budgets`, 'POST', budgetData);
        console.log(`Orçamento ${i+1} criado para o cliente ${client.name}`);
        budgets.push(newBudget);
      } catch (error) {
        console.error(`Erro ao criar orçamento para cliente ${client.name}:`, error.message);
      }
    }
  }
  
  return budgets;
}

// Executar o script principal
async function main() {
  try {
    console.log("Iniciando geração de dados de teste...");
    
    // Login para obter sessão
    await login();
    
    // Criar técnicos
    const technicians = await createTechnicians();
    console.log(`${technicians.length} técnicos criados com sucesso!`);
    
    // Criar clientes
    const clients = await createClients();
    console.log(`${clients.length} clientes criados com sucesso!`);
    
    // Criar veículos para os clientes
    const vehicles = await createVehicles(clients);
    console.log(`${vehicles.length} veículos criados com sucesso!`);
    
    // Criar serviços, 2 com status completed
    const services = await createServices(vehicles, technicians);
    console.log(`${services.length} serviços criados com sucesso!`);
    
    // Criar 2 orçamentos para cada cliente
    const budgets = await createBudgets(clients, vehicles, services);
    console.log(`${budgets.length} orçamentos criados com sucesso!`);
    
    console.log("\nGeração de dados de teste concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a geração de dados:", error);
  }
}

// Executar o script
main();
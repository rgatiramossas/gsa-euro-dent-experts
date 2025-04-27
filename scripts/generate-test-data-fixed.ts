import { db } from '../server/db';
import { users, clients, vehicles, services, serviceTypes, servicePhotos, budgets } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Arrays para dados aleatórios
const names = [
  "João Silva", "Maria Oliveira", "Carlos Santos", "Ana Pereira", "Pedro Costa", 
  "Marta Ferreira", "Lucas Rodrigues", "Sofia Almeida", "Bruno Martins", "Camila Gomes",
  "Ricardo Fernandes", "Beatriz Lima", "Tiago Carvalho", "Catarina Sousa", "André Ribeiro"
];

const surnames = [
  "Silva", "Oliveira", "Santos", "Pereira", "Costa", 
  "Ferreira", "Rodrigues", "Almeida", "Martins", "Gomes",
  "Fernandes", "Lima", "Carvalho", "Sousa", "Ribeiro"
];

const cities = [
  "Lisboa", "Porto", "Coimbra", "Braga", "Faro", 
  "Aveiro", "Setúbal", "Viseu", "Funchal", "Évora"
];

const streets = [
  "Rua Principal", "Avenida Central", "Praça da República", "Rua das Flores", "Avenida da Liberdade", 
  "Rua do Comércio", "Avenida Marginal", "Rua da Paz", "Avenida dos Aliados", "Rua Augusta"
];

const companies = [
  "Auto Lusitana", "Carros & Cia", "Mecânica Express", "AutoTech", "Oficina Rápida", 
  "Motor Portugal", "Reparo Total", "Car Service", "Auto Elite", "Mecânicos Unidos"
];

const carBrands = [
  "BMW", "Mercedes", "Audi", "Volkswagen", "Toyota", 
  "Renault", "Peugeot", "Ford", "Honda", "Nissan"
];

const carModels = [
  "X5", "Classe C", "A4", "Golf", "Corolla", 
  "Clio", "208", "Focus", "Civic", "Qashqai"
];

const colors = [
  "Preto", "Branco", "Prata", "Azul", "Vermelho", 
  "Cinza", "Verde", "Amarelo", "Marrom", "Bege"
];

const licensePlateFormat = [
  "XX-XX-XX", "XX-XX-XXX", "XX-XXX-XX"
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomPhone(): string {
  return `9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
}

function randomLicensePlate(): string {
  const format = randomItem(licensePlateFormat);
  return format.replace(/X/g, () => Math.floor(Math.random() * 10).toString());
}

function randomChassisNumber(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

function randomYear(): number {
  return Math.floor(2010 + Math.random() * 14); // Anos entre 2010 e 2023
}

function randomEmail(name: string): string {
  return `${name.toLowerCase().replace(' ', '.')}@example.com`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getRandomImageAsBase64(): Promise<string> {
  // Lista de arquivos de imagem disponíveis na pasta 'attached_assets'
  const imageDir = path.join(__dirname, '../attached_assets');
  const imageFiles = fs.readdirSync(imageDir).filter(file => 
    file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
  );
  
  if (imageFiles.length === 0) {
    throw new Error('Nenhuma imagem encontrada na pasta attached_assets');
  }
  
  // Seleciona uma imagem aleatória
  const randomImage = randomItem(imageFiles);
  const imagePath = path.join(imageDir, randomImage);
  
  // Lê o arquivo como Buffer e converte para base64
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  // Determina o tipo MIME baseado na extensão
  let mimeType = 'image/jpeg';
  if (randomImage.endsWith('.png')) {
    mimeType = 'image/png';
  }
  
  // Retorna a string base64 com o prefixo adequado para uso em data URLs
  return `data:${mimeType};base64,${imageBase64}`;
}

async function generateTestData() {
  console.log('Iniciando geração de dados de teste...');
  
  try {
    // Verificar se já existem alguns dados
    const existingClients = await db.select().from(clients);
    if (existingClients.length > 0) {
      console.log(`Já existem ${existingClients.length} clientes. Pulando a geração de dados.`);
      return;
    }
    
    // Obter usuários existentes (presumimos que já foram criados)
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      console.log('Nenhum usuário encontrado. Por favor, crie usuários primeiro.');
      return;
    }
    
    // Criar tipos de serviço
    const serviceTypeIds = await createServiceTypes();
    
    // Criar 10 clientes
    const clientIds = [];
    for (let i = 0; i < 10; i++) {
      const firstName = randomItem(names).split(' ')[0];
      const lastName = randomItem(surnames);
      const clientName = `${firstName} ${lastName}`;
      const isCompany = Math.random() > 0.7;
      
      const clientData = {
        name: isCompany ? randomItem(companies) : clientName,
        phone: randomPhone(),
        email: randomEmail(clientName),
        address: `${randomItem(streets)}, ${Math.floor(Math.random() * 100)}, ${randomItem(cities)}`,
        notes: isCompany ? `Empresa com vários veículos` : `Cliente particular`,
        created_at: new Date(),
      };
      
      const [newClient] = await db.insert(clients).values(clientData).returning();
      clientIds.push(newClient.id);
      console.log(`Cliente criado: ${newClient.name}`);
      
      // Criar 2-3 veículos para cada cliente
      const vehicleCount = Math.floor(2 + Math.random() * 2);
      const vehicleIds = [];
      
      for (let j = 0; j < vehicleCount; j++) {
        const brand = randomItem(carBrands);
        const model = randomItem(carModels);
        const year = randomYear();
        const color = randomItem(colors);
        
        const vehicleData = {
          client_id: newClient.id,
          make: brand,
          model,
          color,
          license_plate: randomLicensePlate(),
          vin: randomChassisNumber(),
          notes: `${brand} ${model} ${year} ${color}`,
        };
        
        const [newVehicle] = await db.insert(vehicles).values(vehicleData).returning();
        vehicleIds.push(newVehicle.id);
        console.log(`  Veículo criado: ${newVehicle.make} ${newVehicle.model}`);
      }
      
      // Criar 2 orçamentos para cada cliente
      for (let j = 0; j < 2; j++) {
        const totalAw = Math.floor(100 + Math.random() * 200);
        const totalValue = parseFloat((totalAw * 2.8).toFixed(2));
        const randomImg = await getRandomImageAsBase64();
        
        const budgetData = {
          client_id: newClient.id,
          vehicle_info: `${randomItem(carBrands)} ${randomItem(carModels)} ${randomYear()}`,
          date: formatDate(randomDate(new Date('2023-01-01'), new Date())),
          total_aw: totalAw,
          total_value: totalValue,
          photo_url: randomImg,
          note: `Orçamento para reparo de danos por granizo`,
          plate: randomLicensePlate(),
          chassisNumber: randomChassisNumber(),
        };
        
        const [newBudget] = await db.insert(budgets).values(budgetData).returning();
        console.log(`  Orçamento criado: #${newBudget.id}`);
      }
      
      // Criar 2 serviços para cada cliente (1 para cada veículo, se possível)
      for (let j = 0; j < Math.min(2, vehicleIds.length); j++) {
        const technicianId = randomItem(existingUsers).id;
        const serviceTypeId = randomItem(serviceTypeIds);
        
        const startDate = randomDate(new Date('2023-01-01'), new Date());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 20));
        
        const statusOptions = ['pending', 'em_progresso', 'concluido'];
        const status = randomItem(statusOptions);
        
        const serviceData = {
          client_id: newClient.id,
          vehicle_id: vehicleIds[j],
          technician_id: technicianId,
          service_type_id: serviceTypeId,
          status,
          location_type: Math.random() > 0.5 ? 'oficina' : 'remoto',
          address: Math.random() > 0.5 ? `${randomItem(streets)}, ${Math.floor(Math.random() * 100)}, ${randomItem(cities)}` : null,
          scheduled_date: formatDate(startDate),
          completion_date: status === 'concluido' ? formatDate(endDate) : null,
          total: Math.floor(150 + Math.random() * 500),
          description: `Serviço de reparação de danos por granizo`,
          notes: `Notas adicionais sobre o serviço`,
        };
        
        const [newService] = await db.insert(services).values(serviceData).returning();
        console.log(`  Serviço criado: #${newService.id}`);
        
        // Adicionar 2-3 fotos para cada serviço
        const photoCount = Math.floor(2 + Math.random() * 2);
        for (let k = 0; k < photoCount; k++) {
          const photoTypes = ['before', 'during', 'after'];
          const photoImg = await getRandomImageAsBase64();
          
          const photoData = {
            service_id: newService.id,
            photo_type: randomItem(photoTypes),
            photo_url: photoImg,
          };
          
          const [newPhoto] = await db.insert(servicePhotos).values(photoData).returning();
          console.log(`    Foto adicionada: #${newPhoto.id}`);
        }
      }
    }
    
    console.log('Geração de dados de teste concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar dados de teste:', error);
  }
}

async function createServiceTypes() {
  // Verificar se já existem tipos de serviço
  const existingTypes = await db.select().from(serviceTypes);
  if (existingTypes.length > 0) {
    return existingTypes.map(type => type.id);
  }
  
  // Tipos de serviço para inserir
  const typesToInsert = [
    { name: 'Reparo de Granizo', description: 'Reparo de danos causados por granizo' },
    { name: 'Pintura', description: 'Serviço de pintura automotiva' },
    { name: 'Polimento', description: 'Polimento de carroceria' },
    { name: 'Reparo de Amassados', description: 'Reparação de amassados sem danificar a pintura' },
    { name: 'Manutenção Preventiva', description: 'Verificação geral e manutenção preventiva' }
  ];
  
  const insertedIds: number[] = [];
  for (const type of typesToInsert) {
    const [newType] = await db.insert(serviceTypes).values(type).returning();
    insertedIds.push(newType.id);
    console.log(`Tipo de serviço criado: ${newType.name}`);
  }
  
  return insertedIds;
}

// Executar a função
generateTestData().then(() => {
  console.log('Script finalizado.');
  process.exit(0);
}).catch(err => {
  console.error('Erro ao executar script:', err);
  process.exit(1);
});
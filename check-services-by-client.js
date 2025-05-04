/**
 * Script para verificar os serviços por cliente
 * Ajuda a identificar serviços associados a um cliente específico
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Configuração do banco de dados
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

async function checkServicesForClient(clientId) {
  try {
    console.log(`\n== Verificando serviços para cliente ID ${clientId} ==`);
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar informações do cliente
    const [clientRows] = await connection.query(
      'SELECT * FROM clients WHERE id = ?', 
      [clientId]
    );
    
    if (clientRows.length === 0) {
      console.log(`⚠️ Cliente ID ${clientId} não encontrado!`);
      await connection.end();
      return;
    }
    
    const client = clientRows[0];
    console.log(`Cliente: ${client.name} (ID: ${client.id})`);
    
    // Verificar atribuição de gestores
    const [managerRows] = await connection.query(
      `SELECT u.id, u.name, u.username, u.role
       FROM manager_client_assignments mca
       JOIN users u ON mca.manager_id = u.id
       WHERE mca.client_id = ?`,
      [clientId]
    );
    
    console.log(`\n== Gestores atribuídos a este cliente (${managerRows.length}) ==`);
    if (managerRows.length === 0) {
      console.log("⚠️ Este cliente não está atribuído a nenhum gestor!");
    } else {
      managerRows.forEach(manager => {
        console.log(`- ${manager.name} (${manager.username}, ID: ${manager.id}, Função: ${manager.role})`);
      });
    }
    
    // Verificar serviços do cliente
    const [serviceRows] = await connection.query(
      `SELECT s.*, st.name as service_type_name, u.name as technician_name
       FROM services s
       LEFT JOIN service_types st ON s.service_type_id = st.id
       LEFT JOIN users u ON s.technician_id = u.id
       WHERE s.client_id = ? AND s.status != 'deleted'
       ORDER BY s.id DESC`,
      [clientId]
    );
    
    console.log(`\n== Serviços para o cliente (${serviceRows.length}) ==`);
    if (serviceRows.length === 0) {
      console.log("⚠️ Este cliente não possui serviços!");
    } else {
      serviceRows.forEach(service => {
        console.log(`- ID: ${service.id}, Tipo: ${service.service_type_name}, Status: ${service.status}`);
        console.log(`  Técnico: ${service.technician_name || 'Não atribuído'}`);
        console.log(`  Preço: ${service.price}, Total: ${service.total}`);
        console.log(`  Criado em: ${service.created_at}`);
        console.log('  ---------------------------------');
      });
    }
    
    // Verificar veículos do cliente
    const [vehicleRows] = await connection.query(
      'SELECT * FROM vehicles WHERE client_id = ?',
      [clientId]
    );
    
    console.log(`\n== Veículos do cliente (${vehicleRows.length}) ==`);
    if (vehicleRows.length === 0) {
      console.log("⚠️ Este cliente não possui veículos cadastrados!");
    } else {
      vehicleRows.forEach(vehicle => {
        console.log(`- ${vehicle.make} ${vehicle.model} (${vehicle.year || 'Ano N/A'}), Placa: ${vehicle.license_plate || 'N/A'}`);
      });
    }
    
    await connection.end();
    console.log("\nVerificação concluída!");
    
  } catch (error) {
    console.error('Erro ao verificar serviços do cliente:', error);
  }
}

async function addClientToManager(clientId, managerId) {
  try {
    console.log(`\n== Atribuindo cliente ID ${clientId} ao gestor ID ${managerId} ==`);
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar se o cliente existe
    const [clientRows] = await connection.query(
      'SELECT * FROM clients WHERE id = ?', 
      [clientId]
    );
    
    if (clientRows.length === 0) {
      console.log(`⚠️ Cliente ID ${clientId} não encontrado!`);
      await connection.end();
      return;
    }
    
    // Verificar se o gestor existe
    const [managerRows] = await connection.query(
      'SELECT * FROM users WHERE id = ? AND (role = "gestor" OR role = "manager")', 
      [managerId]
    );
    
    if (managerRows.length === 0) {
      console.log(`⚠️ Gestor ID ${managerId} não encontrado ou não é um gestor!`);
      await connection.end();
      return;
    }
    
    // Verificar se já existe atribuição
    const [assignmentRows] = await connection.query(
      'SELECT * FROM manager_client_assignments WHERE manager_id = ? AND client_id = ?',
      [managerId, clientId]
    );
    
    if (assignmentRows.length > 0) {
      console.log(`⚠️ Cliente ID ${clientId} já está atribuído ao gestor ID ${managerId}!`);
      await connection.end();
      return;
    }
    
    // Criar atribuição
    await connection.query(
      'INSERT INTO manager_client_assignments (manager_id, client_id) VALUES (?, ?)',
      [managerId, clientId]
    );
    
    console.log(`✅ Cliente ID ${clientId} (${clientRows[0].name}) atribuído com sucesso ao gestor ID ${managerId} (${managerRows[0].name})!`);
    
    await connection.end();
  } catch (error) {
    console.error('Erro ao atribuir cliente ao gestor:', error);
  }
}

async function createServiceForClient(clientId, vehicleId, serviceTypeId) {
  try {
    console.log(`\n== Criando serviço para cliente ID ${clientId} ==`);
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar se o cliente existe
    const [clientRows] = await connection.query(
      'SELECT * FROM clients WHERE id = ?', 
      [clientId]
    );
    
    if (clientRows.length === 0) {
      console.log(`⚠️ Cliente ID ${clientId} não encontrado!`);
      await connection.end();
      return;
    }
    
    // Verificar se o veículo existe
    const [vehicleRows] = await connection.query(
      'SELECT * FROM vehicles WHERE id = ? AND client_id = ?', 
      [vehicleId, clientId]
    );
    
    if (vehicleRows.length === 0) {
      console.log(`⚠️ Veículo ID ${vehicleId} não encontrado ou não pertence ao cliente ${clientId}!`);
      await connection.end();
      return;
    }
    
    // Verificar se o tipo de serviço existe
    const [serviceTypeRows] = await connection.query(
      'SELECT * FROM service_types WHERE id = ?', 
      [serviceTypeId]
    );
    
    if (serviceTypeRows.length === 0) {
      console.log(`⚠️ Tipo de serviço ID ${serviceTypeId} não encontrado!`);
      await connection.end();
      return;
    }
    
    // Criar serviço
    const serviceType = serviceTypeRows[0];
    await connection.query(
      `INSERT INTO services 
       (client_id, vehicle_id, service_type_id, status, price, total, created_at) 
       VALUES (?, ?, ?, 'pending', ?, ?, NOW())`,
      [clientId, vehicleId, serviceTypeId, serviceType.default_price, serviceType.default_price]
    );
    
    const [result] = await connection.query('SELECT LAST_INSERT_ID() as id');
    const serviceId = result[0].id;
    
    console.log(`✅ Serviço ID ${serviceId} criado com sucesso!`);
    console.log(`Cliente: ${clientRows[0].name}`);
    console.log(`Veículo: ${vehicleRows[0].make} ${vehicleRows[0].model}`);
    console.log(`Tipo de serviço: ${serviceType.name}`);
    console.log(`Preço: ${serviceType.default_price}`);
    
    await connection.end();
    return serviceId;
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
  }
}

// Verifique os serviços do cliente ID 5 (Otavio Guedes)
await checkServicesForClient(5);

// Verifique se o gestor ID 9 (CLIENTE TESTE) está associado ao cliente 5
// Se não estiver, crie a associação
await addClientToManager(5, 9);

// Verifique os serviços novamente após atribuição
await checkServicesForClient(5);
import mysql from 'mysql2/promise';

async function testCreateVehicle() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    const connection = await mysql.createConnection(process.env.DATABASE_URL || '');
    console.log('Conectado ao MySQL.');
    
    // Listar tabelas
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tabelas existentes:', JSON.stringify(tables));
    
    // Verificar se a tabela vehicles existe e criá-la se necessário
    const [vehiclesTableCheck] = await connection.query("SHOW TABLES LIKE 'vehicles'");
    if ((vehiclesTableCheck as any[]).length === 0) {
      console.log('Tabela vehicles não existe, criando...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          make VARCHAR(255) NOT NULL,
          model VARCHAR(255) NOT NULL,
          color VARCHAR(255),
          license_plate VARCHAR(255),
          vin VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      console.log('Tabela vehicles criada com sucesso!');
    } else {
      console.log('Tabela vehicles já existe.');
    }
    
    // Testar inserção de um veículo
    const vehicleData = {
      client_id: 1,
      make: 'TESTE',
      model: 'TESTE',
      color: 'TESTE',
      license_plate: 'TESTE123'
    };
    
    const fields = Object.keys(vehicleData).join(', ');
    const placeholders = Object.keys(vehicleData).map(() => '?').join(', ');
    const values = Object.values(vehicleData);
    
    console.log(`Executando: INSERT INTO vehicles (${fields}) VALUES (${placeholders})`);
    console.log('Valores:', values);
    
    const [result] = await connection.query(`INSERT INTO vehicles (${fields}) VALUES (${placeholders})`, values);
    console.log('Resultado da inserção:', JSON.stringify(result));
    console.log('insertId:', (result as any).insertId);
    console.log('Tipo de insertId:', typeof (result as any).insertId);
    
    // Buscar o veículo inserido
    const [vehicles] = await connection.query('SELECT * FROM vehicles WHERE id = ?', [(result as any).insertId]);
    console.log('Veículo inserido:', (vehicles as any[])[0]);
    
    await connection.end();
    console.log('Conexão fechada.');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

testCreateVehicle();
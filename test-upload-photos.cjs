require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Função para testar o upload de fotos e verificar o funcionamento
async function testPhotoUpload() {
  let pool;
  try {
    // 1. Conectar ao banco de dados
    pool = await mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    
    console.log("Conexão com o banco de dados estabelecida com sucesso.");
    
    // 2. Verificar se a tabela service_photos existe
    const [tableResult] = await pool.query("SHOW TABLES LIKE 'service_photos'");
    if (tableResult.length === 0) {
      console.log("Tabela service_photos não existe, criando...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS service_photos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          service_id INT NOT NULL,
          photo_url VARCHAR(255) NOT NULL,
          photo_type VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )
      `);
      console.log("Tabela service_photos criada com sucesso!");
    } else {
      console.log("A tabela service_photos já existe.");
    }
    
    // 3. Verificar a estrutura da tabela
    const [columns] = await pool.query("SHOW COLUMNS FROM service_photos");
    console.log("Estrutura da tabela service_photos:");
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'Nullable' : 'Not Null'})`);
    });
    
    // 4. Criar diretórios de upload se não existirem
    const uploadsDir = './uploads';
    const serviceDir = path.join(uploadsDir, 'service');
    const testFile = path.join(serviceDir, 'test-image.jpg');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Diretório ${uploadsDir} criado.`);
    }
    
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
      console.log(`Diretório ${serviceDir} criado.`);
    }
    
    // 5. Criar um arquivo de teste (1x1 pixel JPG) se não existir
    if (!fs.existsSync(testFile)) {
      // Este é um JPEG mínimo válido (1x1 pixel)
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 
        0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9
      ]);
      
      fs.writeFileSync(testFile, minimalJpeg);
      console.log(`Arquivo de teste ${testFile} criado.`);
    } else {
      console.log(`Arquivo de teste ${testFile} já existe.`);
    }
    
    // 6. Buscar um serviço para associar a foto
    const [services] = await pool.query("SELECT id FROM services LIMIT 1");
    if (services.length === 0) {
      console.error("Não há serviços disponíveis para teste. Crie um serviço primeiro.");
      return;
    }
    
    const serviceId = services[0].id;
    console.log(`Usando serviço ID: ${serviceId} para teste`);
    
    // 7. Inserir uma foto de teste
    const photoUrl = `/uploads/service/test-image.jpg`;
    const [existingPhoto] = await pool.query(
      "SELECT * FROM service_photos WHERE service_id = ? AND photo_url = ?",
      [serviceId, photoUrl]
    );
    
    if (existingPhoto && existingPhoto.length > 0) {
      console.log("A foto de teste já existe para este serviço:", existingPhoto[0]);
    } else {
      const [result] = await pool.query(
        "INSERT INTO service_photos (service_id, photo_type, photo_url) VALUES (?, ?, ?)",
        [serviceId, 'service', photoUrl]
      );
      
      console.log("Foto de teste inserida com sucesso!");
      console.log("Resultado da inserção:", result);
      
      // Verificar se a foto foi realmente inserida
      const [photoCheck] = await pool.query(
        "SELECT * FROM service_photos WHERE id = ?",
        [result.insertId]
      );
      
      console.log("Foto inserida:", photoCheck[0]);
    }
    
    // 8. Verificar todas as fotos deste serviço
    const [photos] = await pool.query(
      "SELECT * FROM service_photos WHERE service_id = ?",
      [serviceId]
    );
    
    console.log(`\nTotal de fotos para o serviço ${serviceId}: ${photos.length}`);
    photos.forEach(photo => {
      console.log(`- ID: ${photo.id}, Tipo: ${photo.photo_type}, URL: ${photo.photo_url}, Data: ${photo.created_at}`);
    });
    
    console.log("\nTeste concluído com sucesso!");
    
  } catch (error) {
    console.error("Erro durante o teste:", error);
  } finally {
    if (pool) {
      await pool.end();
      console.log("Conexão com o banco de dados fechada.");
    }
  }
}

// Executar o teste
testPhotoUpload();
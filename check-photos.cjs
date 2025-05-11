// CommonJS format
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPhotos() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    
    console.log('Conexão estabelecida com o banco de dados.');
    
    // Verificar fotos existentes
    const [photos] = await connection.query('SELECT * FROM service_photos');
    console.log(`Total de fotos encontradas: ${photos.length}`);
    
    if (photos.length > 0) {
      console.log('\nPrimeiras 3 fotos:');
      photos.slice(0, 3).forEach(photo => {
        console.log(photo);
      });
    }
    
    // Verificar se a pasta uploads existe
    const fs = require('fs');
    if (fs.existsSync('./uploads')) {
      console.log('\nPasta uploads existe.');
      
      // Listar arquivos na pasta uploads
      const files = fs.readdirSync('./uploads', { withFileTypes: true });
      console.log(`Total de itens na pasta uploads: ${files.length}`);
      
      // Contar arquivos e diretórios
      const directories = files.filter(file => file.isDirectory()).map(dir => dir.name);
      console.log(`Diretórios: ${directories.join(', ') || 'Nenhum'}`);
      
      // Verificar se há pasta service
      if (directories.includes('service')) {
        const serviceFiles = fs.readdirSync('./uploads/service');
        console.log(`\nArquivos na pasta service: ${serviceFiles.length}`);
        if (serviceFiles.length > 0) {
          console.log('Primeiros 5 arquivos:');
          serviceFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
        }
      }
    } else {
      console.log('\nPasta uploads não existe.');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexão fechada.');
    }
  }
}

checkPhotos();
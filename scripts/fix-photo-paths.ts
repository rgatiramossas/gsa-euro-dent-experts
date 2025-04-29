import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Diretório de uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// Diretórios a verificar
const DIRECTORIES = ['service', 'before', 'after'];

// Configuração da conexão MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
};

// Pool de conexões
let pool: mysql.Pool | null = null;

async function main() {
  console.log('Iniciando correção de caminhos de fotos...');
  
  try {
    // Criar pool de conexões
    pool = mysql.createPool(dbConfig);
    console.log('Conexão com MySQL estabelecida.');
    
    // Obter todas as fotos do banco de dados
    const allPhotos = await getAllPhotos();
    console.log(`Total de ${allPhotos.length} fotos encontradas no banco de dados`);
    
    // Verificar cada foto
    for (const photo of allPhotos) {
      await verifyAndFixPhoto(photo);
    }
    
    console.log('Processo concluído!');
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    // Encerrar a conexão com o banco de dados
    if (pool) {
      await pool.end();
      console.log('Conexão com MySQL encerrada.');
    }
    process.exit(0);
  }
}

async function getAllPhotos() {
  if (!pool) throw new Error('Pool de conexão não disponível');
  
  try {
    // Buscar todas as fotos diretamente
    const [rows] = await pool.query('SELECT * FROM service_photos');
    return rows as any[];
  } catch (error) {
    console.error('Erro ao buscar fotos:', error);
    return [];
  }
}

async function verifyAndFixPhoto(photo: any) {
  const photoUrl = photo.photo_url;
  console.log(`\nVerificando foto: ${photoUrl}`);
  
  // Extrair nome do arquivo e diretório do photoUrl
  const urlParts = photoUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  const currentDir = urlParts[urlParts.length - 2];
  
  // Caminho do arquivo físico baseado no banco de dados
  const physicalPath = path.join(UPLOADS_DIR, currentDir, filename);
  
  // Verificar se o arquivo físico existe no caminho indicado pelo banco de dados
  if (fs.existsSync(physicalPath)) {
    console.log(`  ✓ Arquivo encontrado no caminho correto: ${physicalPath}`);
    return; // Tudo certo, não precisa corrigir
  }
  
  console.log(`  ✗ Arquivo não encontrado em: ${physicalPath}`);
  
  // Se não existir, procurar em todos os diretórios
  let found = false;
  let correctDir = '';
  
  for (const dir of DIRECTORIES) {
    if (dir === currentDir) continue; // Já verificamos este diretório
    
    const alternatePath = path.join(UPLOADS_DIR, dir, filename);
    if (fs.existsSync(alternatePath)) {
      found = true;
      correctDir = dir;
      console.log(`  ✓ Arquivo encontrado em diretório alternativo: ${alternatePath}`);
      break;
    }
  }
  
  if (!found) {
    console.log(`  ! Arquivo não encontrado em nenhum diretório, não é possível corrigir`);
    return;
  }
  
  // Corrigir o caminho no banco de dados
  const correctedUrl = `/uploads/${correctDir}/${filename}`;
  console.log(`  Atualizando no banco de dados para: ${correctedUrl}`);
  
  try {
    await updatePhotoUrlInDatabase(photo.id, correctedUrl);
    console.log(`  ✓ Caminho atualizado com sucesso`);
  } catch (error) {
    console.error(`  ✗ Erro ao atualizar caminho:`, error);
  }
}

async function updatePhotoUrlInDatabase(photoId: number, newUrl: string) {
  // Esta função usa o pool configurado globalmente
  try {
    if (!pool) {
      throw new Error("Pool de conexão MySQL não disponível");
    }
    
    await pool.query(
      "UPDATE service_photos SET photo_url = ? WHERE id = ?",
      [newUrl, photoId]
    );
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar URL da foto:", error);
    throw error;
  }
}

main().catch(error => {
  console.error('Erro durante a execução do script:', error);
  process.exit(1);
});
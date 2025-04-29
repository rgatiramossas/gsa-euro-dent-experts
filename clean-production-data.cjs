/**
 * Script para limpar dados de teste e preparar para ambiente de produção
 * Mantém apenas os usuários
 */

// Importar módulos
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do banco de dados
const config = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

// Função para limpar arquivos de upload
const cleanUploads = async () => {
  const uploadDirs = ['./uploads/service', './uploads/vehicle', './uploads/client'];
  
  // Processando cada diretório
  for (const dir of uploadDirs) {
    if (fs.existsSync(dir)) {
      console.log(`Limpando diretório ${dir}...`);
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // Não exclui o arquivo .gitkeep
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(dir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Removido: ${filePath}`);
        } catch (error) {
          console.error(`Erro ao remover ${filePath}:`, error);
        }
      }
      
      // Garantir que cada diretório tenha um .gitkeep
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        console.log(`Criado arquivo .gitkeep em ${dir}`);
      }
    } else {
      // Criar diretório se não existir
      console.log(`Criando diretório ${dir}...`);
      fs.mkdirSync(dir, { recursive: true });
      
      // Criar .gitkeep
      const gitkeepPath = path.join(dir, '.gitkeep');
      fs.writeFileSync(gitkeepPath, '');
      console.log(`Criado arquivo .gitkeep em ${dir}`);
    }
  }
  
  console.log('Limpeza de uploads concluída.');
};

// Função principal
const cleanProduction = async () => {
  console.log('=== PREPARANDO BANCO DE DADOS PARA PRODUÇÃO ===');
  console.log(`Conectando ao MySQL: ${config.host}/${config.database}`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('Conexão estabelecida.');
    
    // Lista de tabelas para verificar e limpar
    const tables = [
      'services',
      'service_photos',
      'budgets',
      'vehicles',
      'clients',
      'tasks',
      'notes',
      'payment_orders',
      'payments',
      'expenses'
    ];
    
    // Desativar verificação de chaves estrangeiras temporariamente
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Verificando tabelas existentes
    console.log('\nTabelas existentes:');
    const [existingTables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [config.database]);
    
    const existingTableNames = existingTables.map(t => t.TABLE_NAME || t.table_name);
    console.log(existingTableNames.join(', '));
    
    // Truncar cada tabela se existir
    for (const table of tables) {
      if (existingTableNames.includes(table)) {
        console.log(`Limpando tabela: ${table}`);
        await connection.query(`TRUNCATE TABLE ${table}`);
      } else {
        console.log(`Tabela ${table} não existe, pulando...`);
      }
    }
    
    // Reativar verificação de chaves estrangeiras
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Mostrar estatísticas após a limpeza
    console.log('\n=== ESTATÍSTICAS APÓS LIMPEZA ===');
    for (const table of [...tables, 'users']) {
      if (existingTableNames.includes(table)) {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${result[0].count} registros`);
      } else {
        console.log(`${table}: tabela não existe`);
      }
    }
    
    // Limpar diretórios de upload
    await cleanUploads();
    
    console.log('\n=== BANCO DE DADOS PREPARADO PARA PRODUÇÃO ===');
    console.log('Todos os dados de teste foram removidos.');
    console.log('Apenas os usuários foram mantidos no sistema.');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão encerrada.');
    }
  }
};

// Executar o script
cleanProduction();
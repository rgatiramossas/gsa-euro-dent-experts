/**
 * Script para preparar o banco de dados para ambiente de produção
 * Este script limpa todos os dados de teste, mantendo apenas os usuários
 */

require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

// Configuração do banco de dados a partir de variáveis de ambiente
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
};

// Função para limpar arquivos de upload
const cleanUploadFiles = async () => {
  console.log('\n--- Limpando arquivos de upload ---');
  
  // Diretórios a serem limpos
  const directories = [
    './uploads/service',
    './uploads/vehicle',
    './uploads/client'
  ];
  
  // Manter um arquivo .gitkeep em cada diretório
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      console.log(`Limpando diretório: ${dir}`);
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // Pular arquivos .gitkeep
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(dir, file);
        fs.unlinkSync(filePath);
        console.log(`Arquivo removido: ${filePath}`);
      }
      
      // Criar .gitkeep se não existir
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        console.log(`Criado: ${gitkeepPath}`);
      }
    } else {
      console.log(`Criando diretório: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      
      // Criar .gitkeep
      const gitkeepPath = path.join(dir, '.gitkeep');
      fs.writeFileSync(gitkeepPath, '');
      console.log(`Criado: ${gitkeepPath}`);
    }
  }
  
  console.log('Limpeza de arquivos concluída.');
};

// Função principal para limpar o banco de dados
const cleanDatabase = async () => {
  console.log('\n--- Preparando banco de dados para produção ---');
  console.log('Conectando ao MySQL...');
  
  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection(dbConfig);
    console.log('Conexão estabelecida.');
    
    // Ler script SQL
    const sqlScript = fs.readFileSync('./clean-production-database.sql', 'utf8');
    
    // Dividir script em comandos individuais
    const commands = sqlScript
      .split(';')
      .map(command => command.trim())
      .filter(command => command.length > 0);
    
    console.log(`Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (const command of commands) {
      await connection.query(command + ';');
    }
    
    console.log('Comandos SQL executados com sucesso.');
    
    // Verificar contagens
    const [rows] = await connection.query(`
      SELECT 'payments' as table_name, COUNT(*) as count FROM payments UNION
      SELECT 'expenses', COUNT(*) FROM expenses UNION
      SELECT 'payment_orders', COUNT(*) FROM payment_orders UNION
      SELECT 'service_photos', COUNT(*) FROM service_photos UNION
      SELECT 'services', COUNT(*) FROM services UNION
      SELECT 'budgets', COUNT(*) FROM budgets UNION
      SELECT 'vehicles', COUNT(*) FROM vehicles UNION
      SELECT 'clients', COUNT(*) FROM clients UNION
      SELECT 'tasks', COUNT(*) FROM tasks UNION
      SELECT 'notes', COUNT(*) FROM notes UNION
      SELECT 'users', COUNT(*) FROM users;
    `);
    
    console.log('\n--- Resultado da limpeza ---');
    console.log('Tabela\t\tRegistros');
    console.log('-------------------------');
    
    rows.forEach(row => {
      console.log(`${row.table_name}\t\t${row.count}`);
    });
    
    await cleanUploadFiles();
    
    console.log('\n--- BANCO DE DADOS PRONTO PARA PRODUÇÃO ---');
    console.log('Todos os dados de teste foram removidos.');
    console.log('Apenas os usuários foram mantidos no sistema.');
    
  } catch (error) {
    console.error('Erro ao limpar banco de dados:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com o banco de dados encerrada.');
    }
  }
};

// Executar o script
cleanDatabase();
// Script temporário para limpar serviços de teste
const express = require('express');
const router = express.Router();
const { mysqlDb } = require('./db-mysql');

// Rota para listar todos os serviços
router.get('/list', async (req, res) => {
  try {
    const connection = await mysqlDb.getConnection();
    const [services] = await connection.query('SELECT id, client_id, service_type_id, status, created_at FROM services ORDER BY id DESC');
    connection.release();
    
    res.json(services);
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

// Rota para excluir serviços por ID
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysqlDb.getConnection();
    
    const [result] = await connection.query('DELETE FROM services WHERE id = ?', [id]);
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json({ message: `Serviço ID ${id} excluído com sucesso` });
  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    res.status(500).json({ error: 'Erro ao excluir serviço' });
  }
});

// Rota para excluir todos os serviços com ID acima de um valor
router.delete('/delete-above/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysqlDb.getConnection();
    
    // Obter os IDs a serem excluídos para registro
    const [servicesToDelete] = await connection.query('SELECT id FROM services WHERE id > ?', [id]);
    
    // Executar a exclusão
    const [result] = await connection.query('DELETE FROM services WHERE id > ?', [id]);
    connection.release();
    
    const deletedIds = servicesToDelete.map(s => s.id);
    
    res.json({ 
      message: `${result.affectedRows} serviços excluídos com sucesso`, 
      count: result.affectedRows,
      deletedIds
    });
  } catch (error) {
    console.error('Erro ao excluir serviços:', error);
    res.status(500).json({ error: 'Erro ao excluir serviços' });
  }
});

module.exports = router;
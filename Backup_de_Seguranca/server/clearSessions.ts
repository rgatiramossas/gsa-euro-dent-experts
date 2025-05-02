/**
 * Arquivo temporário para adicionar um endpoint de limpeza de sessões
 * IMPORTANTE: Remover após o uso, pois pode ser uma vulnerabilidade de segurança
 */

import { Request, Response } from 'express';
import { storage } from './storage';

export const addClearSessionsEndpoint = (app: any) => {
  app.get('/api/debug/clear-sessions', async (req: Request, res: Response) => {
    console.log('Endpoint de limpeza de sessões chamado');
    
    try {
      if (!req.session || !req.session.userId || req.session.userRole !== 'admin') {
        return res.status(401).json({ 
          error: 'Não autorizado. Apenas administradores podem limpar sessões.' 
        });
      }
      
      // Guarda o ID da sessão atual para não deslogar o usuário que está fazendo a limpeza
      const currentSessionId = req.sessionID;
      
      // Verificando se temos acesso à store
      if (!storage.sessionStore) {
        return res.status(500).json({ 
          error: 'Não foi possível acessar o armazenamento de sessões' 
        });
      }
      
      console.log('Tentando limpar sessões, exceto a sessão atual:', currentSessionId);
      
      if ('all' in storage.sessionStore) {
        // Para implementações de stores que suportam o método 'all'
        storage.sessionStore.all((err: Error | null, sessions: Record<string, any>) => {
          if (err) {
            console.error('Erro ao obter sessões:', err);
            return res.status(500).json({ error: 'Erro ao listar sessões', details: err.message });
          }
          
          // Contagem das sessões antes da limpeza
          const sessionCount = Object.keys(sessions || {}).length;
          console.log(`Encontradas ${sessionCount} sessões no total`);
          
          // Remover todas as sessões, exceto a atual
          let removedCount = 0;
          const promises = Object.keys(sessions || {})
            .filter(sid => sid !== currentSessionId)
            .map(sid => {
              return new Promise((resolve) => {
                storage.sessionStore.destroy(sid, (err: Error | null) => {
                  if (err) {
                    console.error(`Erro ao remover sessão ${sid}:`, err);
                    resolve(false);
                  } else {
                    removedCount++;
                    resolve(true);
                  }
                });
              });
            });
          
          Promise.all(promises).then(() => {
            console.log(`Remoção concluída. ${removedCount} sessões removidas.`);
            res.json({ 
              success: true, 
              message: `${removedCount} sessões removidas com sucesso. Sua sessão (${currentSessionId}) foi preservada.`,
              totalSessions: sessionCount,
              removedSessions: removedCount
            });
          });
        });
      } else if ('clear' in storage.sessionStore) {
        // Para implementações que suportam o método 'clear'
        // Este método geralmente limpa todas as sessões, incluindo a atual
        storage.sessionStore.clear((err: Error | null) => {
          if (err) {
            console.error('Erro ao limpar sessões:', err);
            return res.status(500).json({ error: 'Erro ao limpar sessões', details: err.message });
          }
          
          console.log('Todas as sessões removidas através do método clear()');
          
          // Restaura a sessão atual para manter o usuário logado
          req.session.userId = req.session.userId;
          req.session.userRole = req.session.userRole;
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao preservar a sessão atual:', err);
            } else {
              console.log('Sessão atual preservada com sucesso');
            }
            
            res.json({ 
              success: true, 
              message: 'Todas as sessões removidas com sucesso. Sua sessão foi preservada.'
            });
          });
        });
      } else {
        // Método não suportado
        return res.status(500).json({ 
          error: 'Método de limpeza não suportado pela store de sessões' 
        });
      }
    } catch (error: any) {
      console.error('Erro ao limpar sessões:', error);
      res.status(500).json({ 
        error: 'Erro ao limpar sessões', 
        details: error.message 
      });
    }
  });
  
  console.log('Endpoint de limpeza de sessões adicionado: GET /api/debug/clear-sessions');
  console.log('IMPORTANTE: Remova este endpoint após o uso!');
};
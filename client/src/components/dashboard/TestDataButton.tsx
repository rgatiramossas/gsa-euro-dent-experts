import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function TestDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateTestData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/test-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar dados de teste');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Dados de teste criados',
        description: `${result.summary.clients} clientes, ${result.summary.vehicles} veículos, ${result.summary.services} serviços e ${result.summary.budgets} orçamentos`,
        variant: 'success',
      });
      
      // Invalidar queries relevantes para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
    } catch (error) {
      console.error('Erro ao criar dados de teste:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar dados de teste',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateTestData}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
      ) : (
        <Database className="h-5 w-5 mr-2" />
      )}
      {isLoading ? 'Criando dados...' : 'Criar Dados de Teste'}
    </Button>
  );
}
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Interfaces para os dados
interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Vehicle {
  id: number;
  client_id: number;
  make: string;
  model: string;
  license_plate: string;
}

interface ServiceType {
  id: number;
  name: string;
  description: string;
  base_price: number;
}

// Componente principal
export default function TestSetup() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  
  // Buscar técnicos
  const { data: technicians = [], isLoading: isLoadingTechs } = useQuery<User[]>({
    queryKey: ['/api/users/technicians'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=technician');
      if (!response.ok) {
        throw new Error('Falha ao carregar técnicos');
      }
      return response.json();
    },
  });
  
  // Buscar clientes
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Falha ao carregar clientes');
      }
      return response.json();
    },
  });
  
  // Buscar tipos de serviço
  const { data: serviceTypes = [], isLoading: isLoadingServiceTypes } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
    queryFn: async () => {
      const response = await fetch('/api/service-types');
      if (!response.ok) {
        throw new Error('Falha ao carregar tipos de serviço');
      }
      return response.json();
    },
  });

  // Função para criar os dados de teste
  async function createTestData() {
    setIsCreating(true);
    
    try {
      toast({
        title: "Iniciando criação de dados de teste",
        description: "Esse processo pode levar alguns minutos...",
      });
      
      // Verificar se temos técnicos suficientes
      if (technicians.length === 0) {
        throw new Error("Não há técnicos cadastrados. Cadastre pelo menos um técnico antes de criar dados de teste.");
      }

      // Verificar se temos tipos de serviço
      if (serviceTypes.length === 0) {
        throw new Error("Não há tipos de serviço cadastrados. Cadastre pelo menos um tipo de serviço.");
      }
      
      // Usar a nova API que cria todos os dados em uma única chamada
      console.log("Chamando API para criar dados de teste");
      const response = await fetch('/api/test-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Falha na API: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      
      // Atualizar a interface
      toast({
        title: "Sucesso!",
        description: `Dados de teste criados: ${result.summary.clients} clientes, ${result.summary.vehicles} veículos, ${result.summary.services} serviços e ${result.summary.budgets} orçamentos.`,
        duration: 5000,
      });
      
      // Forçar atualização dos dados
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
    } catch (error: any) {
      console.error("Erro ao criar dados de teste:", error);
      toast({
        title: "Erro",
        description: `Falha ao criar dados de teste: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="Configuração de Teste"
        description="Criar dados de teste para o sistema"
        actions={
          <Button 
            onClick={createTestData} 
            disabled={isCreating || isLoadingTechs || isLoadingClients || isLoadingServiceTypes}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando dados...
              </>
            ) : (
              "Criar Dados de Teste"
            )}
          </Button>
        }
      />
      
      <div className="grid gap-6 mt-6 md:grid-cols-3">
        {/* Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle>Técnicos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTechs ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : technicians.length === 0 ? (
              <p className="text-muted-foreground">Nenhum técnico encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell>{tech.name}</TableCell>
                      <TableCell>{tech.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            ) : (
              <p className="text-muted-foreground">{clients.length} clientes encontrados</p>
            )}
          </CardContent>
        </Card>
        
        {/* Tipos de Serviço */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingServiceTypes ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : serviceTypes.length === 0 ? (
              <p className="text-muted-foreground">Nenhum tipo de serviço encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço Base</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>{type.name}</TableCell>
                      <TableCell>R$ {type.base_price?.toFixed(2) || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
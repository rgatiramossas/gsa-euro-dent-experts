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
      
      // 1. Criar 5 clientes
      const createdClients = [];
      for (let i = 1; i <= 5; i++) {
        const clientData = {
          name: `Cliente Teste ${i}`,
          email: `cliente.teste${i}@exemplo.com`,
          phone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          address: `Rua de Teste ${i}, ${Math.floor(Math.random() * 1000)}, São Paulo - SP`
        };
        
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        });
        
        if (!response.ok) {
          throw new Error(`Falha ao criar cliente ${i}: ${await response.text()}`);
        }
        
        const client = await response.json();
        createdClients.push(client);
        
        // 2. Criar um veículo para cada cliente
        const vehicleData = {
          client_id: client.id,
          make: ['Toyota', 'Honda', 'Fiat', 'Volkswagen', 'Chevrolet'][Math.floor(Math.random() * 5)],
          model: ['Corolla', 'Civic', 'Palio', 'Gol', 'Onix'][Math.floor(Math.random() * 5)],
          color: ['Branco', 'Preto', 'Prata', 'Vermelho', 'Azul'][Math.floor(Math.random() * 5)],
          license_plate: `ABC${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`
        };
        
        const vehicleResponse = await fetch(`/api/clients/${client.id}/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vehicleData),
        });
        
        if (!vehicleResponse.ok) {
          throw new Error(`Falha ao criar veículo para cliente ${client.id}: ${await vehicleResponse.text()}`);
        }
        
        const vehicle = await vehicleResponse.json();
        
        // 3. Criar 5 serviços para cada cliente
        for (let j = 1; j <= 5; j++) {
          // Selecionar um técnico aleatório
          const technician = technicians[Math.floor(Math.random() * technicians.length)];
          // Selecionar um tipo de serviço aleatório
          const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
          
          // Status aleatório - 40% concluído, 40% em andamento, 20% pendente
          const statusOptions = ['concluido', 'em_andamento', 'em_andamento', 'pendente', 'concluido'];
          const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
          
          // Data agendada entre 1 e 30 dias antes da data atual
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() - Math.floor(Math.random() * 30) - 1);
          
          // Para serviços concluídos, definir data de conclusão
          let startDate = null;
          let completionDate = null;
          
          if (status === 'em_andamento' || status === 'concluido') {
            startDate = new Date(scheduledDate);
            startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3) + 1);
          }
          
          if (status === 'concluido') {
            completionDate = new Date(startDate as Date);
            completionDate.setDate((startDate as Date).getDate() + Math.floor(Math.random() * 3) + 1);
          }
          
          const price = Math.floor(Math.random() * 800) + 200; // Entre 200 e 1000
          const administrativeFee = price * 0.15; // 15% do preço
          
          const serviceData = {
            client_id: client.id,
            vehicle_id: vehicle.id,
            service_type_id: serviceType.id,
            technician_id: technician.id,
            status: status,
            description: `Serviço de teste ${j} para cliente ${i}. ${status === 'concluido' ? 'Concluído com sucesso.' : status === 'em_andamento' ? 'Em andamento.' : 'Aguardando iniciar.'}`,
            scheduled_date: scheduledDate.toISOString(),
            start_date: startDate ? startDate.toISOString() : null,
            completion_date: completionDate ? completionDate.toISOString() : null,
            location_type: Math.random() > 0.5 ? 'oficina' : 'externo',
            address: Math.random() > 0.5 ? `Rua de Serviço ${j}, São Paulo - SP` : null,
            price: price,
            administrative_fee: administrativeFee,
            total: price + administrativeFee,
            // Valores específicos para martelinho de ouro
            aw_value: Math.floor(Math.random() * 500) + 100,
            dents: Math.floor(Math.random() * 5) + 1,
            size: ['pequeno', 'médio', 'grande'][Math.floor(Math.random() * 3)],
            is_vertical: Math.random() > 0.5 ? 1 : 0,
            is_aluminum: Math.random() > 0.5 ? 1 : 0,
          };
          
          const serviceResponse = await fetch('/api/services', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData),
          });
          
          if (!serviceResponse.ok) {
            throw new Error(`Falha ao criar serviço ${j} para cliente ${client.id}: ${await serviceResponse.text()}`);
          }
          
          const service = await serviceResponse.json();
          
          // 4. Criar fotos para serviços concluídos ou em andamento
          if (status === 'em_andamento' || status === 'concluido') {
            // Fotos "antes" - para todos os serviços em andamento ou concluídos
            const photoBeforeData = {
              service_id: service.id,
              photo_type: 'before',
              photo_url: `https://placehold.co/400x300?text=Antes+${service.id}`
            };
            
            await fetch('/api/services/photos', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(photoBeforeData),
            });
            
            // Fotos "depois" - apenas para serviços concluídos
            if (status === 'concluido') {
              const photoAfterData = {
                service_id: service.id,
                photo_type: 'after',
                photo_url: `https://placehold.co/400x300?text=Depois+${service.id}`
              };
              
              await fetch('/api/services/photos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(photoAfterData),
              });
            }
          }
        }
        
        // 5. Criar 5 orçamentos para cada cliente
        for (let k = 1; k <= 5; k++) {
          const damagedParts = ['porta_motorista', 'porta_passageiro', 'capo', 'teto', 'lateral'];
          const randomPart = damagedParts[Math.floor(Math.random() * damagedParts.length)];
          
          const budgetDate = new Date();
          budgetDate.setDate(budgetDate.getDate() - Math.floor(Math.random() * 60)); // Até 60 dias atrás
          
          const totalAw = Math.floor(Math.random() * 10) + 1;
          const totalValue = totalAw * (Math.floor(Math.random() * 100) + 50);
          
          const budgetData = {
            client_id: client.id,
            vehicle_info: `${vehicleData.make} ${vehicleData.model} ${vehicleData.color}`,
            date: budgetDate.toISOString().split('T')[0],
            total_aw: totalAw,
            total_value: totalValue,
            photo_url: `https://placehold.co/400x300?text=Orçamento+${k}`,
            note: `Orçamento de teste ${k} para cliente ${i}`,
            plate: vehicleData.license_plate,
            chassis_number: `TESTE${Math.floor(Math.random() * 100000)}`,
            damaged_parts: randomPart,
            vehicle_image: `https://placehold.co/800x600?text=Veículo+${vehicleData.make}+${vehicleData.model}`
          };
          
          const budgetResponse = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(budgetData),
          });
          
          if (!budgetResponse.ok) {
            throw new Error(`Falha ao criar orçamento ${k} para cliente ${client.id}: ${await budgetResponse.text()}`);
          }
        }
      }
      
      // Atualizar a interface
      toast({
        title: "Sucesso!",
        description: "Dados de teste criados com sucesso: 5 clientes, 5 veículos, 25 serviços e 25 orçamentos.",
        duration: 5000,
      });
      
      // Forçar atualização dos dados
      queryClient.invalidateQueries(['/api/clients']);
      queryClient.invalidateQueries(['/api/services']);
      queryClient.invalidateQueries(['/api/budgets']);
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
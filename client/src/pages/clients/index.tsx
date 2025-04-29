import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ClientsListProps {
  managerMode?: boolean;
}

export default function ClientsList({ managerMode = false }: ClientsListProps) {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "deleted" | "all">("active");
  const [managerId, setManagerId] = useState<string | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Extrai o ID do gerente da URL se estivermos no modo gestor
  useEffect(() => {
    if (managerMode) {
      const id = location.split('/')[2];
      setManagerId(id);
    }
  }, [managerMode, location]);
  
  // Query para buscar os clientes
  const { data: clients = [], isLoading, refetch } = useQuery<Client[]>({
    queryKey: managerMode && managerId 
      ? ['/api/managers', managerId, 'clients'] 
      : ['/api/clients', statusFilter], // Incluir statusFilter como parte da chave
    queryFn: async () => {
      if (managerMode && managerId) {
        try {
          const response = await fetch(`/api/managers/${managerId}/clients`);
          if (!response.ok) {
            throw new Error('Erro ao carregar clientes do gestor');
          }
          return response.json();
        } catch (error: any) {
          toast({
            title: "Erro",
            description: `Erro ao carregar clientes: ${error.message}`,
            variant: "destructive",
          });
          return [];
        }
      }
      try {
        const endpoint = '/api/clients';
        console.log(`Carregando clientes com filtro: ${statusFilter}`);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.error('Erro ao carregar clientes, status:', response.status);
          return [];
        }
        const data = await response.json();
        // Verificar se o dado retornado é um array
        if (!Array.isArray(data)) {
          console.error('Dados de clientes não é um array:', data);
          return [];
        }
        
        // Filtrar clientes com base no status
        return data.filter((client: Client) => {
          const isDeleted = client.name?.includes('[EXCLUÍDO]');
          
          switch (statusFilter) {
            case 'active':
              return !isDeleted;
            case 'deleted':
              return isDeleted;
            case 'all':
            default:
              return true;
          }
        });
      } catch (error: any) {
        console.error('Erro ao buscar clientes:', error);
        toast({
          title: "Erro",
          description: `Erro ao carregar clientes: ${error.message}`,
          variant: "destructive",
        });
        return [];
      }
    },
    // Incluir statusFilter como dependência para atualizar quando mudar
    enabled: !managerMode || !!managerId,
  });

  // Filter clients based on search term
  const filteredClients = Array.isArray(clients) ? clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  ) : [];

  const navigateToClientDetails = (id: number) => {
    setLocation(`/clients/${id}`);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={managerMode ? "Clientes do Gestor" : "Clientes"}
        description={managerMode 
          ? "Visualize os clientes atribuídos a este gestor" 
          : "Gerencie os clientes e seus veículos"}
        actions={
          managerMode ? (
            <Button variant="outline" onClick={() => setLocation('/managers')}>
              Voltar para Gestores
            </Button>
          ) : (
            <Link href="/clients/new">
              <Button>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Cliente
              </Button>
            </Link>
          )
        }
      />
      
      <Card className="mt-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium">
              Exibir:
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value: "active" | "deleted" | "all") => {
                setStatusFilter(value);
                // O refetch será automático devido ao queryKey incluir o statusFilter
                // Mas podemos forçar o refetch para garantir
                console.log(`Alterando filtro para: ${value}`);
                refetch();
              }}
            >
              <SelectTrigger className="w-40" id="status-filter">
                <SelectValue placeholder="Selecione um filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="deleted">Excluídos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade/Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients?.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>
                          {client.city && client.state ? `${client.city}/${client.state}` : "Não informado"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => navigateToClientDetails(client.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4"/>
                                <path d="M12 8h.01"/>
                              </svg>
                              <span>Detalhes</span>
                            </Button>
                            <Link href={`/clients/${client.id}/vehicle/new`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                  <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
                                  <circle cx="6.5" cy="16.5" r="2.5"/>
                                  <circle cx="16.5" cy="16.5" r="2.5"/>
                                </svg>
                                <span>Veículo</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

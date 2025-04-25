import React, { useState } from "react";
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
import { Client } from "@/types";

export default function ClientsList() {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Filter clients based on search term
  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const navigateToClientDetails = (id: number) => {
    setLocation(`/clients/${id}`);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes e seus veículos"
        actions={
          <Link href="/clients/new">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Cliente
            </Button>
          </Link>
        }
      />
      
      <Card className="mt-6">
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
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
                              onClick={() => navigateToClientDetails(client.id)}
                            >
                              Detalhes
                            </Button>
                            <Link href={`/clients/${client.id}/vehicle/new`}>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                + Veículo
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

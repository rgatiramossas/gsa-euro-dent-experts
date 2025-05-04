import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Avatar,
  AvatarFallback
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";

export default function TechniciansList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users?role=technician'],
    queryFn: () => fetch('/api/users?role=technician').then(res => {
      if (!res.ok) throw new Error('Falha ao carregar técnicos');
      return res.json();
    }),
  });

  // Filter technicians based on search term
  const filteredTechnicians = users?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Técnicos"
          description="Gerenciamento de técnicos de martelinho de ouro"
        />
        
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-900">Acesso Restrito</h3>
            <p className="mt-2 text-gray-500">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Técnicos"
        description="Gerenciamento de técnicos de martelinho de ouro"
        actions={
          <Link href="/technicians/new">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Técnico
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
                    <TableHead>Técnico</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTechnicians?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum técnico encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTechnicians?.map((tech) => (
                      <TableRow key={tech.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9 bg-primary text-white">
                              <AvatarFallback>{getInitials(tech.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{tech.name}</p>
                              <p className="text-sm text-gray-500">@{tech.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{tech.email}</TableCell>
                        <TableCell>{tech.phone || "Não informado"}</TableCell>
                        <TableCell>
                          <Badge className={tech.active ? "bg-success text-white" : "bg-gray-200 text-gray-700"}>
                            {tech.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/technicians/edit/${tech.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              Editar
                            </Button>
                          </Link>
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

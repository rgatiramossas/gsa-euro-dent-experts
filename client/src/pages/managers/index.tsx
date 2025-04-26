import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash, Check, X, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type User = {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

export default function ManagersList() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Fetch managers (role = "gestor")
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['/api/users', { role: 'gestor' }],
    queryFn: async () => {
      const res = await fetch('/api/users?role=gestor');
      if (!res.ok) throw new Error('Erro ao buscar gestores');
      return res.json() as Promise<User[]>;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Gestores"
          description="Gerenciamento de gestores"
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
        title="Gestores"
        description="Gerenciamento de gestores"
        actions={
          <Button onClick={() => setLocation('/managers/new-manager')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Gestor
          </Button>
        }
      />
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lista de Gestores</CardTitle>
          <CardDescription>
            Gestores têm acesso limitado a serviços de clientes específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : managers.length === 0 ? (
            <div className="py-24 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Sem gestores</h3>
              <p className="mt-1 text-gray-500">
                Nenhum gestor cadastrado no sistema.
              </p>
              <div className="mt-6">
                <Button onClick={() => setLocation('/managers/new-manager')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Gestor
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.name}</TableCell>
                      <TableCell>{manager.username}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>
                        {manager.active ? (
                          <Badge className="bg-green-600 text-white">
                            <Check className="mr-1 h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <X className="mr-1 h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(manager.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/managers/${manager.id}/clients`}>
                            <Users className="h-4 w-4" />
                            <span className="sr-only">Clientes</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/managers/${manager.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
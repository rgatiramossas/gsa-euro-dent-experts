import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { UserPlus, Edit, Trash2, Check, X, Users, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  
  // Estado para gerenciar o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState<User | null>(null);
  
  // Mutation para excluir um gestor
  const deleteManagerMutation = useMutation({
    mutationFn: async (managerId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${managerId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir gestor");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gestor excluído",
        description: `${managerToDelete?.name} foi removido com sucesso.`,
        variant: "default",
      });
      // Invalidar a consulta para atualizar a lista de gestores
      queryClient.invalidateQueries({ queryKey: ['/api/users', { role: 'gestor' }] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir gestor",
        description: error.message || "Ocorreu um erro ao tentar excluir o gestor.",
        variant: "destructive",
      });
    },
  });
  
  // Função para confirmar exclusão de gestor
  const handleDeleteManager = async () => {
    if (managerToDelete) {
      await deleteManagerMutation.mutateAsync(managerToDelete.id);
      setDeleteDialogOpen(false);
      setManagerToDelete(null);
    }
  };
  
  // Função para abrir o diálogo de confirmação de exclusão
  const openDeleteDialog = (manager: User) => {
    setManagerToDelete(manager);
    setDeleteDialogOpen(true);
  };
  
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
      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o gestor <strong>{managerToDelete?.name}</strong>?
              <div className="mt-2 flex items-center text-amber-700 bg-amber-50 p-3 rounded-md">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Esta ação não pode ser desfeita. O gestor perderá acesso ao sistema e todas suas associações com clientes serão removidas.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteManager}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteManagerMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Excluindo...
                </span>
              ) : "Sim, excluir gestor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            asChild
                          >
                            <Link to={`/managers/${manager.id}/clients`}>
                              <Users className="h-4 w-4" />
                              <span>Clientes</span>
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                            asChild
                          >
                            <Link to={`/managers/${manager.id}/edit`}>
                              <Edit className="h-4 w-4" />
                              <span>Editar</span>
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openDeleteDialog(manager)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Excluir</span>
                          </Button>
                        </div>
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
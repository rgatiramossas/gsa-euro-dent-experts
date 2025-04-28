import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateSimplePdf } from "@/components/SimplePdfGenerator";
import { Loader2, Search, Printer, FileText, Trash2, Plus, Edit, FileEdit, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import NewBudgetForm from "@/components/NewBudgetForm";

// Define a type for our budget data
interface Budget {
  id: number;
  client_id: number;
  client_name: string;
  vehicle_info: string;
  date: string;
  total_aw?: number;
  total_value?: number;
  photo_url?: string;
  note?: string;
  plate?: string;
  chassis_number?: string;
  damaged_parts?: any;
  created_at: string;
}

interface BudgetPageProps {
  isNewMode?: boolean;
  isEditMode?: boolean;
  id?: string;
}

const BudgetPage: React.FC<BudgetPageProps> = ({ isNewMode, isEditMode, id }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch budgets data
  const {
    data: budgets,
    isLoading: isLoadingBudgets,
    error: budgetsError,
  } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    retry: 1,
  });

  // Setup mutation for deleting a budget
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir orçamento");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Apply search filter when budgets data or search term changes
  useEffect(() => {
    if (budgets) {
      const filtered = budgets.filter((budget) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          budget.client_name?.toLowerCase().includes(searchLower) ||
          budget.vehicle_info?.toLowerCase().includes(searchLower) ||
          String(budget.id).includes(searchTerm) ||
          budget.plate?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredBudgets(filtered);
    }
  }, [budgets, searchTerm]);

  // Handle opening budget details
  const handleOpenDetails = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailsDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDeleteDialog(true);
  };

  // Handle actual deletion
  const handleDelete = () => {
    if (selectedBudget) {
      deleteMutation.mutate(selectedBudget.id);
    }
  };

  // Handle printing a budget usando o SimplePdfGenerator
  const handlePrintBudget = async (budget: Budget) => {
    if (!budget) return;
    
    try {
      await generateSimplePdf(budget);
      toast({
        title: "PDF gerado",
        description: "O PDF do orçamento foi gerado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Manipulador para quando um novo orçamento é criado com sucesso
  const handleNewBudgetSuccess = (data: any) => {
    toast({
      title: "Orçamento criado",
      description: "O orçamento foi criado com sucesso.",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    setShowNewBudgetDialog(false);
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency for display
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "R$ 0,00";
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  // Show error state
  if (budgetsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              Erro ao carregar orçamentos. Por favor, tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Código para lidar com modos de edição e criação
  // Neste momento, esses modos são implementados como componentes separados
  // Verificar se estamos em modo de criação ou edição
  if (isNewMode) {
    // Implementação do formulário de novo orçamento
    return (
      <NewBudgetForm />
    );
  }
  
  if (isEditMode && id) {
    // No futuro, implementaremos a edição de orçamentos aqui
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                className="mr-2 p-0 h-8 w-8" 
                onClick={() => window.location.href = "/budgets"}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl">Editar Orçamento #{id}</CardTitle>
            </div>
            <CardDescription>
              Funcionalidade em desenvolvimento
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="mb-4">Esta funcionalidade está sendo implementada.</p>
            <Button onClick={() => window.location.href = "/budgets"}>
              Voltar para Orçamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="text-2xl">Gerenciamento de Orçamentos</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os orçamentos
            </CardDescription>
          </div>
          <Button 
            className="mt-4 sm:mt-0" 
            onClick={() => setShowNewBudgetDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por cliente, veículo ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoadingBudgets ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando orçamentos...</span>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhum orçamento encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.id}</TableCell>
                      <TableCell>{budget.client_name}</TableCell>
                      <TableCell>{budget.vehicle_info}</TableCell>
                      <TableCell>{formatDisplayDate(budget.date)}</TableCell>
                      <TableCell>{formatCurrency(budget.total_value)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDetails(budget)}
                            title="Ver detalhes"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Editar orçamento"
                            asChild
                          >
                            <Link href={`/budgets/${budget.id}/edit`}>
                              <FileEdit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrintBudget(budget)}
                            title="Imprimir orçamento"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteConfirm(budget)}
                            title="Excluir orçamento"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Budget Details Dialog */}
      <Dialog 
        open={showDetailsDialog} 
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          if (!open) setIsEditing(false);
        }}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Detalhes do Orçamento #{selectedBudget?.id}</DialogTitle>
            <DialogDescription>
              Informações completas do orçamento
            </DialogDescription>
          </DialogHeader>

          {selectedBudget && (
            <div className="px-6 pb-6 max-h-[80vh] overflow-y-auto">
              <NewBudgetForm
                initialData={selectedBudget}
                readOnly={!isEditing}
                onSuccess={(data) => {
                  toast({
                    title: "Orçamento atualizado",
                    description: "O orçamento foi atualizado com sucesso.",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
                  setIsEditing(false);
                  setShowDetailsDialog(false);
                }}
                isInDialog={true}
              />
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-between mt-6">
                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedBudget && handlePrintBudget(selectedBudget)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  {isEditing ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar Edição
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setIsEditing(false);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Budget Dialog */}
      <Dialog 
        open={showNewBudgetDialog} 
        onOpenChange={setShowNewBudgetDialog}
      >
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Novo Orçamento</DialogTitle>
            <DialogDescription>
              Crie um novo orçamento para o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 max-h-[80vh] overflow-y-auto">
            <NewBudgetForm 
              onSuccess={handleNewBudgetSuccess}
              isInDialog={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
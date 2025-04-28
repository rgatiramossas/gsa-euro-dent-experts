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
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generatePdf } from "@/components/PdfGenerator";
import { Loader2, Search, Printer, FileText, Trash2 } from "lucide-react";

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

const BudgetPage: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);

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

  // Handle printing a budget
  const handlePrintBudget = async (budget: Budget) => {
    if (!budget) return;
    
    try {
      await generatePdf(budget);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
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

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Gerenciamento de Orçamentos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os orçamentos
          </CardDescription>
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
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento #{selectedBudget?.id}</DialogTitle>
            <DialogDescription>
              Informações completas do orçamento
            </DialogDescription>
          </DialogHeader>

          {selectedBudget && (
            <div className="space-y-4 mt-4">
              {/* Cliente e Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={selectedBudget.client_name} readOnly />
                </div>
                <div>
                  <Label>Veículo</Label>
                  <Input value={selectedBudget.vehicle_info} readOnly />
                </div>
              </div>
              
              {/* Placa e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Placa</Label>
                  <Input value={selectedBudget.plate || "N/A"} readOnly />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input 
                    value={formatDisplayDate(selectedBudget.date)}
                    readOnly 
                  />
                </div>
              </div>
              
              {/* Chassis e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Chassi</Label>
                  <Input 
                    value={selectedBudget.chassis_number || "N/A"} 
                    readOnly 
                  />
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <Input
                    value={formatCurrency(selectedBudget.total_value)}
                    readOnly
                  />
                </div>
              </div>
              
              {/* Observações */}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={selectedBudget.note || "Sem observações"}
                  readOnly
                  className="h-24"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => selectedBudget && handlePrintBudget(selectedBudget)}
              className="mr-2"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDetailsDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
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
    </div>
  );
};

export default BudgetPage;
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getApi, deleteApi } from "@/lib/apiWrapper";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
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
  const { user } = useAuth();
  const { t } = useTranslation();
  const isGestor = user?.role === "gestor" || user?.role === "manager";
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
    queryFn: async () => {
      return await getApi<Budget[]>("/api/budgets");
    },
    retry: 1,
  });

  // Setup mutation for deleting a budget
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteApi<any>(`/api/budgets/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t("budget.deleted"),
        description: t("budget.deleteSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("budget.deleteError", { error: error.message }),
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
      // Passamos o flag isGestor para controlar a exibição de informações financeiras
      await generateSimplePdf(budget, isGestor);
      toast({
        title: t("budget.pdfGenerated"),
        description: t("budget.pdfSuccess"),
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: t("common.error"),
        description: t("budget.pdfError"),
        variant: "destructive",
      });
    }
  };
  
  // Manipulador para quando um novo orçamento é criado com sucesso
  const handleNewBudgetSuccess = (data: any) => {
    toast({
      title: t("budget.created"),
      description: t("budget.createSuccess"),
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
    if (value === undefined || value === null) return "0,00 €";
    return `${value.toFixed(2).replace(".", ",")} €`;
  };

  // Show error state
  if (budgetsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{t("common.error")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {t("budget.loadError")}
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
              <CardTitle className="text-2xl">{t("budget.editBudget", { id })}</CardTitle>
            </div>
            <CardDescription>
              {t("common.inDevelopment")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="mb-4">{t("common.featureImplementing")}</p>
            <Button onClick={() => window.location.href = "/budgets"}>
              {t("budget.returnToBudgets")}
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
            <CardTitle className="text-2xl">{t("budget.budgetManagement")}</CardTitle>
            <CardDescription>
              {isGestor ? t("budget.viewAllBudgets") : t("budget.manageBudgets")}
            </CardDescription>
          </div>
          {!isGestor && (
            <Button 
              className="mt-4 sm:mt-0" 
              onClick={() => setShowNewBudgetDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("budget.newBudget")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder={t("budget.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoadingBudgets ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">{t("common.loading")}</span>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              {t("common.noResults")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t("common.client")}</TableHead>
                    <TableHead>{t("common.vehicle")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    {!isGestor && <TableHead>{t("common.value")}</TableHead>}
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.id}</TableCell>
                      <TableCell>{budget.client_name}</TableCell>
                      <TableCell>{budget.vehicle_info}</TableCell>
                      <TableCell>{formatDisplayDate(budget.date)}</TableCell>
                      {!isGestor && <TableCell>{formatCurrency(budget.total_value)}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDetails(budget)}
                            title={t("budget.viewDetails")}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrintBudget(budget)}
                            title={t("budget.printBudget")}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          
                          {/* Mostrar botão de exclusão apenas para admin e técnicos */}
                          {!isGestor && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteConfirm(budget)}
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
            <DialogTitle>{t("budget.budgetDetails", { id: selectedBudget?.id })}</DialogTitle>
            <DialogDescription>
              {t("budget.completeInfo")}
            </DialogDescription>
          </DialogHeader>

          {selectedBudget && (
            <div className="px-6 pb-6 max-h-[80vh] overflow-y-auto">
              <NewBudgetForm
                initialData={selectedBudget}
                // Quando não está em modo de edição, o formulário é somente leitura
                readOnly={!isEditing}
                onSuccess={(data) => {
                  toast({
                    title: t("budget.updated"),
                    description: t("budget.updateSuccess"),
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
                    {t("budget.print")}
                  </Button>
                  {isEditing ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsEditing(false)}
                    >
                      {t("common.cancelEdit")}
                    </Button>
                  ) : (
                    // Mostrar botão de editar apenas para admin e técnicos
                    !isGestor && (
                      <Button 
                        variant="secondary" 
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </Button>
                    )
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setIsEditing(false);
                  }}
                >
                  {t("common.close")}
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
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("budget.deleteConfirmation")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                t("common.delete")
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
            <DialogTitle>{t("budget.newBudget")}</DialogTitle>
            <DialogDescription>
              {t("budget.createNew")}
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
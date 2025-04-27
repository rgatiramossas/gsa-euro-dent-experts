import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PlusIcon, 
  Pencil as PencilIcon, 
  Trash2 as Trash2Icon,
  Camera as CameraIcon,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  Eye as EyeIcon
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Budget {
  id: number;
  client_name: string;
  vehicle_info: string;
  date: string;
  damaged_parts?: string[];
  photo_url?: string;
  total_aw?: number;
  total_value?: number;
  created_at: string;
  note?: string;
  plate?: string;
  chassisNumber?: string;
}

interface PartDamage {
  selected: boolean;
  diameter20: number;
  diameter30: number;
  diameter40: number;
  optionA: boolean;
  optionK: boolean;
  optionP: boolean;
  isHorizontal?: boolean;
}

interface CarPart {
  id: string;
  name: string;
  damage: PartDamage;
}

export default function BudgetPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isGestor = user?.role === 'gestor' || user?.role === 'manager';
  
  // Estados para o formulário
  const [showDialog, setShowDialog] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [manualVehicleInfo, setManualVehicleInfo] = useState('');
  const [totalAw, setTotalAw] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consultas
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    select: (data) => data as Client[],
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['/api/budgets'],
    select: (data) => data as Budget[],
  });

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      return await apiRequest('/api/budgets', {
        method: 'POST',
        data: budgetData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setShowDialog(false);
      toast({
        title: "Orçamento criado",
        description: "O orçamento foi criado com sucesso.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao criar orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      return await apiRequest(`/api/budgets/${selectedBudget?.id}`, {
        method: 'PATCH',
        data: budgetData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setShowDialog(false);
      toast({
        title: "Orçamento atualizado",
        description: "O orçamento foi atualizado com sucesso.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/budgets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Funções auxiliares
  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedClient(null);
    setManualVehicleInfo('');
    setTotalAw(0);
    setTotalValue(0);
    setPhotoUrl(null);
    setNote('');
    setLicensePlate('');
    setChassisNumber('');
    setIsViewMode(false);
    setSelectedBudget(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCreateBudget = () => {
    if (!selectedClient && !isViewMode) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!manualVehicleInfo && !isViewMode) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o veículo.",
        variant: "destructive",
      });
      return;
    }

    const budgetData = {
      client_id: selectedClient,
      vehicle_info: manualVehicleInfo,
      date: date,
      total_aw: totalAw,
      total_value: totalValue,
      photo_url: photoUrl,
      note: note,
      plate: licensePlate,
      chassisNumber: chassisNumber,
    };

    if (selectedBudget && selectedBudget.id) {
      updateBudgetMutation.mutate(budgetData);
    } else {
      createBudgetMutation.mutate(budgetData);
    }
  };

  const handleViewBudget = (id: number) => {
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      setSelectedBudget(budget);
      setDate(budget.date || new Date().toISOString().split('T')[0]);
      setManualVehicleInfo(budget.vehicle_info || '');
      setTotalAw(budget.total_aw || 0);
      setTotalValue(budget.total_value || 0);
      setPhotoUrl(budget.photo_url || null);
      setNote(budget.note || '');
      setLicensePlate(budget.plate || '');
      setChassisNumber(budget.chassisNumber || '');
      setIsViewMode(true);
      setShowDialog(true);
    }
  };

  const handleDeleteBudget = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteBudgetMutation.mutate(id);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie orçamentos para seus clientes</p>
        </div>
        
        {!isGestor && (
          <Dialog open={showDialog} onOpenChange={(open) => {
            if (!open) {
              setIsViewMode(false);
              setSelectedBudget(null);
            }
            setShowDialog(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {isViewMode ? `Visualizar Orçamento #${selectedBudget?.id}` : 'Criar Novo Orçamento'}
                </DialogTitle>
                <DialogDescription>
                  {isViewMode 
                    ? `Detalhes do orçamento para ${selectedBudget?.client_name}.`
                    : 'Preencha os detalhes para criar um novo orçamento para o cliente.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Formulário simplificado */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente</Label>
                      <Select 
                        value={selectedClient?.toString() || ""} 
                        onValueChange={(value) => {
                          if (!isViewMode && value) {
                            setSelectedClient(parseInt(value));
                          } else if (!isViewMode) {
                            setSelectedClient(null);
                          }
                        }}
                        disabled={isViewMode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name} - {client.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleInfo">Veículo</Label>
                      <Input
                        id="vehicleInfo"
                        placeholder="Ex: BMW X5 2022"
                        value={manualVehicleInfo}
                        onChange={(e) => setManualVehicleInfo(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate">Placa</Label>
                      <Input
                        id="licensePlate"
                        placeholder="Ex: ABC-1234"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chassisNumber">Chassi</Label>
                      <Input
                        id="chassisNumber"
                        placeholder="Ex: 9BW11111111111111"
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Imagem do veículo */}
                <div className="space-y-2">
                  <Label>Foto do Veículo</Label>
                  <div className="flex justify-center items-center p-2 border rounded-md">
                    <input 
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    {photoUrl ? (
                      <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] relative">
                        <img 
                          src={photoUrl} 
                          alt="Foto do veículo" 
                          className="max-h-[135px] max-w-full object-contain"
                        />
                        {!isViewMode && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={() => setPhotoUrl(null)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : isViewMode ? (
                      <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] text-gray-400">
                        <CameraIcon className="h-10 w-10 mb-2" />
                        <span className="text-sm">Sem foto</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-full flex flex-col items-center justify-center min-h-[135px]"
                        onClick={handlePhotoUpload}
                      >
                        <CameraIcon className="h-10 w-10 mb-2" />
                        <span className="text-sm">Adicionar Foto</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Totais - não mostrados para gestores */}
                {!isGestor && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAw">Total de AW</Label>
                      <Input
                        id="totalAw"
                        type="number"
                        min="0"
                        max="99999"
                        value={totalAw}
                        onChange={(e) => setTotalAw(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        autoComplete="off"
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="totalValue">Total em €</Label>
                      <Input
                        id="totalValue"
                        type="number"
                        min="0"
                        max="9999999"
                        value={totalValue}
                        onChange={(e) => setTotalValue(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        autoComplete="off"
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                )}
                
                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="note">Observações</Label>
                  <Textarea
                    id="note"
                    placeholder="Observações sobre o orçamento..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    readOnly={isViewMode}
                    disabled={isViewMode}
                  />
                </div>
              </div>
              
              <DialogFooter>
                {isViewMode ? (
                  <>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Fechar
                    </Button>
                    {!isGestor && (
                      <Button 
                        variant="secondary"
                        onClick={() => setIsViewMode(false)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateBudget} 
                      disabled={createBudgetMutation.isPending}
                    >
                      {createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Data</TableHead>
                  {!isGestor && <TableHead>Total AW</TableHead>}
                  {!isGestor && <TableHead className="text-right">Valor</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 5 : 7} className="text-center py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : budgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 5 : 7} className="text-center py-4">
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>{budget.id}</TableCell>
                      <TableCell>{budget.client_name}</TableCell>
                      <TableCell>{budget.vehicle_info}</TableCell>
                      <TableCell>{formatDate(budget.date)}</TableCell>
                      {!isGestor && <TableCell>{budget.total_aw}</TableCell>}
                      {!isGestor && <TableCell className="text-right">{formatCurrency(budget.total_value || 0)}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBudget(budget.id)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          
                          {!isGestor && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsViewMode(false);
                                  handleViewBudget(budget.id);
                                }}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBudget(budget.id)}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
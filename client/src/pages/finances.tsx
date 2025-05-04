import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// Importações do Recharts já feitas acima
import { ServiceListItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { Badge } from "@/components/ui/badge";
import { TechnicianPaymentsPieChart, MonthlyPaymentsChart } from "@/components/finance/TechnicianCharts";

// Esquema para o formulário de despesas
const expenseFormSchema = z.object({
  description: z.string().min(3, {
    message: "A descrição precisa ter pelo menos 3 caracteres.",
  }),
  amount: z.string().refine(
    (val) => {
      // Remover € e trocar vírgula por ponto para conversão
      const cleanValue = val.replace(/[€\s]/g, '').replace(',', '.');
      return !isNaN(parseFloat(cleanValue)) && parseFloat(cleanValue) > 0;
    },
    {
      message: "O valor deve ser um número positivo",
    }
  ),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  category: z.string().min(1, {
    message: "Categoria é obrigatória",
  }),
  provider: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema para o formulário de pagamento
const paymentFormSchema = z.object({
  payment_method: z.string().min(1, {
    message: "Método de pagamento é obrigatório",
  }),
  payment_date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  transaction_id: z.string().optional(),
  payment_notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function Finances() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("month");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentRequestDialogOpen, setPaymentRequestDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequest | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  
  // Obter dados financeiros do técnico com auto-refresh
  const { data: techFinanceStats, isLoading: isLoadingFinanceStats, error: techFinanceError } = useQuery({
    queryKey: ['/api/technician/financial-stats', currentUser?.id],
    enabled: !isAdmin && currentUser?.role === 'technician' && !!currentUser?.id,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    queryFn: () => {
      // Garantir que temos um ID válido
      if (!currentUser?.id) {
        throw new Error('ID do técnico não disponível');
      }
      return fetch(`/api/technician/financial-stats?technician_id=${currentUser.id}`).then(res => {
        if (!res.ok) throw new Error('Erro ao obter dados financeiros');
        return res.json();
      });
    }
  });
  
  // Formulário de despesas
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category: "operacional",
      provider: "",
      notes: ""
    }
  });
  
  // Formulário de pagamento
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_method: "",
      payment_date: new Date().toISOString().split('T')[0],
      transaction_id: "",
      payment_notes: ""
    }
  });
  
  // Get all services for financial data with auto-refresh
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
    // Refetch data automatically every 5 seconds
    refetchInterval: 5000,
    // Continue to refresh on background
    refetchIntervalInBackground: true,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
  
  // Get all expenses with auto-refresh
  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    // Refetch data automatically every 5 seconds
    refetchInterval: 5000,
    // Continue to refresh on background
    refetchIntervalInBackground: true,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
  
  interface Expense {
    id: number;
    type: string;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    provider?: string;
    notes?: string;
    created_at: string;
  }
  
  interface PaymentRequest {
    id: number;
    created_at: string;
    status: string;
    payment_date?: string;
    payment_details?: string;
    technician_id: number;
    technician?: {
      id: number;
      name: string;
    } | null;
    services?: ServiceListItem[];
  }

  // Get payment requests data with auto-refresh
  const { data: paymentRequests, isLoading: loadingPaymentRequests } = useQuery<PaymentRequest[]>({
    queryKey: ['/api/payment-requests'],
    // Refetch data automatically every 5 seconds
    refetchInterval: 5000,
    // Continue to refresh on background
    refetchIntervalInBackground: true,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
  
  // Get all technicians for admin payment request selection
  const { data: technicians } = useQuery<{id: number, name: string}[]>({
    queryKey: ['/api/users', 'technician'],
    queryFn: async () => {
      return await apiRequest('/api/users', 'GET', null, { params: { role: 'technician' } });
    },
    enabled: isAdmin,
  });
  
  // State for technician selection in admin payment request form
  const [selectedTechnician, setSelectedTechnician] = useState<number | undefined>();
  
  // All services that can be added to a payment request (completed but not in a payment request)
  const completableServices = services?.filter(service => 
    (service.status === "completed" && 
    (!selectedTechnician || service.technician?.id === selectedTechnician))
  );
  
  // Serviços do técnico logado com status "completed" (para pedidos de pagamento)
  const completedTechnicianServices = services?.filter(service => {
    console.log("Verificando serviço:", service);
    console.log("Status do serviço:", service.status);
    console.log("ID do técnico no serviço:", service.technician?.id);
    console.log("ID do técnico atual:", currentUser?.id);
    console.log("É o mesmo técnico?", service.technician?.id === currentUser?.id);
    console.log("Status é completed?", service.status === "completed");
    console.log("completedTechnicianServices será:", service.status === "completed" && service.technician?.id === currentUser?.id);
    return service.status === "completed" && service.technician?.id === currentUser?.id;
  });
  
  // Mutation para criar pedido de pagamento
  const createPaymentRequestMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      // Se for admin, inclui o técnico selecionado (ou null se não houver)
      if (isAdmin) {
        return await apiRequest('/api/payment-requests', 'POST', { 
          service_ids: serviceIds,
          technician_id: selectedTechnician
        });
      } else {
        // Para técnicos, usa apenas os IDs de serviço
        return await apiRequest('/api/payment-requests', 'POST', { 
          service_ids: serviceIds
        });
      }
    },
    onSuccess: () => {
      // Invalidar cache para atualizar dados de serviços e pedidos
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      
      setSelectedServices([]);
      setPaymentRequestDialogOpen(false);
      toast({
        title: "Pedido de pagamento criado",
        description: "Seu pedido foi enviado para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar pedido",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atualizar status de pedido de pagamento (aprovar/rejeitar)
  const updatePaymentRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: string }) => {
      return await apiRequest(`/api/payment-requests/${requestId}`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      toast({
        title: "Pedido atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar pedido",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para registrar pagamento de um pedido
  const registerPaymentMutation = useMutation({
    mutationFn: async ({ requestId, paymentData }: { requestId: number, paymentData: PaymentFormValues }) => {
      return await apiRequest(`/api/payment-requests/${requestId}/pay`, 'PATCH', { 
        payment_date: paymentData.payment_date,
        payment_details: {
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
          payment_notes: paymentData.payment_notes
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      setPaymentDialogOpen(false);
      setSelectedPaymentRequest(null);
      paymentForm.reset({
        payment_method: "",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        payment_notes: ""
      });
      toast({
        title: "Pagamento registrado",
        description: "O pagamento foi registrado com sucesso e uma despesa foi criada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar pagamento",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleApprovePaymentRequest = (requestId: number) => {
    updatePaymentRequestMutation.mutate({ requestId, status: "aprovado" });
  };

  const handleRejectPaymentRequest = (requestId: number) => {
    updatePaymentRequestMutation.mutate({ requestId, status: "rejeitado" });
  };
  
  const handleOpenPaymentDialog = (paymentRequest: PaymentRequest) => {
    setSelectedPaymentRequest(paymentRequest);
    setPaymentDialogOpen(true);
  };
  
  const handleSubmitPayment = (data: PaymentFormValues) => {
    if (!selectedPaymentRequest) return;
    
    registerPaymentMutation.mutate({ 
      requestId: selectedPaymentRequest.id, 
      paymentData: data 
    });
  };

  const handleCreatePaymentRequest = () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Nenhum serviço selecionado",
        description: "Selecione pelo menos um serviço para solicitar pagamento.",
        variant: "destructive",
      });
      return;
    }
    
    createPaymentRequestMutation.mutate(selectedServices);
  };
  
  // Toggle seleção de serviço para pagamento
  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };
  
  // Verifica se o técnico tem pedidos de pagamento
  const hasTechnicianPaymentRequests = paymentRequests && 
    Array.isArray(paymentRequests) && 
    paymentRequests.some(req => req.technician_id === currentUser?.id);
    
  // Logs adicionais para diagnóstico
  console.log("completedTechnicianServices:", completedTechnicianServices);
  console.log("hasTechnicianPaymentRequests:", hasTechnicianPaymentRequests);
  console.log("isAdmin:", isAdmin);
  console.log("currentUser completo:", currentUser);
  
  // Mostrar mensagem somente se não houver serviços completados E não houver pedidos
  if (!isAdmin && !completedTechnicianServices?.length && !hasTechnicianPaymentRequests) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={t("finances.title")}
          description={t("finances.description")}
        />
        
        <Tabs defaultValue="payment_requests" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="payment_requests">Pedidos de Pagamento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment_requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pedidos de Pagamento</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Você não tem serviços concluídos para solicitar pagamento.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-center items-center py-10 text-gray-500">
                  Nenhum serviço disponível para solicitar pagamento.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Logs para diagnóstico
  console.log("Usuário:", currentUser);
  console.log("Perfil técnico?", currentUser?.role === 'technician');

  // Interface para técnicos (Dashboard Financeiro e Pedidos de Pagamento)
  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={t("finances.title")}
          description={t("finances.description")}
        />
        
        {/* Cards de resumo para técnicos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{t("finances.valoresRecebidos")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingFinanceStats ? "..." : formatCurrency(techFinanceStats?.receivedValue || 0)}</div>
              <div className="text-xs text-gray-500">{t("finances.pagamentosRealizados")}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{t("finances.valoresFaturados")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingFinanceStats ? "..." : formatCurrency(techFinanceStats?.invoicedValue || 0)}</div>
              <div className="text-xs text-gray-500">{t("finances.pagamentosAprovados")}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{t("finances.emAprovacao")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingFinanceStats ? "..." : formatCurrency(techFinanceStats?.pendingValue || 0)}</div>
              <div className="text-xs text-gray-500">{t("finances.pedidosPendentes")}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{t("finances.naoSolicitados")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingFinanceStats ? "..." : formatCurrency(techFinanceStats?.unpaidCompletedValue || 0)}</div>
              <div className="text-xs text-gray-500">{t("finances.servicosConcluidosNaoSolicitados")}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráficos para técnicos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("finances.visaoGeralPagamentos")}</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoadingFinanceStats ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <TechnicianPaymentsPieChart financialStats={techFinanceStats} />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t("finances.byMonth")}</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoadingFinanceStats ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <MonthlyPaymentsChart monthlyData={techFinanceStats?.monthlyData || []} />
              )}
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="payment_requests" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="payment_requests">{t("finances.pedidosDePagamento")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment_requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("finances.pedidosDePagamento")}</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setPaymentRequestDialogOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("finances.newPaymentRequest")}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPaymentRequests ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : !paymentRequests || !Array.isArray(paymentRequests) || paymentRequests.length === 0 ? (
                  <div className="flex justify-center items-center py-8 text-gray-500">
                    {t("finances.nenhumPedidoPagamentoEncontrado")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>{t("finances.table.date")}</TableHead>
                        <TableHead>{t("finances.table.status")}</TableHead>
                        <TableHead className="text-right">{t("finances.table.value")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests
                        .filter(req => req.technician_id === currentUser?.id)
                        .map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>#{request.id}</TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell>
                              <Badge className={
                                request.status === "aguardando_aprovacao" ? "bg-amber-600" :
                                request.status === "aprovado" ? "bg-green-600" :
                                request.status === "rejeitado" ? "bg-red-600" :
                                "bg-gray-600"
                              }>
                                {request.status === "aguardando_aprovacao" ? t("services.status.awaiting_approval") :
                                 request.status === "aprovado" ? t("services.status.approved") :
                                 request.status === "rejeitado" ? t("services.status.rejected") : request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                request.services?.reduce((sum: number, s: any) => {
                                  // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
                                  // Para admin, mostrar a soma dos valores totais
                                  const valueToAdd = isAdmin ? (s.total || 0) : (s.price || 0);
                                  return sum + valueToAdd;
                                }, 0) || 0
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Modal para criar pedido de pagamento */}
        <Dialog open={paymentRequestDialogOpen} onOpenChange={setPaymentRequestDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("finances.newPaymentRequest")}</DialogTitle>
              <DialogDescription>
                {t("finances.payment.selectServices")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : completedTechnicianServices?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t("finances.payment.noCompletedServices")}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {completedTechnicianServices?.map(service => (
                    <div 
                      key={service.id} 
                      className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleServiceSelection(service.id)}
                    >
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded" 
                        checked={selectedServices.includes(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {service.client.name} - {service.service_type?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(service.created_at)} - OS #{service.id}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(isAdmin ? (service.total || 0) : (service.price || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <span className="font-medium">{t("finances.payment.totalSelected")}: </span>
                {formatCurrency(
                  completedTechnicianServices
                    ?.filter(service => selectedServices.includes(service.id))
                    .reduce((sum, service) => {
                      // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
                      // Para admin, mostrar a soma dos valores totais
                      const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
                      return sum + valueToAdd;
                    }, 0) || 0
                )}
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentRequestDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleCreatePaymentRequest}
                  disabled={selectedServices.length === 0 || createPaymentRequestMutation.isPending}
                >
                  {createPaymentRequestMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      {t("common.sending")}
                    </div>
                  ) : t("finances.payment.sendRequest")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Filter financially relevant services (completed, awaiting approval/payment, invoiced, paid)
  console.log("Todos os serviços:", services);
  
  const financiallyRelevantServices = services?.filter(service => 
    ["completed", "aguardando_aprovacao", "aguardando_pagamento", "faturado", "pago"].includes(service.status)
  );
  
  console.log("Serviços financeiramente relevantes:", financiallyRelevantServices);
  
  // Calculate stats
  const calculateStats = () => {
    console.log("Chamando calculateStats");
    console.log("isAdmin:", isAdmin);
    console.log("period:", period);
    
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      console.log("Sem serviços financeiramente relevantes para calcular estatísticas");
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        profit: 0,
        servicesCount: 0,
        averageTicket: 0,
      };
    }
    
    const now = new Date();
    const filteredServices = financiallyRelevantServices.filter(service => {
      const serviceDate = new Date(service.created_at || "");
      if (period === "week") {
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return serviceDate >= weekAgo;
      } else if (period === "month") {
        // Last 30 days
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return serviceDate >= monthAgo;
      } else if (period === "year") {
        // This year
        return serviceDate.getFullYear() === now.getFullYear();
      }
      return true; // All time
    });
    
    const totalRevenue = filteredServices.reduce((sum, service) => {
      // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
      // Para admin, mostrar a soma dos valores do serviço + taxa administrativa
      if (isAdmin) {
        const servicePrice = service.price || 0;
        const adminFee = service.administrative_fee || 0;
        return sum + servicePrice + adminFee;
      } else {
        return sum + (service.price || 0);
      }
    }, 0);
    const servicesCount = filteredServices.length;
    const averageTicket = servicesCount > 0 ? totalRevenue / servicesCount : 0;
    
    // Calcular total de despesas para o mesmo período
    const filteredExpenses = expenses?.filter(expense => {
      if (!expense.date) return false;
      
      const expenseDate = new Date(expense.date);
      if (period === "week") {
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return expenseDate >= weekAgo;
      } else if (period === "month") {
        // Last 30 days
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return expenseDate >= monthAgo;
      } else if (period === "year") {
        // This year
        return expenseDate.getFullYear() === now.getFullYear();
      }
      return true; // All time
    }) || [];
    
    const totalExpenses = filteredExpenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0);
    }, 0);
    
    // Calcular lucro (receita - despesas)
    const profit = totalRevenue - totalExpenses;
    
    return {
      totalRevenue,
      totalExpenses,
      profit,
      servicesCount,
      averageTicket,
    };
  };
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      return [];
    }
    
    const now = new Date();
    const chartData: { name: string; value: number }[] = [];
    
    if (period === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        const dayTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= date && serviceDate < nextDate;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores do serviço + taxa administrativa
            if (isAdmin) {
              const servicePrice = service.price || 0;
              const adminFee = service.administrative_fee || 0;
              return sum + servicePrice + adminFee;
            } else {
              return sum + (service.price || 0);
            }
          }, 0);
        
        chartData.push({
          name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          value: dayTotal,
        });
      }
    } else if (period === "month") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weekTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= weekStart && serviceDate < weekEnd;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores do serviço + taxa administrativa
            if (isAdmin) {
              const servicePrice = service.price || 0;
              const adminFee = service.administrative_fee || 0;
              return sum + servicePrice + adminFee;
            } else {
              return sum + (service.price || 0);
            }
          }, 0);
        
        chartData.push({
          name: `Semana ${4-i}`,
          value: weekTotal,
        });
      }
    } else if (period === "year") {
      // Months in this year
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), i, 1);
        const monthEnd = new Date(now.getFullYear(), i + 1, 0);
        
        const monthTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= monthStart && serviceDate <= monthEnd;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores do serviço + taxa administrativa
            if (isAdmin) {
              const servicePrice = service.price || 0;
              const adminFee = service.administrative_fee || 0;
              return sum + servicePrice + adminFee;
            } else {
              return sum + (service.price || 0);
            }
          }, 0);
        
        chartData.push({
          name: monthNames[i],
          value: monthTotal,
        });
      }
    }
    
    return chartData;
  };
  
  // Prepare service type distribution
  const prepareServiceTypeData = () => {
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      return [];
    }
    
    const serviceTypes: {[key: string]: number} = {};
    
    financiallyRelevantServices.forEach(service => {
      const typeName = service.service_type?.name || "Desconhecido";
      if (serviceTypes[typeName]) {
        serviceTypes[typeName]++;
      } else {
        serviceTypes[typeName] = 1;
      }
    });
    
    return Object.entries(serviceTypes).map(([name, value]) => ({
      name,
      value,
    }));
  };
  
  // Prepare expenses by category data
  const prepareExpensesByCategoryData = () => {
    if (!expenses || expenses.length === 0) {
      return [];
    }
    
    const categories: {[key: string]: number} = {};
    
    expenses.forEach(expense => {
      const categoryName = expense.type || "Outros";
      const normalizedCategory = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
      
      if (categories[normalizedCategory]) {
        categories[normalizedCategory] += expense.amount;
      } else {
        categories[normalizedCategory] = expense.amount;
      }
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  };
  
  // Prepare monthly expenses data
  const prepareMonthlyExpensesData = () => {
    if (!expenses || expenses.length === 0) {
      return [];
    }
    
    const now = new Date();
    const monthlyData: { name: string; value: number }[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Create a map with all months initialized to 0
    const monthTotals: {[key: string]: number} = {};
    for (let i = 0; i < 12; i++) {
      monthTotals[monthNames[i]] = 0;
    }
    
    // Sum expenses by month
    expenses.forEach(expense => {
      if (!expense.date) return;
      
      const expenseDate = new Date(expense.date);
      // Only consider expenses from current year
      if (expenseDate.getFullYear() === now.getFullYear()) {
        const monthName = monthNames[expenseDate.getMonth()];
        monthTotals[monthName] += expense.amount;
      }
    });
    
    // Convert to array format for chart
    for (let i = 0; i < 12; i++) {
      monthlyData.push({
        name: monthNames[i],
        value: monthTotals[monthNames[i]]
      });
    }
    
    return monthlyData;
  };
  
  const stats = calculateStats();
  const chartData = prepareChartData();
  const serviceTypeData = prepareServiceTypeData();
  const expensesByCategoryData = prepareExpensesByCategoryData();
  const monthlyExpensesData = prepareMonthlyExpensesData();
  
  // Chart colors
  const COLORS = ['#1a5276', '#2e86c1', '#f39c12', '#27ae60', '#e74c3c'];
  
  // Mutation para criar nova despesa
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      // Converter a string de valor para número
      const cleanAmount = data.amount.replace(/[€\s]/g, '').replace(',', '.');
      const amount = parseFloat(cleanAmount);
      
      return await apiRequest('/api/expenses', 'POST', {
        type: data.category,
        amount,
        date: data.date,
        description: data.description,
        payment_method: 'manual', // Valor padrão
        notes: data.notes,
        provider: data.provider
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Despesa registrada",
        description: "A despesa foi registrada com sucesso.",
      });
      expenseForm.reset();
      setExpenseDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar despesa",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Lidar com o envio do formulário de despesas
  function onExpenseSubmit(data: ExpenseFormValues) {
    createExpenseMutation.mutate(data);
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t("finances.title")}
        description={t("finances.description")}
      />
      
      <div className="mt-6 mb-6">
        <div className="w-full max-w-xs">
          <Select
            value={period}
            onValueChange={setPeriod}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("finances.period.week")}</SelectItem>
              <SelectItem value="month">{t("finances.period.month")}</SelectItem>
              <SelectItem value="year">{t("finances.period.year")}</SelectItem>
              <SelectItem value="all">{t("finances.period.all")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("finances.totalRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("finances.totalExpenses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("finances.netProfit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.profit || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("finances.completedServices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.servicesCount}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">{t("finances.faturamento")}</TabsTrigger>
          <TabsTrigger value="services">{t("finances.servicos")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("finances.transacoes")}</TabsTrigger>
          <TabsTrigger value="payment_requests">{t("finances.pedidosDePagamento")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("finances.despesas")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("finances.revenueBy", { defaultValue: "Faturamento por" })} 
                {period === "week" 
                  ? t("finances.byDay", { defaultValue: "Dia" }) 
                  : period === "month" 
                    ? t("finances.byWeek", { defaultValue: "Semana" }) 
                    : t("finances.byMonth", { defaultValue: "Mês" })
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `€ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`€ ${value}`, "Faturamento"]}
                      />
                      <Bar dataKey="value" fill="#1a5276" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("finances.distributionByServiceType")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={false}
                        >
                          {serviceTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t("finances.monthlyComparison")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t("finances.currentMonth")}</span>
                    <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t("finances.previousMonth")}</span>
                    <span className="font-medium">{formatCurrency(stats.totalRevenue * 0.85)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t("finances.variation")}</span>
                      <div className="flex items-center text-success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className="font-medium">+15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>{t("finances.servicesByStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t("services.status.pending"), value: services?.filter(s => s.status === "pending").length || 0 },
                          { name: t("services.status.completed"), value: services?.filter(s => s.status === "completed").length || 0 },
                          { name: t("services.status.awaiting_approval"), value: services?.filter(s => s.status === "aguardando_aprovacao").length || 0 },
                          { name: t("services.status.invoiced"), value: services?.filter(s => s.status === "faturado").length || 0 },
                          { name: t("services.status.paid"), value: services?.filter(s => s.status === "pago").length || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
                      >
                        <Cell fill="#1E40AF" /> {/* Pendentes - azul escuro */}
                        <Cell fill="#15803D" /> {/* Concluídos - verde */}
                        <Cell fill="#9A3412" /> {/* Aguardando Aprovação - amarelo/laranja */}
                        <Cell fill="#6D28D9" /> {/* Faturados - roxo */}
                        <Cell fill="#0E7490" /> {/* Pagos - verde-agua */}
                      </Pie>
                      <Tooltip />
                      <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>{t("finances.latestTransactions")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finances.table.date")}</TableHead>
                    <TableHead>{t("finances.table.client")}</TableHead>
                    <TableHead>{t("finances.table.service")}</TableHead>
                    <TableHead>{t("finances.table.status")}</TableHead>
                    <TableHead className="text-right">{t("finances.table.value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : financiallyRelevantServices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {t("finances.nenhumaTransacaoEncontrada")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    financiallyRelevantServices?.slice(0, 10).map((service) => (
                      <TableRow key={service.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(service.created_at)}</TableCell>
                        <TableCell>{service.client.name}</TableCell>
                        <TableCell>{service.service_type?.name || "Serviço não especificado"}</TableCell>
                        <TableCell>
                          <ServiceStatusBadge status={service.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {isAdmin 
                            ? formatCurrency((service.price || 0) + (service.administrative_fee || 0)) 
                            : formatCurrency(service.price || 0)
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment_requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("finances.paymentRequests")}</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setPaymentRequestDialogOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("finances.newRequest")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPaymentRequests ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : !paymentRequests || !Array.isArray(paymentRequests) || paymentRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <p className="text-gray-500 mb-2">{t("finances.nenhumPedidoPagamentoEncontrado")}</p>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {paymentRequests.map((request: PaymentRequest) => (
                    <div key={request.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div>
                          <span className="font-medium">Pedido #{request.id}</span>
                          <span className="text-sm text-gray-500 ml-4">
                            {formatRelativeDate(request.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            request.status === "aguardando_aprovacao" ? "bg-amber-600" :
                            request.status === "aprovado" ? "bg-green-600" :
                            request.status === "rejeitado" ? "bg-red-600" :
                            "bg-gray-600"
                          }>
                            {request.status === "aguardando_aprovacao" ? "Aguardando Aprovação" :
                             request.status === "aprovado" ? "Aprovado" :
                             request.status === "rejeitado" ? "Rejeitado" : request.status}
                          </Badge>
                          {request.status === "aguardando_aprovacao" && (
                            <div className="flex space-x-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700 hover:bg-green-50">
                                    Aprovar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("finances.approvePaymentRequest")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("finances.approvePaymentRequestConfirmation")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleApprovePaymentRequest(request.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700 hover:bg-red-50">
                                    Rejeitar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rejeitar Pedido de Pagamento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja rejeitar este pedido de pagamento? Esta ação irá marcar os serviços relacionados como "completed" novamente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRejectPaymentRequest(request.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          
                          {/* Botão de Pagar para pedidos aprovados */}
                          {request.status === "aprovado" && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenPaymentDialog(request)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pagar
                              </Button>
                            </div>
                          )}
                          
                          {/* Mostrar data de pagamento para pedidos pagos */}
                          {request.status === "pago" && request.payment_date && (
                            <div className="text-sm text-gray-500">
                              Pago em: {formatDate(request.payment_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-2">
                          <span className="font-medium">Técnico: </span>
                          <span>{request.technician?.name || 'N/A'}</span>
                        </div>
                        
                        <div className="border rounded-md mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>OS</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Serviço</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {request.services?.map((service: any) => (
                                <TableRow key={service.id}>
                                  <TableCell>#{service.id}</TableCell>
                                  <TableCell>{service.client?.name}</TableCell>
                                  <TableCell>{service.service_type?.name}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(service.price || 0)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Total:</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(
                                    request.services?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || 0
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("finances.expenses")}</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setExpenseDialogOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("finances.newExpense")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finances.table.date")}</TableHead>
                    <TableHead>{t("finances.table.description")}</TableHead>
                    <TableHead>{t("finances.table.type")}</TableHead>
                    <TableHead>{t("finances.table.provider")}</TableHead>
                    <TableHead>{t("finances.table.paymentMethod")}</TableHead>
                    <TableHead className="text-right">{t("finances.table.value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExpenses ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !expenses || expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t("finances.nenhumaDespesaEncontrada")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge className={
                            expense.type === "salario" ? "bg-blue-600" : 
                            expense.type === "operacional" ? "bg-green-600" :
                            expense.type === "material" ? "bg-amber-600" : 
                            "bg-slate-600"
                          }>
                            {expense.type === "salario" ? t("finances.expenseType.salario") :
                             expense.type === "operacional" ? t("finances.expenseType.operacional") :
                             expense.type === "material" ? t("finances.expenseType.material") :
                             expense.type === "aluguel" ? t("finances.expenseType.aluguel") :
                             expense.type === "alimentacao" ? t("finances.expenseType.alimentacao") :
                             expense.type === "transporte" ? t("finances.expenseType.transporte") : 
                             expense.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.provider}</TableCell>
                        <TableCell>{expense.payment_method}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("finances.expensesByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {loadingExpenses ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : expensesByCategoryData.length === 0 ? (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-gray-500">{t("reports.noData")}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={false}
                        >
                          {expensesByCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(value as number), "Valor"]} />
                        <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t("finances.monthlyExpenses")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {loadingExpenses ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : monthlyExpensesData.every(item => item.value === 0) ? (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-gray-500">{t("reports.noData")}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyExpensesData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => `€ ${value}`}
                        />
                        <Tooltip 
                          formatter={(value) => [`€ ${value}`, "Despesas"]}
                        />
                        <Bar dataKey="value" fill="#e74c3c" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Expense Modal */}
      {/* New Payment Request Modal for Admin */}
      {isAdmin && (
        <Dialog open={paymentRequestDialogOpen} onOpenChange={setPaymentRequestDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("finances.newPaymentRequest")}</DialogTitle>
              <DialogDescription>
                {t("finances.selectCompletedServices")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <Label>{t("finances.payment.technician")}:</Label>
                    <Select
                      value={selectedTechnician?.toString() || ""}
                      onValueChange={(value) => setSelectedTechnician(value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder={t("finances.payment.selectTechnicianOptional")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("finances.payment.noTechnician")}</SelectItem>
                        {technicians?.map(tech => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {completableServices?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {t("finances.nenhumServicoDisponivel")}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {completableServices?.map(service => (
                        <div 
                          key={service.id} 
                          className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleServiceSelection(service.id)}
                        >
                          <input 
                            type="checkbox" 
                            className="h-5 w-5 rounded" 
                            checked={selectedServices.includes(service.id)}
                            onChange={() => toggleServiceSelection(service.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {service.client?.name} - {service.service_type?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(service.created_at)} - {t("finances.serviceOrder")} #{service.id}
                              {service.technician ? ` - ${t("finances.payment.technician")}: ${service.technician.name}` : ` - ${t("finances.payment.noTechnician")}`}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(service.price || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <span className="font-medium">{t("finances.payment.totalSelected")}: </span>
                {formatCurrency(
                  completableServices
                    ?.filter(service => selectedServices.includes(service.id))
                    .reduce((sum, service) => {
                      // Always use the technician's price for payment request calculation
                      // This is the amount that will be paid to the technician
                      const valueToAdd = service.price || 0;
                      return sum + valueToAdd;
                    }, 0) || 0
                )}
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentRequestDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleCreatePaymentRequest}
                  disabled={selectedServices.length === 0 || createPaymentRequestMutation.isPending}
                >
                  {createPaymentRequestMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      {t("common.sending")}
                    </div>
                  ) : t("finances.payment.createRequest")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* New Expense Modal */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("finances.registerNewExpense")}</DialogTitle>
            <DialogDescription>
              {t("finances.fillExpenseForm")}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.description")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("finances.form.enterExpenseDescription")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.amount")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="€ 0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("finances.form.date")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expenseForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("finances.form.category")}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("finances.form.selectCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="operacional">{t("finances.categories.operational")}</SelectItem>
                          <SelectItem value="salario">{t("finances.categories.salary")}</SelectItem>
                          <SelectItem value="material">{t("finances.categories.material")}</SelectItem>
                          <SelectItem value="aluguel">{t("finances.categories.rent")}</SelectItem>
                          <SelectItem value="alimentacao">{t("finances.categories.food")}</SelectItem>
                          <SelectItem value="transporte">{t("finances.categories.transportation")}</SelectItem>
                          <SelectItem value="outras">{t("finances.categories.others")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={expenseForm.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.provider")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("finances.form.enterProviderName")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("finances.form.additionalExpenseInfo")}
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setExpenseDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("finances.registerPayment")}</DialogTitle>
            <DialogDescription>
              {t("finances.registerPaymentDetails", { technician: selectedPaymentRequest?.technician?.name })}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleSubmitPayment)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.paymentMethod")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("finances.form.selectPaymentMethod")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pix">{t("finances.paymentMethods.pix")}</SelectItem>
                        <SelectItem value="transferencia">{t("finances.paymentMethods.bankTransfer")}</SelectItem>
                        <SelectItem value="dinheiro">{t("finances.paymentMethods.cash")}</SelectItem>
                        <SelectItem value="cheque">{t("finances.paymentMethods.check")}</SelectItem>
                        <SelectItem value="outro">{t("finances.paymentMethods.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.paymentDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="transaction_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.transactionId")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("finances.form.transactionIdPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="payment_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("finances.form.paymentNotes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("finances.form.additionalPaymentInfo")}
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 border-t">
                <div className="mb-4 flex justify-between">
                  <span className="font-semibold">{t("finances.amountToPay")}:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      selectedPaymentRequest?.services?.reduce((sum: number, s: any) => {
                        return sum + (s.price || 0);
                      }, 0) || 0
                    )}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit"
                  disabled={registerPaymentMutation.isPending}
                >
                  {registerPaymentMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      {t("common.processing")}
                    </div>
                  ) : t("finances.confirmPayment")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

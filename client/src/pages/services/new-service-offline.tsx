import React, { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import offlineDb from "@/lib/offlineDb";

// Componente de formulário simplificado para criação offline
export function NewServiceOffline() {
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    cliente: "",
    veiculo: "",
    tipo_servico: "Granizo",
    descricao: "",
    endereco: "",
    data: new Date().toISOString().split('T')[0],
    valor: "0"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Criar um objeto de serviço com dados mínimos
      const serviceData = {
        client_id: 1, // ID padrão para o primeiro cliente
        vehicle_id: 1, // ID padrão para o primeiro veículo
        service_type_id: formData.tipo_servico === "Granizo" ? 2 : (formData.tipo_servico === "Amassado de Rua" ? 1 : 3),
        technician_id: 7, // ID padrão para o técnico
        status: "pending",
        description: formData.descricao,
        scheduled_date: formData.data,
        location_type: "client_location",
        address: formData.endereco,
        latitude: 0, // Coordenadas padrão
        longitude: 0, // Coordenadas padrão
        price: parseFloat(formData.valor) || 0,
        administrative_fee: 0,
        total: parseFloat(formData.valor) || 0,
        notes: `Criado no modo offline - Cliente: ${formData.cliente}, Veículo: ${formData.veiculo}`,
        _isOffline: true,
        _offline: true
      };

      // Salvar no banco de dados offline diretamente
      const offlineId = await offlineDb.getTableByName("services").add({
        ...serviceData,
        id: Math.floor(Math.random() * -1000000), // ID negativo temporário
        created_at: new Date().toISOString()
      });

      console.log("Serviço salvo offline com ID temporário:", offlineId);

      // Adicionar à fila de sincronização
      await offlineDb.getTableByName("pendingRequests").add({
        id: Date.now(),
        url: "/api/services",
        method: "POST",
        body: serviceData,
        timestamp: Date.now(),
        operationType: "create",
        tableName: "services",
        resourceId: offlineId
      });

      toast({
        title: "Serviço salvo offline",
        description: "O serviço foi salvo localmente e será sincronizado quando houver conexão."
      });

      setLocation("/services");
    } catch (error) {
      console.error("Erro ao salvar serviço offline:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o serviço offline. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Novo Serviço (Modo Offline)"
        description="Cadastre um serviço em modo offline simplificado"
        actions={
          <Button variant="outline" onClick={() => setLocation('/services')}>
            Cancelar
          </Button>
        }
      />

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              Você está offline. Este é um formulário simplificado para cadastrar serviços. 
              Os dados serão sincronizados automaticamente quando a conexão for restaurada.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome do Cliente
              </label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                placeholder="Digite o nome do cliente"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Veículo
              </label>
              <input
                type="text"
                name="veiculo"
                value={formData.veiculo}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                placeholder="Marca e modelo do veículo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Serviço
              </label>
              <select
                name="tipo_servico"
                value={formData.tipo_servico}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="Granizo">Granizo</option>
                <option value="Amassado de Rua">Amassado de Rua</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Descrição
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Descreva o problema"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localização e Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Endereço
              </label>
              <input
                type="text"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                placeholder="Digite o endereço completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Data do Serviço
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Valor (€)
              </label>
              <input
                type="number"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => setLocation('/services')}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar Serviço Offline"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default NewServiceOffline;
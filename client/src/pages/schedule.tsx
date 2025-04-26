import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ServiceListItem, User } from "@/types";
import { ptBR } from "date-fns/locale";
import { format, isSameDay } from "date-fns";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function Schedule() {
  const [_, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  // Get all technicians
  const { data: technicians } = useQuery<User[]>({
    queryKey: ['/api/users?role=technician'],
    enabled: isAdmin,
  });
  
  // Get all services
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
  });
  
  // Filter services for the selected date and technician
  const filteredServices = services?.filter(service => {
    const matchesDate = service.scheduled_date && 
      selectedDate && 
      isSameDay(new Date(service.scheduled_date), selectedDate);
    
    const matchesTechnician = selectedTechnician === "all" || 
      (service.technician && service.technician.id.toString() === selectedTechnician);
    
    return matchesDate && (isAdmin ? matchesTechnician : true);
  });
  
  // Get dates with services for highlighting in the calendar
  const datesWithServices = services?.reduce((dates: Date[], service) => {
    if (service.scheduled_date) {
      const date = new Date(service.scheduled_date);
      // Check if the technician filter applies
      if (selectedTechnician === "all" || 
          (service.technician && service.technician.id.toString() === selectedTechnician)) {
        dates.push(date);
      }
    }
    return dates;
  }, []);
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Agenda"
        description="Gerencie os agendamentos de serviços"
        actions={
          <Link href="/services/new">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Agendamento
            </Button>
          </Link>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              {isAdmin && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Técnico</label>
                  <Select
                    value={selectedTechnician}
                    onValueChange={setSelectedTechnician}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os técnicos</SelectItem>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="border rounded-md p-3"
                modifiers={{
                  hasService: datesWithServices || [],
                }}
                modifiersClassNames={{
                  hasService: "bg-primary/20",
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">
                Agendamentos para {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Nenhuma data selecionada"}
              </h3>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredServices?.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Nenhum agendamento para esta data</p>
                  <Link href="/services/new">
                    <Button className="mt-4" variant="outline">
                      Criar Novo Agendamento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredServices?.map((service) => (
                    <div 
                      key={service.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setLocation(`/services/${service.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.client.name}</p>
                          <p className="text-sm text-gray-500">
                            {service.vehicle.make} {service.vehicle.model}
                            {service.vehicle.license_plate && ` - ${service.vehicle.license_plate}`}
                          </p>
                        </div>
                        <ServiceStatusBadge status={service.status} />
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-500">
                            {service.scheduled_date ? format(new Date(service.scheduled_date), "HH:mm", { locale: ptBR }) : "Horário não definido"}
                          </span>
                        </div>
                        <div className={cn(
                          "text-sm font-medium",
                          service.technician ? "text-gray-900" : "text-gray-500"
                        )}>
                          {service.technician ? service.technician.name : "Técnico não atribuído"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

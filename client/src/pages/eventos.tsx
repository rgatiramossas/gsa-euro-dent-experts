import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { ptBR, de, es } from "date-fns/locale";
import { format, isSameDay, parseISO, addHours } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

// Interface para os tipos de evento
interface EventType {
  id: number;
  name: string;
  color: string;
}

// Interface para os técnicos
interface User {
  id: number;
  name: string;
  role: string;
}

// Interface para os eventos
interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  event_type_id: number;
  technician_id: number;
  created_at: string;
  event_type?: {
    name: string;
    color: string;
  };
  technician?: {
    name: string;
  };
}

// Schema para validação do formulário
const createEventFormSchema = (t: any) => z.object({
  title: z.string().min(3, t('validation.titleMinLength', { defaultValue: 'O título deve ter no mínimo 3 caracteres' })),
  description: z.string().optional(),
  date: z.date(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t('validation.invalidTimeFormat', { defaultValue: 'Formato de hora inválido' })),
  duration: z.number()
    .min(15, t('validation.durationMin', { defaultValue: 'A duração mínima é de 15 minutos' }))
    .max(480, t('validation.durationMax', { defaultValue: 'A duração máxima é de 8 horas' })),
  event_type_id: z.number(),
  technician_id: z.number()
});

// Definir o tipo com base no schema gerado pela função 
// Precisamos definir manualmente para evitar problemas de inferência
interface EventFormValues {
  title: string;
  description?: string;
  date: Date;
  time: string;
  duration: number;
  event_type_id: number;
  technician_id: number;
}

export default function Eventos() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  // Criar schema com traduções atualizadas
  const eventFormSchema = createEventFormSchema(t);
  
  // Obter o locale apropriado para date-fns
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'de':
        return de;
      case 'es':
        return es;
      default:
        return ptBR;
    }
  };
  
  // Configuração do formulário com react-hook-form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      time: '09:00',
      duration: 60,
      event_type_id: 1,
      technician_id: currentUser?.role === 'technician' ? currentUser.id : undefined
    }
  });

  // Obter todos os técnicos
  const { data: technicians } = useQuery<User[]>({
    queryKey: ['/api/users?role=technician'],
  });
  
  // Obter todos os tipos de eventos
  const { data: eventTypes } = useQuery<EventType[]>({
    queryKey: ['/api/event-types'],
  });
  
  // Obter todos os eventos
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });
  
  // Filtrar eventos para a data e técnico selecionados
  const filteredEvents = events?.filter(event => {
    const matchesDate = event.date && 
      selectedDate && 
      isSameDay(parseISO(event.date), selectedDate);
    
    const matchesTechnician = selectedTechnician === "all" || 
      (event.technician_id.toString() === selectedTechnician);
    
    return matchesDate && (isAdmin ? matchesTechnician : (event.technician_id === currentUser?.id));
  });
  
  // Obter datas com eventos para destacar no calendário
  const datesWithEvents = events?.reduce((dates: Date[], event) => {
    if (event.date) {
      const date = parseISO(event.date);
      // Verificar se o filtro de técnico se aplica
      if (selectedTechnician === "all" || 
          (event.technician_id.toString() === selectedTechnician)) {
        dates.push(date);
      }
    }
    return dates;
  }, []);

  // Mutação para criar novos eventos
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const formattedDate = format(data.date, 'yyyy-MM-dd');
      const response = await apiRequest('POST', '/api/events', {
        ...data,
        date: formattedDate
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: t('events.eventCreated'),
        description: t('events.eventCreated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.createEvent'),
        description: t('errors.createEventDescription', { defaultValue: "Ocorreu um erro ao criar o evento. Tente novamente." }),
        variant: "destructive",
      });
    }
  });

  // Mutação para atualizar eventos existentes
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormValues & { id: number }) => {
      const { id, ...eventData } = data;
      const formattedDate = format(eventData.date, 'yyyy-MM-dd');
      const response = await apiRequest('PUT', `/api/events/${id}`, {
        ...eventData,
        date: formattedDate
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({
        title: t('events.eventUpdated'),
        description: t('events.eventUpdated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.updateEvent', { defaultValue: "Erro ao atualizar evento" }),
        description: t('errors.updateEventDescription', { defaultValue: "Ocorreu um erro ao atualizar o evento. Tente novamente." }),
        variant: "destructive",
      });
    }
  });

  // Mutação para excluir eventos
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: t('events.eventDeleted'),
        description: t('events.eventDeleted'),
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.deleteEvent', { defaultValue: "Erro ao excluir evento" }),
        description: t('errors.deleteEventDescription', { defaultValue: "Ocorreu um erro ao excluir o evento. Tente novamente." }),
        variant: "destructive",
      });
    }
  });

  // Função para lidar com a submissão do formulário
  const onSubmit = (data: EventFormValues) => {
    if (editingEvent) {
      updateEventMutation.mutate({ ...data, id: editingEvent.id });
    } else {
      createEventMutation.mutate(data);
    }
  };

  // Função para abrir o diálogo de criação de evento
  const handleNewEvent = () => {
    setEditingEvent(null);
    form.reset({
      title: '',
      description: '',
      date: selectedDate,
      time: '09:00',
      duration: 60,
      event_type_id: eventTypes?.[0]?.id || 1,
      technician_id: currentUser?.role === 'technician' ? currentUser.id : (technicians?.[0]?.id || 1)
    });
    setDialogOpen(true);
  };

  // Função para abrir o diálogo de edição de evento
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || '',
      date: parseISO(event.date),
      time: event.time,
      duration: event.duration,
      event_type_id: event.event_type_id,
      technician_id: event.technician_id
    });
    setDialogOpen(true);
  };

  // Função para confirmar a exclusão de um evento
  const handleDeleteEvent = (id: number) => {
    if (window.confirm(t('events.confirmDelete'))) {
      deleteEventMutation.mutate(id);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={t('events.title')}
        description={t('events.description')}
        actions={
          <Button onClick={handleNewEvent}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('events.newEvent')}
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              {isAdmin && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('events.eventInfo.technician')}</label>
                  <Select
                    value={selectedTechnician}
                    onValueChange={setSelectedTechnician}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('events.selectTechnician')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('events.allTechnicians')}</SelectItem>
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
                locale={getDateLocale()}
                className="border rounded-md p-3"
                modifiers={{
                  hasEvent: datesWithEvents || [],
                }}
                modifiersClassNames={{
                  hasEvent: "bg-primary/20",
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">
                {t('events.eventsFor')} {selectedDate 
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: getDateLocale() }) 
                  : t('events.noDateSelected')}
              </h3>
              
              {eventsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredEvents?.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">{t('events.noEventsForDate')}</p>
                  <Button className="mt-4" variant="outline" onClick={handleNewEvent}>
                    {t('events.createNewEvent')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents?.map((event) => (
                    <div 
                      key={event.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 relative"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{event.title}</h4>
                            {event.event_type && (
                              <Badge 
                                className="ml-2" 
                                style={{ backgroundColor: event.event_type.color }}
                              >
                                {event.event_type.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700" 
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-500">
                            {event.time} - {format(addHours(parseISO(`${event.date}T${event.time}`), event.duration / 60), 'HH:mm')}
                            &nbsp;({event.duration}min)
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {event.technician 
                            ? event.technician.name 
                            : t('services.unassigned', { defaultValue: "Técnico não atribuído" })}
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

      {/* Diálogo para criar/editar eventos */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? t('events.editEvent') : t('events.newEvent')}</DialogTitle>
            <DialogDescription>
              {t('events.eventDetails')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.eventInfo.title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.eventInfo.title')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.eventInfo.description')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('events.eventInfo.description')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.eventInfo.date')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                          onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.eventInfo.time')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.eventInfo.duration')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="15" 
                        max="480" 
                        step="15" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="event_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.eventInfo.eventType')}</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('events.eventInfo.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: type.color }}
                              ></div>
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="technician_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.eventInfo.technician')}</FormLabel>
                      <Select 
                        value={field.value?.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('events.eventInfo.selectTechnician')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id.toString()}>
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {t('common.cancel', { defaultValue: "Cancelar" })}
                </Button>
                <Button type="submit">
                  {editingEvent ? t('common.update', { defaultValue: "Atualizar" }) : t('common.create', { defaultValue: "Criar" })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
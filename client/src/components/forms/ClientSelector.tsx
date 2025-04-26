import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Client = {
  id: number;
  name: string;
  email?: string;
};

interface ClientSelectorProps {
  selectedClientIds: number[];
  onSelectClient: (clientIds: number[]) => void;
  showSelectedBadges?: boolean;
}

export function ClientSelector({ 
  selectedClientIds, 
  onSelectClient, 
  showSelectedBadges = true
}: ClientSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients'],
    select: (data) => data as Client[],
  });

  // Toggle client selection
  const toggleClient = (clientId: number) => {
    if (selectedClientIds.includes(clientId)) {
      onSelectClient(selectedClientIds.filter(id => id !== clientId));
    } else {
      onSelectClient([...selectedClientIds, clientId]);
    }
  };

  // Remove client from selection
  const removeClient = (clientId: number) => {
    onSelectClient(selectedClientIds.filter(id => id !== clientId));
  };

  // Get selected client names
  const getSelectedClientNames = () => {
    return clients
      .filter(client => selectedClientIds.includes(client.id))
      .map(client => client.name);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-10 w-full"
          >
            {selectedClientIds.length > 0 
              ? `${selectedClientIds.length} cliente(s) selecionado(s)` 
              : "Selecionar clientes"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-72">
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => {
                      toggleClient(client.id);
                      //setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedClientIds.includes(client.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {client.name}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {showSelectedBadges && selectedClientIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {clients
            .filter(client => selectedClientIds.includes(client.id))
            .map((client) => (
              <Badge key={client.id} variant="secondary" className="text-sm">
                {client.name}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                  onClick={() => removeClient(client.id)}
                >
                  <span className="sr-only">Remover {client.name}</span>
                  ×
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
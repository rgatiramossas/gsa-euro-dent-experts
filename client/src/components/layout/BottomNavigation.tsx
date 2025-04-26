import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Briefcase, 
  Users, 
  FileText,
  Calendar,
  BarChart
} from "lucide-react";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Itens comuns a todos os usuários
  const commonNavItems = [
    {
      name: "Início",
      path: "/dashboard",
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: "Orçamentos",
      path: "/budget",
      icon: <FileText className="h-6 w-6" />,
    }
  ];

  // Itens específicos para administradores
  const adminItems = [
    {
      name: "Serviços",
      path: "/services",
      icon: <Briefcase className="h-6 w-6" />,
    },
    {
      name: "Clientes",
      path: "/clients",
      icon: <Users className="h-6 w-6" />,
    }
  ];

  // Itens específicos para técnicos
  const technicianItems = [
    {
      name: "Agenda",
      path: "/eventos",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Finanças",
      path: "/finances",
      icon: <BarChart className="h-6 w-6" />,
    }
  ];

  // Monta o menu conforme o perfil do usuário
  const mobileNavItems = [
    ...commonNavItems,
    ...(isAdmin ? adminItems : technicianItems)
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-gray-900 shadow-lg">
        <div className="grid grid-cols-4 h-16">
          {mobileNavItems.map((item) => {
            const isActive = location === item.path || 
                            (item.path !== "/dashboard" && location.startsWith(item.path));
            
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center h-full focus:outline-none transition-colors duration-200 pt-1.5",
                  isActive ? "text-primary" : "text-gray-300 hover:text-white"
                )}
              >
                <div className={cn(
                  isActive ? "text-primary" : "text-gray-300"
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-[10px] mt-1", 
                  isActive ? "font-medium" : "font-normal"
                )}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

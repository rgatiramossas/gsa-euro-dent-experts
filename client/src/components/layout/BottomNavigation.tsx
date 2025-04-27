import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Briefcase, 
  Users, 
  FileText,
  UserCog
} from "lucide-react";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";

  // Itens padrões para todos os usuários
  let mobileNavItems = [
    {
      name: "Início",
      path: "/dashboard",
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: "Clientes",
      path: "/clients",
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: "Serviços",
      path: "/services",
      icon: <Briefcase className="h-6 w-6" />,
    },
    {
      name: "Orcamento",
      path: "/budget",
      icon: <FileText className="h-6 w-6" />,
    }
  ];
  
  // Se for administrador, substitui o último item pelo menu de gestores
  if (isAdmin) {
    mobileNavItems = [
      ...mobileNavItems.slice(0, 3),
      {
        name: "Gestores",
        path: "/managers",
        icon: <UserCog className="h-6 w-6" />,
      }
    ];
  }
  
  // Para gestores, apenas mostra o dashboard, clientes e serviços (sem orçamentos)
  if (isGestor) {
    mobileNavItems = [
      {
        name: "Início",
        path: "/manager-dashboard",
        icon: <Home className="h-6 w-6" />,
      },
      {
        name: "Clientes",
        path: "/clients",
        icon: <Users className="h-6 w-6" />,
      },
      {
        name: "Serviços",
        path: "/services",
        icon: <Briefcase className="h-6 w-6" />,
      }
    ];
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-gray-900 shadow-lg">
        <div className={`grid ${isGestor ? 'grid-cols-3' : 'grid-cols-4'} h-16`}>
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

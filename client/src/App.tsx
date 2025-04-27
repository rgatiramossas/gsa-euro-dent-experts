import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import DashboardSelector from "@/components/dashboard/DashboardSelector";
import { Header } from "@/components/layout/Header";
// Sidebar removido pois não é mais necessário
import { BottomNavigation } from "@/components/layout/BottomNavigation";
// Componentes de autorização
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { RequireTechnician } from "@/components/auth/RequireTechnician";
import { RequireManager } from "@/components/auth/RequireManager";

// Import service related pages
import ServicesList from "@/pages/services/index";
import ServiceDetails from "@/pages/services/service-details";
import NewService from "@/pages/services/new-service";

// Import client related pages
import ClientsList from "@/pages/clients/index";
import NewClient from "@/pages/clients/new-client";
import NewVehicle from "@/pages/clients/new-vehicle";
import ManagerClientsList from "@/pages/managers/manager-clients-list";

// Import technician related pages
import TechniciansList from "@/pages/technicians/index";
import NewTechnician from "@/pages/technicians/new-technician";

// Import manager related pages
import ManagersList from "@/pages/managers/index";
import NewManager from "@/pages/managers/new-manager";

// Import budget page
import Budget from "@/pages/budget/index";

// Import other pages
import Schedule from "@/pages/schedule";
import Finances from "@/pages/finances";
import Settings from "@/pages/settings";
import Configuracoes from "@/pages/configuracoes";
import Eventos from "@/pages/eventos";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-16">
          {children}
        </main>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Dashboard - verificar o tipo de usuário e redirecionar */}
      <Route path="/dashboard">
        <RequireAuth>
          <MainLayout>
            <DashboardSelector />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Dashboard específico para gestor */}
      <Route path="/manager-dashboard">
        <RequireAuth>
          <RequireManager>
            <MainLayout>
              <ManagerDashboard />
            </MainLayout>
          </RequireManager>
        </RequireAuth>
      </Route>
      
      {/* Services routes - técnicos, gestores e administradores podem acessar */}
      <Route path="/services">
        <RequireAuth>
          <MainLayout>
            <ServicesList />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/services/new">
        <RequireAuth>
          <RequireTechnician>
            <MainLayout>
              <NewService />
            </MainLayout>
          </RequireTechnician>
        </RequireAuth>
      </Route>
      
      <Route path="/services/:id">
        {(params) => (
          <RequireAuth>
            <MainLayout>
              <ServiceDetails id={params.id} />
            </MainLayout>
          </RequireAuth>
        )}
      </Route>
      
      {/* Clients routes - técnicos e administradores podem acessar */}
      <Route path="/clients">
        <RequireAuth>
          <MainLayout>
            <ClientsList />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/clients/new">
        <RequireAuth>
          <RequireTechnician>
            <MainLayout>
              <NewClient />
            </MainLayout>
          </RequireTechnician>
        </RequireAuth>
      </Route>
      
      <Route path="/clients/:id/vehicle/new">
        {(params) => (
          <RequireAuth>
            <RequireTechnician>
              <MainLayout>
                <NewVehicle clientId={params.id} />
              </MainLayout>
            </RequireTechnician>
          </RequireAuth>
        )}
      </Route>
      
      {/* Technicians routes - apenas administradores podem gerenciar técnicos */}
      <Route path="/technicians">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <TechniciansList />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      <Route path="/technicians/new">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <NewTechnician />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      {/* Managers (Gestores) routes - apenas administradores podem gerenciar gestores */}
      <Route path="/managers">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <ManagersList />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      <Route path="/managers/new-manager">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <NewManager />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      <Route path="/managers/:id/edit">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <NewManager isEditMode={true} />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      {/* Rota para clientes de um gestor específico */}
      <Route path="/managers/:id/clients" component={ManagerClientsList} />
      
      {/* Other routes */}
      <Route path="/schedule">
        <RequireAuth>
          <MainLayout>
            <Schedule />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/finances">
        <RequireAuth>
          <MainLayout>
            <Finances />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/budgets">
        <RequireAuth>
          <MainLayout>
            <Budget />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Manter a rota antiga temporariamente para compatibilidade */}
      <Route path="/budget">
        <RequireAuth>
          <MainLayout>
            <Budget />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/settings">
        <RequireAuth>
          <RequireAdmin>
            <MainLayout>
              <Settings />
            </MainLayout>
          </RequireAdmin>
        </RequireAuth>
      </Route>
      
      <Route path="/eventos">
        <RequireAuth>
          <MainLayout>
            <Eventos />
          </MainLayout>
        </RequireAuth>
      </Route>

      <Route path="/configuracoes">
        <RequireAuth>
          <MainLayout>
            <Configuracoes />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Redirect root to dashboard */}
      <Route path="/">
        <RequireAuth>
          <MainLayout>
            <DashboardSelector />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

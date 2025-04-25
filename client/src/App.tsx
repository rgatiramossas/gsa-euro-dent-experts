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
import { Header } from "@/components/layout/Header";
// Sidebar removido pois não é mais necessário
import { BottomNavigation } from "@/components/layout/BottomNavigation";

// Import service related pages
import ServicesList from "@/pages/services/index";
import ServiceDetails from "@/pages/services/service-details";
import NewService from "@/pages/services/new-service";

// Import client related pages
import ClientsList from "@/pages/clients/index";
import NewClient from "@/pages/clients/new-client";
import NewVehicle from "@/pages/clients/new-vehicle";

// Import technician related pages
import TechniciansList from "@/pages/technicians/index";
import NewTechnician from "@/pages/technicians/new-technician";

// Import other pages
import Schedule from "@/pages/schedule";
import Finances from "@/pages/finances";
import Settings from "@/pages/settings";

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
      
      {/* Dashboard */}
      <Route path="/dashboard">
        <RequireAuth>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Services routes */}
      <Route path="/services">
        <RequireAuth>
          <MainLayout>
            <ServicesList />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/services/new">
        <RequireAuth>
          <MainLayout>
            <NewService />
          </MainLayout>
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
      
      {/* Clients routes */}
      <Route path="/clients">
        <RequireAuth>
          <MainLayout>
            <ClientsList />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/clients/new">
        <RequireAuth>
          <MainLayout>
            <NewClient />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/clients/:id/vehicle/new">
        {(params) => (
          <RequireAuth>
            <MainLayout>
              <NewVehicle clientId={params.id} />
            </MainLayout>
          </RequireAuth>
        )}
      </Route>
      
      {/* Technicians routes */}
      <Route path="/technicians">
        <RequireAuth>
          <MainLayout>
            <TechniciansList />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/technicians/new">
        <RequireAuth>
          <MainLayout>
            <NewTechnician />
          </MainLayout>
        </RequireAuth>
      </Route>
      
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
      
      <Route path="/settings">
        <RequireAuth>
          <MainLayout>
            <Settings />
          </MainLayout>
        </RequireAuth>
      </Route>
      
      {/* Redirect root to dashboard */}
      <Route path="/">
        <RequireAuth>
          <MainLayout>
            <Dashboard />
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

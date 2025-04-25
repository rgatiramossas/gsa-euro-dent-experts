import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MobileNavigation() {
  const [location, setLocation] = useLocation();

  const mobileNavItems = [
    {
      name: "Início",
      path: "/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Serviços",
      path: "/services",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: "Clientes",
      path: "/clients",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "Agenda",
      path: "/schedule",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10">
      <div className="grid grid-cols-5 h-16">
        {mobileNavItems.map((item, index) => {
          const isActive = location === item.path || 
                          (item.path !== "/dashboard" && location.startsWith(item.path));
          
          // Special case for new service button in the middle
          if (index === 2) {
            return (
              <div key="new-service" className="flex flex-col items-center justify-center">
                <Link href="/services/new">
                  <Button 
                    variant="default" 
                    size="icon" 
                    className="h-12 w-12 rounded-full -mt-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </Button>
                </Link>
                <span className="text-xs mt-1 text-gray-600">Novo</span>
              </div>
            );
          }
          
          // Adjust index for buttons after the middle button
          const adjustedIndex = index > 2 ? index - 1 : index;
          const navItem = mobileNavItems[adjustedIndex];
          
          return (
            <Link key={navItem.path} href={navItem.path}>
              <a 
                className={cn(
                  "flex flex-col items-center justify-center",
                  isActive ? "text-primary" : "text-gray-600 hover:text-primary"
                )}
              >
                {navItem.icon}
                <span className="text-xs mt-1">{navItem.name}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

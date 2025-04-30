import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPWA } from "./lib/pwaManager";
import offlineDb from "./lib/offlineDb";
import { Router } from "wouter";

// Definir o baseRoute para resolver problemas de navegação
// No ambiente de desenvolvimento, pode ser "/".
const baseRoute = "/";
const makeUseBasename = (base: string) => (
  hook: (path: string) => (string | any)[]
) => (path: string) => {
  const [pathname, navigate] = hook(path);
  const realPathname = pathname.startsWith(base) 
    ? pathname.slice(base.length) || "/" 
    : pathname;
  
  const navigateWithBase = (to: string, options?: { replace?: boolean }) => {
    navigate((to.startsWith('/') ? base : '') + to, options);
  };
  
  return [realPathname, navigateWithBase];
};

// Inicializar o banco de dados offline
offlineDb.initSyncStatus().catch(error => {
  console.error('Erro ao inicializar status de sincronização:', error);
});

// Inicializar o PWA
initPWA();

createRoot(document.getElementById("root")!).render(
  <Router base={baseRoute}>
    <App />
  </Router>
);

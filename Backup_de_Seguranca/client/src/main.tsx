import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPWA } from "./lib/pwaManager";
import offlineDb from "./lib/offlineDb";

// Importar e inicializar i18n
import "./i18n";

// Inicializar o banco de dados offline
offlineDb.initSyncStatus().catch(error => {
  console.error('Erro ao inicializar status de sincronização:', error);
});

// Inicializar o PWA
initPWA();

createRoot(document.getElementById("root")!).render(<App />);

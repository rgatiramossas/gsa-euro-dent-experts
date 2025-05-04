import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Importar e inicializar i18n
import "./i18n";

// PWA e banco de dados offline removidos

createRoot(document.getElementById("root")!).render(<App />);

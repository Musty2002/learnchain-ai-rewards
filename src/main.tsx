import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncManager } from "./lib/syncManager";
import { initializeCapacitor } from "./lib/capacitor";

// Initialize Capacitor for native mobile features
initializeCapacitor();

createRoot(document.getElementById("root")!).render(<App />);

// Start auto-sync for offline data
syncManager.startAutoSync();

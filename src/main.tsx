import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncManager } from "./lib/syncManager";

createRoot(document.getElementById("root")!).render(<App />);

// Start auto-sync for offline data
syncManager.startAutoSync();

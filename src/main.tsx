import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initSentry } from "./integrations/sentry/init";
import "./index.css";
import "./i18n";

initSentry();

createRoot(document.getElementById("root")!).render(<App />);

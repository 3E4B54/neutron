import { createRoot } from "react-dom/client";
import { DesktopShell } from "./DesktopShell.tsx";
import "./style.scss";
import "./desktop.scss";
import "./desktop-overrides.scss";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
createRoot(container).render(<DesktopShell />);

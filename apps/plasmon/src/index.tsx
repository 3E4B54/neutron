import { createRoot } from "react-dom/client";
import { installAppIconFallbacks } from "./iconFallback.ts";
import { PlasmonOS } from "./os/PlasmonOS.tsx";
import "./style.scss";
import "./os/integration/visual-tokens.scss";

installAppIconFallbacks();

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
createRoot(container).render(<PlasmonOS />);

import { createRoot } from "react-dom/client";
import { DesktopShell2 } from "./gui2/DesktopShell2.tsx";
import { installAppIconFallbacks } from "./iconFallback.ts";
import "./style.scss";
import "./gui2/desktop2.scss";

installAppIconFallbacks();

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
createRoot(container).render(<DesktopShell2 />);

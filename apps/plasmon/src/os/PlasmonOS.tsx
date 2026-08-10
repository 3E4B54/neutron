import { useEffect, useMemo, useState } from "react";
import type { ExternalElement } from "./contracts/index.ts";
import { createPlasmonServices, type PlasmonServices } from "./integration/services.ts";

export interface PlasmonOSProps {
  services?: PlasmonServices;
}

/**
 * Agent 0 composition root. This intentionally contains no desktop, shell,
 * filesystem, process, or window-manager implementation logic.
 */
export function PlasmonOS({ services: provided }: PlasmonOSProps) {
  const services = useMemo(() => provided ?? createPlasmonServices(), [provided]);
  const [elements, setElements] = useState<ExternalElement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => services.neutron.loadElements()
      .then((items) => { if (active) { setElements(items); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    void load();
    const unsubscribe = services.neutron.subscribe(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, [services]);

  return (
    <main style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <header>
        <h1 style={{ marginBottom: 4 }}>Plasmon OS</h1>
        <p style={{ marginTop: 0 }}>Contract/integration skeleton</p>
      </header>

      {error ? <p role="alert">Neutron bridge error: {error}</p> : null}

      <section aria-labelledby="elements-heading">
        <h2 id="elements-heading">Installed Elements</h2>
        {elements.length === 0 ? <p>No Elements discovered in this environment.</p> : (
          <ul>
            {elements.map((element) => (
              <li key={element.id}>
                <button type="button" onClick={() => void services.neutron.openElement(element.id)}>
                  Open {element.name}
                </button>
                {` — ${element.description}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="slots-heading">
        <h2 id="slots-heading">Subsystem slots</h2>
        <p>Filesystem, associations, native processes, windowing, desktop/file manager, shell, native apps, sharing, and backup mount here through contracts.</p>
      </section>
    </main>
  );
}

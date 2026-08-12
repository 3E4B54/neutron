export type DosEvent = "emu-ready" | "ci-ready" | "bnd-play" | "open-key" | "fullscreen-change";

export const JS_DOS_RUNTIME_ROOT = "/System/Program Files/js-dos";
export const JS_DOS_EMULATORS_ROOT = `${JS_DOS_RUNTIME_ROOT}/emulators/`;

export interface JsDosPlayerOptions {
  url?: string;
  pathPrefix?: string;
  workerThread?: boolean;
  autoStart?: boolean;
  autoSave?: boolean;
  kiosk?: boolean;
  mouseCapture?: boolean;
  onEvent?: (event: DosEvent, arg?: unknown) => void;
}

export interface JsDosPlayerHandle {
  stop(): Promise<void>;
}

export type JsDosFunction = (
  element: HTMLDivElement,
  options: JsDosPlayerOptions,
) => JsDosPlayerHandle;

type JsDosGlobal = typeof globalThis & { Dos?: JsDosFunction };

let runtimePromise: Promise<JsDosFunction> | null = null;

function installStylesheet(): void {
  if (document.querySelector('link[data-plasmon-runtime="js-dos"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${JS_DOS_RUNTIME_ROOT}/js-dos.css`;
  link.dataset.plasmonRuntime = "js-dos";
  document.head.append(link);
}

export function loadJsDosRuntime(): Promise<JsDosFunction> {
  const global = globalThis as JsDosGlobal;
  if (global.Dos) return Promise.resolve(global.Dos);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<JsDosFunction>((resolve, reject) => {
    installStylesheet();
    const existing = document.querySelector<HTMLScriptElement>('script[data-plasmon-runtime="js-dos"]');
    const script = existing ?? document.createElement("script");

    const finish = () => {
      const loaded = (globalThis as JsDosGlobal).Dos;
      if (!loaded) {
        runtimePromise = null;
        reject(new Error("js-dos runtime loaded without exposing Dos()"));
        return;
      }
      resolve(loaded);
    };
    const fail = () => {
      runtimePromise = null;
      reject(new Error("Unable to load packaged js-dos runtime"));
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      queueMicrotask(() => {
        if ((globalThis as JsDosGlobal).Dos) finish();
      });
      return;
    }

    script.src = `${JS_DOS_RUNTIME_ROOT}/js-dos.js`;
    script.async = true;
    script.dataset.plasmonRuntime = "js-dos";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.append(script);
  });

  return runtimePromise;
}

import { useEffect, useRef, useState } from "react";
import type { NativeAppComponentProps } from "../../os/process/runtime.ts";
import {
  assertNesRom,
  createEmulatorJsFrameDocument,
  createEmulatorJsLaunchConfig,
} from "./runtime.ts";

type PlayerState = "loading" | "starting" | "ready" | "error";

interface LoadedRom {
  name: string;
  url: string;
}

type EmulatorJsWindow = Window & {
  EJS_player?: string;
  EJS_core?: string;
  EJS_gameUrl?: string;
  EJS_gameName?: string;
  EJS_pathtodata?: string;
  EJS_startOnLoaded?: boolean;
  EJS_threads?: boolean;
  EJS_disableLocalStorage?: boolean;
  EJS_disableDatabases?: boolean;
  EJS_language?: string;
  EJS_disableAutoLang?: boolean;
  EJS_ready?: () => void;
  EJS_onGameStart?: () => void;
  EJS_onExit?: () => void;
};

function messageFor(state: PlayerState): string {
  if (state === "loading") return "Loading ROM…";
  if (state === "starting") return "Starting EmulatorJS…";
  if (state === "error") return "Unable to start this NES ROM.";
  return "";
}

/**
 * Association-backed NES host. The selected filesystem node is the only game
 * input; title-specific dispatch stays outside the runtime path.
 *
 * EmulatorJS exposes browser-global EJS_* configuration, so every Plasmon
 * process receives a same-origin iframe. Removing that iframe tears down the
 * engine/global/WASM browser context without introducing a shared emulator
 * lifecycle abstraction.
 */
export default function EmulatorJsPlayer({ target, fs }: NativeAppComponentProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [rom, setRom] = useState<LoadedRom | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    setFrameLoaded(false);
    setRom(null);
    setState("loading");
    setDetail(null);

    const load = async () => {
      if (!target.nodeId) throw new Error("EmulatorJS requires a filesystem ROM target");
      const node = await fs.stat(target.nodeId);
      if (node.kind === "directory") throw new Error("EmulatorJS cannot open a directory");
      const bytes = await fs.read(node.id);
      assertNesRom(bytes);

      objectUrl = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "application/octet-stream" }));
      if (disposed) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        return;
      }

      // The iframe key changes from "empty" to the ROM object URL below. Its
      // previous load event may already have set frameLoaded=true while the
      // filesystem read was in flight. Clear that stale readiness before
      // mounting the replacement iframe so bootstrap waits for its own load.
      setFrameLoaded(false);
      setRom({ name: node.name, url: objectUrl });
    };

    void load().catch((error: unknown) => {
      if (disposed) return;
      setState("error");
      setDetail(error instanceof Error ? error.message : String(error));
    });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fs, target.nodeId]);

  useEffect(() => {
    if (!rom || !frameLoaded) return;
    const frame = frameRef.current;
    const runtimeWindow = frame?.contentWindow as EmulatorJsWindow | null;
    const runtimeDocument = frame?.contentDocument;
    if (!frame || !runtimeWindow || !runtimeDocument) {
      setState("error");
      setDetail("EmulatorJS iframe is unavailable");
      return;
    }

    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const config = createEmulatorJsLaunchConfig(rom.url, rom.name, document.baseURI);

    const fail = (reason: string) => {
      if (disposed) return;
      if (timeout) clearTimeout(timeout);
      timeout = null;
      delete frame.dataset.emulatorjsReady;
      setState("error");
      setDetail(reason);
    };
    const onWindowError = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      fail(errorEvent.message || "EmulatorJS runtime error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      fail(reason instanceof Error ? reason.message : String(reason ?? "EmulatorJS promise rejection"));
    };

    runtimeWindow.addEventListener("error", onWindowError);
    runtimeWindow.addEventListener("unhandledrejection", onUnhandledRejection);

    runtimeWindow.EJS_player = config.player;
    runtimeWindow.EJS_core = config.core;
    runtimeWindow.EJS_gameUrl = config.gameUrl;
    runtimeWindow.EJS_gameName = config.gameName;
    runtimeWindow.EJS_pathtodata = config.dataRoot;
    runtimeWindow.EJS_startOnLoaded = config.startOnLoaded;
    runtimeWindow.EJS_threads = config.threads;
    runtimeWindow.EJS_disableLocalStorage = config.disableLocalStorage;
    runtimeWindow.EJS_disableDatabases = config.disableDatabases;
    runtimeWindow.EJS_language = config.language;
    runtimeWindow.EJS_disableAutoLang = config.disableAutoLang;
    runtimeWindow.EJS_ready = () => {
      if (disposed) return;
      frame.dataset.emulatorjsLoaded = "true";
    };
    runtimeWindow.EJS_onGameStart = () => {
      if (disposed) return;
      if (timeout) clearTimeout(timeout);
      timeout = null;
      frame.dataset.emulatorjsReady = "true";
      setState("ready");
      runtimeWindow.focus();
    };
    runtimeWindow.EJS_onExit = () => fail("EmulatorJS runtime exited");

    setState("starting");
    setDetail(null);

    const script = runtimeDocument.createElement("script");
    script.src = `${config.dataRoot}loader.js`;
    script.async = true;
    script.dataset.plasmonRuntime = "emulatorjs";
    script.addEventListener("error", () => fail("Unable to load packaged EmulatorJS runtime"), { once: true });
    runtimeDocument.head.append(script);

    timeout = setTimeout(() => fail("EmulatorJS did not start within 60 seconds"), 60_000);

    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      runtimeWindow.removeEventListener("error", onWindowError);
      runtimeWindow.removeEventListener("unhandledrejection", onUnhandledRejection);
      delete runtimeWindow.EJS_ready;
      delete runtimeWindow.EJS_onGameStart;
      delete runtimeWindow.EJS_onExit;
      delete frame.dataset.emulatorjsLoaded;
      delete frame.dataset.emulatorjsReady;
      script.remove();
    };
  }, [frameLoaded, rom]);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#000" }}
    >
      <iframe
        key={rom?.url ?? "empty"}
        ref={frameRef}
        srcDoc={createEmulatorJsFrameDocument()}
        title="NES game"
        aria-label="NES game"
        onLoad={() => setFrameLoaded(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#000" }}
      />
      {state !== "ready" ? (
        <div
          role={state === "error" ? "alert" : "status"}
          style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, color: "#fff", background: "#000", textAlign: "center" }}
        >
          <div>
            <div>{messageFor(state)}</div>
            {detail ? <div style={{ marginTop: 8, opacity: 0.75 }}>{detail}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

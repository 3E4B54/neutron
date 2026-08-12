import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NativeAppComponentProps } from "../../os/process/runtime.ts";
import {
  assertNesRom,
  createEmulatorJsLaunchConfig,
  resolveEmulatorJsDataRoot,
} from "./runtime.ts";

type PlayerState = "loading" | "starting" | "ready" | "error";

interface LoadedRom {
  name: string;
  bytes: Uint8Array;
  runtimeToken: string;
}

interface EmulatorJsRuntimeWindow extends Window {
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
  EJS_terminate?: () => void;
}

function messageFor(state: PlayerState): string {
  if (state === "loading") return "Loading ROM…";
  if (state === "starting") return "Starting EmulatorJS…";
  if (state === "error") return "Unable to start this NES ROM.";
  return "";
}

function runtimeCallback(callback: () => void, runtimeWindow: EmulatorJsRuntimeWindow): () => void {
  Object.defineProperty(callback, "constructor", {
    configurable: true,
    value: runtimeWindow.Function,
  });
  return callback;
}

function populateRuntimeDocument(runtimeDocument: Document): void {
  runtimeDocument.open();
  runtimeDocument.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,#game{width:100%;height:100%;margin:0;overflow:hidden;background:#000}body{position:fixed;inset:0}</style>
</head>
<body><div id="game"></div></body>
</html>`);
  runtimeDocument.close();
}

function createRuntimeFrame(container: HTMLDivElement): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.title = "NES game";
  frame.setAttribute("aria-label", "NES game");
  frame.style.position = "absolute";
  frame.style.inset = "0";
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.border = "0";
  frame.style.background = "#000";
  container.append(frame);
  return frame;
}

function markPhase(container: HTMLDivElement | null, phase: string, error?: unknown): void {
  if (!container) return;
  container.dataset.emulatorjsPhase = phase;
  if (error === undefined) {
    delete container.dataset.emulatorjsError;
  } else {
    container.dataset.emulatorjsError = error instanceof Error ? error.message : String(error);
  }
}

/**
 * Association-backed NES host. The selected filesystem node is the only game
 * input; title-specific dispatch stays outside the runtime path.
 *
 * EmulatorJS exposes browser-global EJS_* configuration, so every Plasmon
 * process receives its own ordinary same-origin iframe. As in daedalOS's
 * proven EmulatorJS boundary, the host creates and appends that iframe
 * imperatively, then populates its document, configures its contentWindow, and
 * injects the real packaged loader there. Only the ROM itself uses a Blob URL.
 */
export default function EmulatorJsPlayer({ target, fs }: NativeAppComponentProps) {
  const runtimeContainerRef = useRef<HTMLDivElement>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rom, setRom] = useState<LoadedRom | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const runtimeToken = crypto.randomUUID();

    markPhase(runtimeContainerRef.current, "loading-rom");
    setRom(null);
    setState("loading");
    setDetail(null);

    const load = async () => {
      if (!target.nodeId) throw new Error("EmulatorJS requires a filesystem ROM target");
      const node = await fs.stat(target.nodeId);
      if (node.kind === "directory") throw new Error("EmulatorJS cannot open a directory");
      const bytes = await fs.read(node.id);
      assertNesRom(bytes);

      if (disposed) return;
      markPhase(runtimeContainerRef.current, "rom-loaded");
      setRom({ name: node.name, bytes: bytes.slice(), runtimeToken });
    };

    void load().catch((error: unknown) => {
      if (disposed) return;
      markPhase(runtimeContainerRef.current, "error", error);
      setState("error");
      setDetail(error instanceof Error ? error.message : String(error));
    });

    return () => {
      disposed = true;
    };
  }, [fs, target.nodeId]);

  useLayoutEffect(() => {
    if (!rom) return;

    const container = runtimeContainerRef.current;
    if (!container) {
      setState("error");
      setDetail("EmulatorJS runtime container is unavailable");
      return;
    }

    let disposed = false;
    let gameUrl: string | null = null;
    const frame = createRuntimeFrame(container);
    frame.dataset.emulatorjsInit = rom.runtimeToken;
    markPhase(container, "frame-created");

    const runtimeWindow = frame.contentWindow as EmulatorJsRuntimeWindow | null;
    const runtimeDocument = frame.contentDocument;
    if (!runtimeWindow || !runtimeDocument) {
      const error = new Error("EmulatorJS iframe is unavailable");
      markPhase(container, "error", error);
      frame.remove();
      setState("error");
      setDetail(error.message);
      return;
    }

    const fail = (reason: unknown) => {
      if (disposed) return;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      delete frame.dataset.emulatorjsReady;
      markPhase(container, "error", reason);
      setState("error");
      setDetail(reason instanceof Error ? reason.message : String(reason || "EmulatorJS runtime error"));
    };

    const onRuntimeError = (event: ErrorEvent) => {
      fail(event.error || event.message || "EmulatorJS runtime error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      fail(event.reason || "EmulatorJS promise rejection");
    };

    try {
      setState("starting");
      setDetail(null);

      populateRuntimeDocument(runtimeDocument);
      markPhase(container, "document-populated");
      runtimeWindow.addEventListener("error", onRuntimeError);
      runtimeWindow.addEventListener("unhandledrejection", onUnhandledRejection);

      gameUrl = runtimeWindow.URL.createObjectURL(
        new runtimeWindow.Blob([rom.bytes.slice().buffer], { type: "application/octet-stream" }),
      );
      markPhase(container, "rom-url-created");
      const config = createEmulatorJsLaunchConfig(gameUrl, rom.name, document.baseURI);

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
      runtimeWindow.EJS_ready = runtimeCallback(() => {
        if (disposed) return;
        frame.dataset.emulatorjsLoaded = "true";
        markPhase(container, "loader-ready");
      }, runtimeWindow);
      runtimeWindow.EJS_onGameStart = runtimeCallback(() => {
        if (disposed) return;
        if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
        frame.dataset.emulatorjsReady = "true";
        markPhase(container, "game-started");
        setState("ready");
        frame.focus();
      }, runtimeWindow);
      runtimeWindow.EJS_onExit = runtimeCallback(() => {
        fail("EmulatorJS runtime exited");
      }, runtimeWindow);
      markPhase(container, "configured");

      const loader = runtimeDocument.createElement("script");
      loader.src = `${resolveEmulatorJsDataRoot(document.baseURI)}loader.js`;
      loader.async = true;
      loader.dataset.plasmonRuntime = "emulatorjs";
      loader.addEventListener("error", () => fail("Unable to load packaged EmulatorJS runtime"), { once: true });
      runtimeDocument.head.append(loader);
      frame.dataset.emulatorjsBootstrap = "true";
      markPhase(container, "loader-injected");

      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = setTimeout(() => {
        startTimeoutRef.current = null;
        fail("EmulatorJS did not start within 60 seconds");
      }, 60_000);
    } catch (error) {
      fail(error);
    }

    return () => {
      disposed = true;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      runtimeWindow.removeEventListener("error", onRuntimeError);
      runtimeWindow.removeEventListener("unhandledrejection", onUnhandledRejection);
      try {
        runtimeWindow.EJS_terminate?.();
      } catch {
        // Closing the process must continue even if the emulator already stopped.
      }
      if (gameUrl) runtimeWindow.URL.revokeObjectURL(gameUrl);
      frame.remove();
    };
  }, [rom]);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#000" }}
    >
      <div
        ref={runtimeContainerRef}
        data-emulatorjs-runtime-host="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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

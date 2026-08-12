import { useEffect, useRef, useState } from "react";
import type { NativeAppComponentProps } from "../../os/process/runtime.ts";
import {
  assertNesRom,
  createEmulatorJsFrameDocument,
  EMULATORJS_INIT_MESSAGE,
  EMULATORJS_LIFECYCLE_MESSAGE,
  resolveEmulatorJsDataRoot,
} from "./runtime.ts";

type PlayerState = "loading" | "starting" | "ready" | "error";

type RuntimePhase = "bootstrap" | "loaded" | "ready" | "error";

interface LoadedRom {
  name: string;
  bytes: Uint8Array;
  runtimeToken: string;
  frameUrl: string;
}

interface RuntimeLifecycleMessage {
  type: string;
  token: string;
  phase: RuntimePhase;
  detail?: unknown;
}

function messageFor(state: PlayerState): string {
  if (state === "loading") return "Loading ROM…";
  if (state === "starting") return "Starting EmulatorJS…";
  if (state === "error") return "Unable to start this NES ROM.";
  return "";
}

function isRuntimeLifecycleMessage(value: unknown): value is RuntimeLifecycleMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<RuntimeLifecycleMessage>;
  return (
    message.type === EMULATORJS_LIFECYCLE_MESSAGE &&
    typeof message.token === "string" &&
    (message.phase === "bootstrap" ||
      message.phase === "loaded" ||
      message.phase === "ready" ||
      message.phase === "error")
  );
}

/**
 * Association-backed NES host. The selected filesystem node is the only game
 * input; title-specific dispatch stays outside the runtime path.
 *
 * EmulatorJS exposes browser-global EJS_* configuration, so every Plasmon
 * process receives its own iframe. The iframe document is loaded from a Blob
 * URL created by the Plasmon app so its origin stays tied to the app instead
 * of using an opaque srcdoc document. The child then reports genuine runtime
 * lifecycle callbacks with a correlated postMessage token.
 */
export default function EmulatorJsPlayer({ target, fs }: NativeAppComponentProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rom, setRom] = useState<LoadedRom | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let frameUrl: string | null = null;
    const runtimeToken = crypto.randomUUID();

    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = null;
    setRom(null);
    setState("loading");
    setDetail(null);

    const onMessage = (event: MessageEvent<unknown>) => {
      if (disposed || event.source !== frameRef.current?.contentWindow) return;
      if (!isRuntimeLifecycleMessage(event.data) || event.data.token !== runtimeToken) return;

      const frame = frameRef.current;
      if (!frame) return;

      if (event.data.phase === "bootstrap") {
        frame.dataset.emulatorjsBootstrap = "true";
        return;
      }
      if (event.data.phase === "loaded") {
        frame.dataset.emulatorjsLoaded = "true";
        return;
      }
      if (event.data.phase === "ready") {
        if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
        frame.dataset.emulatorjsReady = "true";
        setState("ready");
        frame.focus();
        return;
      }

      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      delete frame.dataset.emulatorjsReady;
      setState("error");
      setDetail(
        typeof event.data.detail === "string" && event.data.detail.length > 0
          ? event.data.detail
          : "EmulatorJS runtime error",
      );
    };

    window.addEventListener("message", onMessage);

    const load = async () => {
      if (!target.nodeId) throw new Error("EmulatorJS requires a filesystem ROM target");
      const node = await fs.stat(target.nodeId);
      if (node.kind === "directory") throw new Error("EmulatorJS cannot open a directory");
      const bytes = await fs.read(node.id);
      assertNesRom(bytes);

      const frameDocument = createEmulatorJsFrameDocument(runtimeToken);
      frameUrl = URL.createObjectURL(new Blob([frameDocument], { type: "text/html" }));
      if (disposed) {
        URL.revokeObjectURL(frameUrl);
        frameUrl = null;
        return;
      }
      setRom({ name: node.name, bytes: bytes.slice(), runtimeToken, frameUrl });
    };

    void load().catch((error: unknown) => {
      if (disposed) return;
      setState("error");
      setDetail(error instanceof Error ? error.message : String(error));
    });

    return () => {
      disposed = true;
      window.removeEventListener("message", onMessage);
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      if (frameUrl) URL.revokeObjectURL(frameUrl);
    };
  }, [fs, target.nodeId]);

  const initializeFrame = (frame: HTMLIFrameElement) => {
    if (!rom || frame.dataset.emulatorjsInit === rom.runtimeToken) return;
    const runtimeWindow = frame.contentWindow;
    if (!runtimeWindow) {
      setState("error");
      setDetail("EmulatorJS iframe is unavailable");
      return;
    }

    frame.dataset.emulatorjsInit = rom.runtimeToken;
    delete frame.dataset.emulatorjsLoaded;
    delete frame.dataset.emulatorjsReady;
    setState("starting");
    setDetail(null);

    runtimeWindow.postMessage(
      {
        type: EMULATORJS_INIT_MESSAGE,
        token: rom.runtimeToken,
        gameName: rom.name,
        dataRoot: resolveEmulatorJsDataRoot(document.baseURI),
        bytes: rom.bytes,
      },
      "*",
    );

    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = setTimeout(() => {
      startTimeoutRef.current = null;
      setState("error");
      setDetail("EmulatorJS did not start within 60 seconds");
    }, 60_000);
  };

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#000" }}
    >
      {rom ? (
        <iframe
          ref={frameRef}
          key={rom.runtimeToken}
          src={rom.frameUrl}
          title="NES game"
          aria-label="NES game"
          onLoad={(event) => initializeFrame(event.currentTarget)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#000" }}
        />
      ) : null}
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

export const EMULATORJS_RUNTIME_ROOT = "./System/Program Files/EmulatorJS/data/";
export const EMULATORJS_NES_MIME = "application/x-nes-rom";
export const EMULATORJS_INIT_MESSAGE = "plasmon:emulatorjs:init";
export const EMULATORJS_LIFECYCLE_MESSAGE = "plasmon:emulatorjs:lifecycle";

export interface EmulatorJsLaunchConfig {
  player: "#game";
  core: "nes";
  gameUrl: string;
  gameName: string;
  dataRoot: string;
  startOnLoaded: true;
  threads: false;
  disableLocalStorage: true;
  disableDatabases: true;
  language: "en-US";
  disableAutoLang: false;
}

export function resolveEmulatorJsDataRoot(baseUri: string): string {
  return new URL(EMULATORJS_RUNTIME_ROOT, baseUri).href;
}

export function createEmulatorJsLaunchConfig(
  gameUrl: string,
  gameName: string,
  baseUri: string,
): EmulatorJsLaunchConfig {
  return {
    player: "#game",
    core: "nes",
    gameUrl,
    gameName,
    dataRoot: resolveEmulatorJsDataRoot(baseUri),
    startOnLoaded: true,
    threads: false,
    disableLocalStorage: true,
    disableDatabases: true,
    language: "en-US",
    disableAutoLang: false,
  };
}

export function assertNesRom(bytes: Uint8Array): void {
  if (bytes.length < 16) throw new Error("NES ROM is smaller than its iNES header");
  if (bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) {
    throw new Error("NES ROM does not have an iNES header");
  }

  const prgBanks = bytes[4] ?? 0;
  const chrBanks = bytes[5] ?? 0;
  if (prgBanks === 0) throw new Error("NES ROM does not contain a PRG bank");

  const trainerBytes = ((bytes[6] ?? 0) & 0x04) !== 0 ? 512 : 0;
  const minimumSize = 16 + trainerBytes + prgBanks * 16_384 + chrBanks * 8_192;
  if (bytes.length < minimumSize) {
    throw new Error(`NES ROM is truncated (expected at least ${minimumSize} bytes)`);
  }
}

/**
 * Build the isolated runtime document. The child receives the ROM bytes and
 * absolute package root through postMessage after its own script listener is
 * installed. It creates the game Blob URL in its own browsing context, loads
 * the real packaged EmulatorJS loader, then reports only real runtime
 * callbacks to the parent.
 */
export function createEmulatorJsFrameDocument(runtimeToken: string): string {
  const token = JSON.stringify(runtimeToken).replaceAll("<", "\\u003c");
  const initMessage = JSON.stringify(EMULATORJS_INIT_MESSAGE);
  const lifecycleMessage = JSON.stringify(EMULATORJS_LIFECYCLE_MESSAGE);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,#game{width:100%;height:100%;margin:0;overflow:hidden;background:#000}body{position:fixed;inset:0}</style>
</head>
<body>
<div id="game"></div>
<script>
(() => {
  "use strict";
  const runtimeToken = ${token};
  const initType = ${initMessage};
  const lifecycleType = ${lifecycleMessage};
  let gameUrl = null;
  let started = false;

  const report = (phase, detail) => {
    window.parent.postMessage({ type: lifecycleType, token: runtimeToken, phase, detail }, "*");
  };

  const fail = (reason) => {
    const detail = reason instanceof Error ? reason.message : String(reason || "EmulatorJS runtime error");
    report("error", detail);
  };

  window.addEventListener("error", (event) => {
    fail(event.error || event.message || "EmulatorJS runtime error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    fail(event.reason || "EmulatorJS promise rejection");
  });
  window.addEventListener("beforeunload", () => {
    if (gameUrl) URL.revokeObjectURL(gameUrl);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.type !== initType || message.token !== runtimeToken || started) return;
    started = true;

    try {
      const bytes = message.bytes instanceof Uint8Array
        ? message.bytes
        : new Uint8Array(message.bytes);
      gameUrl = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));

      window.EJS_player = "#game";
      window.EJS_core = "nes";
      window.EJS_gameUrl = gameUrl;
      window.EJS_gameName = String(message.gameName || "NES ROM");
      window.EJS_pathtodata = String(message.dataRoot);
      window.EJS_startOnLoaded = true;
      window.EJS_threads = false;
      window.EJS_disableLocalStorage = true;
      window.EJS_disableDatabases = true;
      window.EJS_language = "en-US";
      window.EJS_disableAutoLang = false;
      window.EJS_ready = () => report("loaded");
      window.EJS_onGameStart = () => report("ready");
      window.EJS_onExit = () => report("error", "EmulatorJS runtime exited");

      const loader = document.createElement("script");
      loader.src = String(message.dataRoot) + "loader.js";
      loader.async = true;
      loader.dataset.plasmonRuntime = "emulatorjs";
      loader.addEventListener("error", () => report("error", "Unable to load packaged EmulatorJS runtime"), { once: true });
      document.head.append(loader);
    } catch (error) {
      fail(error);
    }
  });
})();
</script>
</body>
</html>`;
}

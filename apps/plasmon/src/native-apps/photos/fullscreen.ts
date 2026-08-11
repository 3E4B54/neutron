export interface FullscreenDocumentLike {
  fullscreenEnabled?: boolean;
  fullscreenElement?: unknown;
  exitFullscreen?: () => Promise<void>;
}

export interface FullscreenTargetLike {
  requestFullscreen?: () => Promise<void>;
}

export type FullscreenAttempt =
  | { mode: "fullscreen"; message: null }
  | { mode: "expanded"; message: string };

const FALLBACK_MESSAGE =
  "Browser fullscreen is unavailable in this hosted view. Using expanded view instead.";

export function canRequestFullscreen(
  target: FullscreenTargetLike | null,
  documentLike: FullscreenDocumentLike,
): boolean {
  return documentLike.fullscreenEnabled !== false && typeof target?.requestFullscreen === "function";
}

export async function requestFullscreenSafely(
  target: FullscreenTargetLike | null,
  documentLike: FullscreenDocumentLike,
): Promise<FullscreenAttempt> {
  if (!canRequestFullscreen(target, documentLike)) {
    return { mode: "expanded", message: FALLBACK_MESSAGE };
  }
  try {
    await target!.requestFullscreen!();
    return { mode: "fullscreen", message: null };
  } catch {
    return { mode: "expanded", message: FALLBACK_MESSAGE };
  }
}

export async function exitFullscreenSafely(documentLike: FullscreenDocumentLike): Promise<string | null> {
  if (typeof documentLike.exitFullscreen !== "function") return FALLBACK_MESSAGE;
  try {
    await documentLike.exitFullscreen();
    return null;
  } catch {
    return "Browser fullscreen could not be exited. Use the browser's fullscreen controls if needed.";
  }
}

import type { ProcessId, WindowId } from "./common.ts";

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowCreateOptions extends Partial<WindowGeometry> {
  minWidth?: number;
  minHeight?: number;
}

export interface WindowState extends WindowGeometry {
  id: WindowId;
  processId: ProcessId;
  z: number;
  minimized: boolean;
  maximized: boolean;
  minWidth?: number;
  minHeight?: number;
  restoreGeometry?: WindowGeometry;
}

export interface WindowFocusSnapshot {
  focusedId: WindowId | null;
  mru: readonly WindowId[];
}

export interface WindowManager {
  create(processId: ProcessId, initial: WindowCreateOptions): WindowId;
  focus(id: WindowId): void;
  focusSnapshot(): WindowFocusSnapshot;
  move(id: WindowId, x: number, y: number): void;
  resize(id: WindowId, width: number, height: number): void;
  minimize(id: WindowId): void;
  maximize(id: WindowId): void;
  restore(id: WindowId): void;
  close(id: WindowId): void;
  list(): readonly WindowState[];
  subscribe(listener: () => void): () => void;
}

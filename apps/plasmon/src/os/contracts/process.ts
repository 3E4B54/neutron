import type { HandlerId, IconRef, ProcessId, WindowId } from "./common.ts";
import type { OpenTarget } from "./associations.ts";

export interface ProcessRecord {
  id: ProcessId;
  appId: string;
  handlerId: HandlerId;
  target: OpenTarget;
  title: string;
  icon: IconRef;
  state: "starting" | "running" | "closing";
  windowId?: WindowId;
}

export interface ProcessController {
  open(handlerId: HandlerId, target: OpenTarget): Promise<ProcessId | null>;
  focus(id: ProcessId): void;
  close(id: ProcessId): void;
  setTitle(id: ProcessId, title: string): void;
  setTarget(id: ProcessId, target: OpenTarget): void;
  list(): readonly ProcessRecord[];
  subscribe(listener: () => void): () => void;
}

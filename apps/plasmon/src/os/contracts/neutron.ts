export interface ExternalElement {
  id: string;
  name: string;
  description: string;
  version?: number;
  icon?: string;
  tray?: {
    title: string;
  };
  tiles: Array<{ id: string; title: string }>;
  running: "yes" | "no" | "unknown";
}

export interface NeutronBridge {
  loadElements(): Promise<ExternalElement[]>;
  openElement(appId: string, options?: { tileId?: string; view?: string }): Promise<void>;
  offerInstall(url: string): Promise<void>;
  refreshRuntimeState(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

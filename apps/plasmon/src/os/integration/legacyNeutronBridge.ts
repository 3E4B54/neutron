import { createPlatform, type PlasmonApp, type PlasmonPlatform } from "../../platform/index.ts";
import type { ExternalElement, NeutronBridge } from "../contracts/index.ts";

/**
 * Transitional composition adapter only. Agent 8 will replace this with the
 * dedicated os/neutron implementation. The existing platform code remains
 * untouched so GUI2 stays available as a reference and vanilla-Neutron launch
 * behavior is preserved during the architecture split.
 */
export class LegacyNeutronBridge implements NeutronBridge {
  private readonly platform: PlasmonPlatform;
  private elements: ExternalElement[] = [];
  private listeners = new Set<() => void>();

  constructor(platform: PlasmonPlatform = createPlatform()) {
    this.platform = platform;
  }

  async loadElements(): Promise<ExternalElement[]> {
    const snapshot = await this.platform.load();
    this.elements = snapshot.apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      ...(app.version === undefined ? {} : { version: app.version }),
      tiles: app.tiles.map((tile) => ({ id: tile.id, title: tile.title })),
      running: snapshot.liveAppIds.has(app.id) ? "yes" : "no",
    }));
    return this.elements.map((element) => ({ ...element, tiles: [...element.tiles] }));
  }

  async openElement(appId: string, options: { tileId?: string; view?: string } = {}): Promise<void> {
    const element = this.elements.find((candidate) => candidate.id === appId)
      ?? (await this.loadElements()).find((candidate) => candidate.id === appId);
    if (!element) throw new Error(`Unknown Neutron Element: ${appId}`);

    const selected = options.tileId
      ? element.tiles.find((tile) => tile.id === options.tileId)
      : element.tiles[0];
    if (!selected) throw new Error(`${element.name} does not expose a launchable tile`);

    // Legacy PlasmonPlatform currently opens an app's first tile. Preserve that
    // behavior here; Agent 8 owns exact tile/view support through Neutron tools.
    const app: PlasmonApp = {
      id: element.id,
      name: element.name,
      description: element.description,
      ...(element.version === undefined ? {} : { version: element.version }),
      tiles: element.tiles,
    };
    await this.platform.open(app);
    await this.refreshRuntimeState();
  }

  async offerInstall(url: string): Promise<void> {
    await this.platform.install(url);
  }

  async refreshRuntimeState(): Promise<void> {
    await this.loadElements();
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

import type { FsNode, FsService } from "../os/contracts/index.ts";

const PACKAGED_DOOM_URL = "/Games/DOS%20Bundles/Doom.jsdos";
const DOOM_DESTINATION = "/Desktop/Doom.jsdos";

async function requireDirectory(fs: FsService, path: string): Promise<FsNode> {
  const node = await fs.resolvePath(path);
  if (!node || node.kind !== "directory") throw new Error(`Missing filesystem directory: ${path}`);
  return node;
}

/**
 * Seeds only the temporary hackathon proof content. Runtime dispatch remains
 * completely data-driven by file association; removing this seed does not
 * change js-dos launch behavior.
 */
export async function ensureHackathonGameContent(fs: FsService): Promise<void> {
  if (await fs.resolvePath(DOOM_DESTINATION)) return;

  const response = await fetch(PACKAGED_DOOM_URL);
  if (!response.ok) {
    throw new Error(`Packaged Doom proof asset is unavailable (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("Packaged Doom proof asset is not a js-dos ZIP bundle");
  }

  const desktop = await requireDirectory(fs, "/Desktop");
  const existing = await fs.resolvePath(DOOM_DESTINATION);
  if (existing) return;

  const game = await fs.createFile(desktop.id, "Doom.jsdos", {
    mime: "application/x-jsdos",
    metadata: {
      temporaryHackathonContent: true,
      redistributionStatus: "unverified",
      packagedSource: "/Games/DOS Bundles/Doom.jsdos",
    },
  });
  await fs.write(game.id, bytes, { truncate: true });
}

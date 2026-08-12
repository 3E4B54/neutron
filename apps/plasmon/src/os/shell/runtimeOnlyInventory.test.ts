import { expect, test } from "bun:test";
import { createPlasmonServices } from "../integration/services.ts";
import {
  parseStartShortcut,
  reconcileStartMenu,
  searchApplicationEntries,
} from "./index.ts";

async function startNativeHandlerIds(
  services: ReturnType<typeof createPlasmonServices>,
  rootId: string,
): Promise<string[]> {
  const handlers: string[] = [];
  const queue = [rootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const directoryId = queue.shift();
    if (!directoryId || visited.has(directoryId)) continue;
    visited.add(directoryId);

    for (const node of await services.fs.list(directoryId, { includeHidden: true, sort: "name" })) {
      if (node.kind === "directory") {
        queue.push(node.id);
        continue;
      }
      const shortcut = parseStartShortcut(node);
      if (shortcut?.target.kind === "native") handlers.push(shortcut.target.handlerId);
    }
  }

  return handlers.sort();
}

test("runtime-only process host is not a user-launchable Shell application", async () => {
  const services = createPlasmonServices();

  try {
    await services.filesystem.ready;

    const runtime = services.nativeApps.getByHandler("runtime:js-dos");
    expect(runtime).not.toBeNull();
    expect((runtime as typeof runtime & { exposure?: string })?.exposure).toBe("runtime-only");
    expect(runtime && services.nativeApps.hasLoader(runtime.id)).toBe(true);

    const documents = await services.fs.resolvePath("/Documents");
    expect(documents?.kind).toBe("directory");
    if (!documents || documents.kind !== "directory") throw new Error("Documents directory is unavailable");

    const bundle = await services.fs.createFile(documents.id, "Runtime Host Gate.jsdos", {
      mime: "application/x-jsdos",
    });
    const candidates = await services.associations.resolve(bundle);
    expect(candidates.map(({ id }) => id)).toContain("runtime:js-dos");

    await services.openService.open("runtime:js-dos", { nodeId: bundle.id });
    expect(services.process.list().some((record) => record.handlerId === "runtime:js-dos")).toBe(true);
    for (const record of services.process.list()) services.process.close(record.id);

    const applicationResults = searchApplicationEntries(services.nativeApps.list(), [], "");
    expect(applicationResults.some(
      (result) => result.kind === "native-app" && result.app.handlerId === "runtime:js-dos",
    )).toBe(false);
    expect(applicationResults.some(
      (result) => result.kind === "native-app" && result.app.handlerId === "native:settings",
    )).toBe(true);

    const { root } = await reconcileStartMenu(services.fs, services.nativeApps.list(), []);
    const startHandlers = await startNativeHandlerIds(services, root.id);
    expect(startHandlers).not.toContain("runtime:js-dos");
    expect(startHandlers).toContain("native:settings");
  } finally {
    services.filesystem.dispose();
  }
});

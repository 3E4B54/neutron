import { expect, test } from "bun:test";
import { createHeadlessPlasmonEnvironment } from "./headlessEnvironment.ts";

test("headless environment opens a filesystem resource through associations into process/window state", async () => {
  const environment = createHeadlessPlasmonEnvironment();

  try {
    await environment.ready;
    const documents = await environment.node("/Documents");
    expect(documents?.kind).toBe("directory");
    if (!documents || documents.kind !== "directory") throw new Error("Documents directory is unavailable");

    const note = await environment.services.fs.createFile(documents.id, "workflow.txt", {
      mime: "text/plain",
    });
    await environment.services.fs.write(
      note.id,
      new TextEncoder().encode("cross-surface headless workflow"),
      { truncate: true },
    );

    expect((await environment.services.associations.resolve(note))[0]?.id).toBe("native:text");

    await environment.open("/Documents/workflow.txt");

    const processes = environment.processes();
    expect(processes).toHaveLength(1);
    expect(processes[0]?.handlerId).toBe("native:text");
    expect(processes[0]?.target.nodeId).toBe(note.id);
    expect(processes[0]?.windowId).toBe("window:test:1");

    const windows = environment.windows();
    expect(windows).toHaveLength(1);
    expect(windows[0]?.id).toBe("window:test:1");
    expect(windows[0]?.processId).toBe(processes[0]?.id);
    expect(windows[0]?.minimized).toBe(false);

    expect(new TextDecoder().decode(await environment.services.fs.read(note.id))).toBe(
      "cross-surface headless workflow",
    );
  } finally {
    environment.dispose();
  }
});

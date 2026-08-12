import { expect, test } from "bun:test";
import {
  FS_ASSOCIATION_DEFAULTS_METADATA_KEY,
  associationTypeKey,
} from "../src/os/associations/index.ts";
import { FsRpcClient, MemoryFsRepository } from "../src/os/fs/index.ts";
import { createFilesystemService, createPlasmonServices } from "../src/os/integration/services.ts";

test("Wave 2 composition registers native apps, loaders, and content handlers", async () => {
  const services = createPlasmonServices();
  const appIds = services.nativeApps.list().map((app) => app.id);

  expect(appIds).toContain("native:explorer");
  expect(appIds).toContain("native:properties");
  expect(appIds).toContain("native:text");
  expect(appIds).toContain("native:markdown");
  expect(appIds).toContain("native:video");
  expect(appIds).toContain("native:browser");
  expect(appIds).toContain("native:settings");

  for (const appId of appIds) expect(services.nativeApps.hasLoader(appId)).toBe(true);
  expect(services.associations.getHandler("native:text")?.kind).toBe("native");
  expect(services.associations.getHandler("external:url")?.kind).toBe("external");

  await services.openService.open("native:settings", {});
  expect(services.process.list().some((record) => record.handlerId === "native:settings")).toBe(true);
  for (const record of services.process.list()) services.process.close(record.id);
});

test("Wave 2 associations prefer Markdown and honor explicit shortcut handlers with a probe", async () => {
  const services = createPlasmonServices();
  const documents = await services.fs.resolvePath("/Documents");
  expect(documents?.kind).toBe("directory");
  if (!documents || documents.kind !== "directory") throw new Error("Documents directory is unavailable");

  const markdown = await services.fs.createFile(documents.id, "readme.md", { mime: "text/markdown" });
  expect((await services.associations.resolve(markdown))[0]?.id).toBe("native:markdown");

  const shortcut = await services.fs.createFile(documents.id, "movie.url", {
    kind: "shortcut",
    mime: "application/x-mswinurl",
  });
  await services.fs.write(
    shortcut.id,
    new TextEncoder().encode(
      "[InternetShortcut]\r\nURL=https://youtu.be/dQw4w9WgXcQ\r\nHandler=native:video\r\n",
    ),
    { truncate: true },
  );
  const currentShortcut = await services.fs.stat(shortcut.id);
  const probe = await services.fs.read(shortcut.id);
  expect((await services.associations.resolve(currentShortcut, probe))[0]?.id).toBe("native:video");
});

test("production composition persists association defaults through the filesystem authority", async () => {
  const repository = new MemoryFsRepository();
  const first = createPlasmonServices({ filesystemRepository: repository });

  try {
    await first.filesystem.ready;
    const documents = await first.fs.resolvePath("/Documents");
    expect(documents?.kind).toBe("directory");
    if (!documents || documents.kind !== "directory") throw new Error("Documents directory is unavailable");

    const markdown = await first.fs.createFile(documents.id, "association-default.md", {
      mime: "text/markdown",
    });
    expect((await first.associations.resolve(markdown))[0]?.id).toBe("native:markdown");

    await first.associations.setUserDefault(
      associationTypeKey.extension(".md"),
      "native:text",
    );

    const root = await first.fs.resolvePath("/");
    expect(root?.metadata[FS_ASSOCIATION_DEFAULTS_METADATA_KEY]).toEqual({
      version: 1,
      defaults: { "extension:.md": "native:text" },
    });
  } finally {
    first.filesystem.dispose();
  }

  const second = createPlasmonServices({ filesystemRepository: repository });
  try {
    await second.filesystem.ready;
    const markdown = await second.fs.resolvePath("/Documents/association-default.md");
    expect(markdown?.kind).toBe("file");
    if (!markdown || markdown.kind !== "file") throw new Error("Persisted Markdown file is unavailable");

    expect((await second.associations.resolve(markdown)).map(({ id }) => id).slice(0, 2)).toEqual([
      "native:text",
      "native:markdown",
    ]);
  } finally {
    second.filesystem.dispose();
  }
});

test("Kernel-hosted Wave 2 composition uses the background filesystem RPC client", () => {
  const fs = createFilesystemService("hosted");
  expect(fs).toBeInstanceOf(FsRpcClient);
});

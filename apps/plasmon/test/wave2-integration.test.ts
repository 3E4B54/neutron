import { expect, test } from "bun:test";
import { createPlasmonServices } from "../src/os/integration/services.ts";

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

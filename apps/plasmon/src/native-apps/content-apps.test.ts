import { expect, test } from "bun:test";
import { HandlerAssociationRegistry } from "../os/associations/registry.ts";
import type { FsNode } from "../os/contracts/index.ts";
import MarkdownEditor from "./markdown/MarkdownEditor.tsx";
import TextEditor from "./text/TextEditor.tsx";
import {
  browserAppDefinition,
  contentAssociationRules,
  contentAppDefinitions,
  contentHandlerDefinitions,
  loadMarkdownComponent,
  loadTextComponent,
  markdownAppDefinition,
  photosAppDefinition,
  settingsAppDefinition,
  textAppDefinition,
  videoAppDefinition,
} from "./content-apps.ts";

function node(name: string, mime?: string): FsNode {
  return { id: `node:${name}`, parentId: "root", name, kind: "file", ...(mime ? { mime } : {}), size: 0, createdAt: 0, modifiedAt: 0, metadata: {} };
}

function registry(): HandlerAssociationRegistry {
  const result = new HandlerAssociationRegistry();
  for (const handler of contentHandlerDefinitions) result.registerHandler(handler);
  for (const rule of contentAssociationRules) result.registerRule(rule);
  return result;
}

test("native content metadata includes Photos and intended singleton choices", () => {
  expect(contentAppDefinitions.map((app) => app.id)).toEqual(["native:text", "native:markdown", "native:photos", "native:video", "native:browser", "native:settings"]);
  expect(textAppDefinition.singleton).toBe(false);
  expect(markdownAppDefinition.singleton).toBe(false);
  expect(photosAppDefinition.singleton).toBe(false);
  expect(videoAppDefinition.singleton).toBe(false);
  expect(browserAppDefinition.singleton).toBe(false);
  expect(settingsAppDefinition.singleton).toBe(true);
  expect(contentHandlerDefinitions.map((handler) => handler.id)).toContain("external:url");
});

test("Text and Markdown loaders resolve the current mature component modules", async () => {
  expect((await loadTextComponent()).default).toBe(TextEditor);
  expect((await loadMarkdownComponent()).default).toBe(MarkdownEditor);
});

test("Photos is the default handler for supported image extensions and MIME", async () => {
  const associations = registry();
  for (const resource of [node("face.png", "image/png"), node("photo.JPG", "image/jpeg"), node("diagram.svg", "image/svg+xml")]) {
    const handlers = await associations.resolve(resource);
    expect(handlers[0]?.id).toBe("native:photos");
    expect(handlers.map((handler) => handler.id)).toContain("native:text");
  }
});

test("Markdown remains preferred while Text remains a compatible Open With handler", async () => {
  const handlers = await registry().resolve(node("README.md", "text/markdown"));
  expect(handlers[0]?.id).toBe("native:markdown");
  expect(handlers.map((handler) => handler.id)).toContain("native:text");
});

test("very-low-priority Text wildcard is alternate-only when specific handlers exist", async () => {
  const associations = registry();
  const videoHandlers = await associations.resolve(node("movie.mkv", "video/x-matroska"));
  expect(videoHandlers[0]?.id).toBe("native:video");
  expect(videoHandlers.map((handler) => handler.id)).toContain("native:text");

  const binaryHandlers = await associations.resolve(node("payload.bin", "application/octet-stream"));
  expect(binaryHandlers.map((handler) => handler.id)).toEqual(["native:text"]);
});

test("Text wildcard rule is MIME-only and intentionally lowest priority", () => {
  const wildcard = contentAssociationRules.find((rule) => rule.id === "text:wildcard");
  expect(wildcard).toEqual({
    id: "text:wildcard",
    handlerId: "native:text",
    mimeTypes: ["*/*"],
    priority: -1_000_000,
  });
});

test("URL and video association IDs remain stable", () => {
  expect(contentAssociationRules.some((rule) => rule.handlerId === "native:video" && rule.mimeTypes?.includes("video/*"))).toBe(true);
  expect(contentAssociationRules.some((rule) => rule.handlerId === "native:browser" && rule.extensions?.includes(".url"))).toBe(true);
});

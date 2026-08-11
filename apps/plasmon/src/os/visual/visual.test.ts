// @ts-ignore -- bun:test is available to the repository test runner but excluded from browser tsconfig globals.
import { expect, test } from "bun:test";
import {
  FILE_TYPE_ICON_ASSETS,
  SHORTCUT_OVERLAY_ASSET,
  SYSTEM_ICON_ASSETS,
} from "./assets.ts";
import {
  ICON_IMAGE_OBJECT_FIT,
  THUMBNAIL_OBJECT_FIT,
  composeShortcutPresentation,
  resolveImagePresentation,
} from "./presentation.ts";
import { ICON_CONTEXT_SIZES, iconContextCssVariables } from "./sizing.ts";

test("approved icon contexts encode one shared frame/artwork size map", () => {
  expect(ICON_CONTEXT_SIZES).toEqual({
    desktop: { frame: 48, artwork: 42 },
    "file-grid": { frame: 44, artwork: 38 },
    "file-list": { frame: 26, artwork: 22 },
    start: { frame: 32, artwork: 28 },
    search: { frame: 30, artwork: 26 },
    taskbar: { frame: 30, artwork: 26 },
    titlebar: { frame: 18, artwork: 16 },
    "context-menu": { frame: 20, artwork: 16 },
    properties: { frame: 56, artwork: 46 },
  });
  expect(iconContextCssVariables("desktop")).toEqual({
    "--plasmon-icon-frame-size": "48px",
    "--plasmon-icon-art-size": "42px",
  });
});

test("native artwork and thumbnails use contain instead of crop-to-fill", () => {
  expect(ICON_IMAGE_OBJECT_FIT).toBe("contain");
  expect(THUMBNAIL_OBJECT_FIT).toBe("contain");
});

test("failed image presentation changes to fallback without changing its source contract", () => {
  const src = "/apps/mail/static/icon.svg";
  expect(resolveImagePresentation(src, null)).toEqual({ kind: "image", src });
  expect(resolveImagePresentation(src, src)).toEqual({ kind: "fallback" });
  expect(resolveImagePresentation(null, null)).toEqual({ kind: "fallback" });
});

test("shortcut composition preserves the caller-resolved target identity", () => {
  const target = { kind: "native", src: "/apps/mail/static/icon.svg" } as const;
  const shortcut = composeShortcutPresentation(target);
  expect(shortcut.shortcut).toBe(true);
  expect(shortcut.target).toBe(target);
});

test("required initial visual assets are present in the shared catalogs", () => {
  expect(Object.keys(FILE_TYPE_ICON_ASSETS).sort()).toEqual([
    "atom", "audio", "file", "folder", "image", "markdown", "text", "video",
  ]);
  expect(Object.keys(SYSTEM_ICON_ASSETS).sort()).toEqual([
    "application", "browser", "file-manager", "photos", "properties", "recycle-bin", "search", "settings", "start",
  ]);
  expect(SHORTCUT_OVERLAY_ASSET.endsWith("/shortcut-overlay.svg")).toBe(true);
});

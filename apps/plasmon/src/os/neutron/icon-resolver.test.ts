import { describe, expect, test } from "bun:test";
import {
  declaredElementIconPath,
  elementIconCandidates,
  firstLoadableIconCandidate,
  resolveElementIcon,
  safePackageIconPath,
} from "./icon-resolver.ts";

const CANISTER_ID = "rrkah-fqaaa-aaaaa-aaaaq-cai";
const NEUTRON_HREF = `https://${CANISTER_ID}.icp0.io/app/plasmon/index.html`;

const prefixed = (path: string): string =>
  `https://afilesa--${CANISTER_ID}.icp0.io/app/files/${path}`;
const unprefixed = (path: string): string =>
  `https://${CANISTER_ID}.icp0.io/app/files/${path}`;

describe("descriptor icon path policy", () => {
  test("accepts bounded package-local paths", () => {
    expect(safePackageIconPath("static/icon.svg")).toBe("static/icon.svg");
    expect(safePackageIconPath("assets/icons/app mark.webp")).toBe(
      "assets/icons/app mark.webp",
    );
  });

  test("rejects external, scheme-relative, unsafe-scheme and escaping paths", () => {
    for (const value of [
      "https://example.com/icon.svg",
      "//example.com/icon.svg",
      "data:image/svg+xml,test",
      "javascript:alert(1)",
      "/static/icon.svg",
      "../icon.svg",
      "static/../icon.svg",
      "static\\icon.svg",
      "static/icon.svg?x=1",
      "static/icon.svg#fragment",
      "static/%2e%2e/icon.svg",
    ]) {
      expect(safePackageIconPath(value)).toBeUndefined();
    }
  });

  test("retains declared icon metadata internally without trusting arbitrary URLs", () => {
    expect(declaredElementIconPath({
      id: "files",
      icon: "https://untrusted.example/app.png",
      tiles: [
        { id: "main", title: "Files", icon: "static/icon.svg" },
      ],
      tray: { title: "Files", icon: "static/tray.svg" },
    }, "files")).toBe("static/icon.svg");

    expect(declaredElementIconPath({
      id: "files",
      tiles: [{ id: "main", title: "Files" }],
      tray: { title: "Files", icon: "static/tray.svg" },
    }, "files")).toBe("static/tray.svg");

    expect(declaredElementIconPath({
      id: "other",
      tiles: [{ id: "main", title: "Other", icon: "static/icon.svg" }],
    }, "files")).toBeUndefined();
  });
});

test("one declared icon path produces only the two established safe origin forms", () => {
  expect(elementIconCandidates("files", "static/icon.svg", NEUTRON_HREF)).toEqual([
    prefixed("static/icon.svg"),
    unprefixed("static/icon.svg"),
  ]);
});

describe("verified icon selection", () => {
  const candidates = ["A.svg", "A.png"];

  test("returns the first candidate when it loads", async () => {
    expect(await firstLoadableIconCandidate(
      candidates,
      async (candidate) => candidate === "A.svg",
    )).toBe("A.svg");
  });

  test("returns the second candidate when the first fails", async () => {
    expect(await firstLoadableIconCandidate(
      candidates,
      async (candidate) => candidate === "A.png",
    )).toBe("A.png");
  });

  test("returns undefined when every candidate fails", async () => {
    expect(await firstLoadableIconCandidate(candidates, async () => false)).toBeUndefined();
  });

  test("a stalled first candidate is bounded and cannot hang resolution", async () => {
    const stalled = new Promise<boolean>(() => {});
    expect(await firstLoadableIconCandidate(
      candidates,
      (candidate) => candidate === "A.svg" ? stalled : true,
      10,
    )).toBe("A.png");
  });
});

test("missing descriptor icon metadata performs zero probes", async () => {
  let probes = 0;
  expect(await resolveElementIcon("files", undefined, NEUTRON_HREF, {
    probe: async () => {
      probes += 1;
      return true;
    },
  })).toBeUndefined();
  expect(probes).toBe(0);
});

test("declared icon resolution probes only its safe origin forms", async () => {
  const candidates = elementIconCandidates("files", "static/icon.svg", NEUTRON_HREF);
  const working = candidates[1];
  if (!working) throw new Error("expected unprefixed declared icon candidate");
  const probed: string[] = [];

  expect(await resolveElementIcon("files", "static/icon.svg", NEUTRON_HREF, {
    probe: async (candidate) => {
      probed.push(candidate);
      return candidate === working;
    },
    timeoutMs: 50,
  })).toBe(working);
  expect(probed).toEqual(candidates);
});

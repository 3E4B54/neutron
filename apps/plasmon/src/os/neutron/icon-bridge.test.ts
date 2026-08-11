import { describe, expect, test } from "bun:test";
import type { VanillaNeutronApi } from "./types.ts";
import { VanillaNeutronBridge } from "./vanilla.ts";

function api(overrides: Partial<VanillaNeutronApi> = {}): VanillaNeutronApi {
  return {
    listApps: async () => ({ apps: [] }),
    describeApp: async (appId) => ({ id: appId, name: appId, tiles: [] }),
    listEndpoints: async () => ({ endpoints: [] }),
    openAppTile: async () => ({}),
    offerAppInstall: async () => ({}),
    ...overrides,
  };
}

describe("descriptor-driven Neutron icon resolution", () => {
  test("uses a safe declared tile icon and preserves tray/tiles/running metadata", async () => {
    const workingIcon = "https://safe-package-origin/app/mail/static/icon.svg";
    const resolutions: Array<[string, string | undefined]> = [];
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async (appId, declaredPath) => {
        resolutions.push([appId, declaredPath]);
        return workingIcon;
      },
      api: api({
        listApps: async () => ({ apps: [{ id: "mail", description: "fallback" }] }),
        describeApp: async () => ({
          id: "mail",
          name: "Mail",
          description: "Private mail",
          version: 302,
          icon: "https://untrusted.example/arbitrary.png",
          tray: { title: "Mail activity", icon: "static/tray.svg" },
          tiles: [
            { id: "main", title: "Mail", icon: "static/icon.svg" },
            { id: "compose", title: "Compose", icon: "static/compose.svg" },
          ],
        }),
        listEndpoints: async () => ({
          endpoints: [{ role: "tile", appId: "mail" }],
        }),
      }),
    });

    expect(await bridge.loadElements()).toEqual([{
      id: "mail",
      name: "Mail",
      description: "Private mail",
      version: 302,
      icon: workingIcon,
      tray: { title: "Mail activity" },
      tiles: [
        { id: "main", title: "Mail" },
        { id: "compose", title: "Compose" },
      ],
      running: "yes",
    }]);
    expect(resolutions).toEqual([["mail", "static/icon.svg"]]);
  });

  test("unsafe or missing descriptor icons do not invoke resolution", async () => {
    let resolutions = 0;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        return "should-not-be-used";
      },
      api: api({
        listApps: async () => ({
          apps: [
            { id: "external", description: "External" },
            { id: "missing", description: "Missing" },
          ],
        }),
        describeApp: async (appId) => appId === "external"
          ? {
              id: "external",
              name: "External",
              tiles: [{ id: "main", title: "External", icon: "https://evil.example/icon.svg" }],
            }
          : {
              id: "missing",
              name: "Missing",
              tiles: [{ id: "main", title: "Missing" }],
            },
      }),
    });

    const elements = await bridge.loadElements();
    expect(elements).toHaveLength(2);
    expect(elements.every((element) => element.icon === undefined)).toBe(true);
    expect(resolutions).toBe(0);
  });

  test("broken icon resolution preserves that Element and isolates other Elements", async () => {
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async (appId) => {
        if (appId === "broken") throw new Error("image failed");
        return `resolved:${appId}`;
      },
      api: api({
        listApps: async () => ({
          apps: [
            { id: "broken", description: "Broken" },
            { id: "good", description: "Good" },
          ],
        }),
        describeApp: async (appId) => ({
          id: appId,
          name: appId === "broken" ? "Broken" : "Good",
          tiles: [{ id: "main", title: appId, icon: "static/icon.svg" }],
        }),
      }),
    });

    expect(await bridge.loadElements()).toEqual([
      {
        id: "broken",
        name: "Broken",
        description: "Broken",
        tiles: [{ id: "main", title: "broken" }],
        running: "no",
      },
      {
        id: "good",
        name: "Good",
        description: "Good",
        icon: "resolved:good",
        tiles: [{ id: "main", title: "good" }],
        running: "no",
      },
    ]);
  });
});

describe("Neutron metadata/icon cache", () => {
  test("successful icon resolution and descriptor metadata are reused on unchanged reload", async () => {
    let describes = 0;
    let resolutions = 0;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        return "resolved:files";
      },
      api: api({
        listApps: async () => ({ apps: [{ id: "files", description: "Files" }] }),
        describeApp: async () => {
          describes += 1;
          return {
            id: "files",
            name: "Files",
            tiles: [{ id: "main", title: "Files", icon: "static/icon.svg" }],
          };
        },
      }),
    });

    await bridge.loadElements();
    await bridge.loadElements();
    await bridge.loadElements();
    expect(describes).toBe(1);
    expect(resolutions).toBe(1);
  });

  test("failed icon resolution is cached and not retried", async () => {
    let describes = 0;
    let resolutions = 0;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        throw new Error("not found");
      },
      api: api({
        listApps: async () => ({ apps: [{ id: "files", description: "Files" }] }),
        describeApp: async () => {
          describes += 1;
          return {
            id: "files",
            name: "Files",
            tiles: [{ id: "main", title: "Files", icon: "static/icon.svg" }],
          };
        },
      }),
    });

    expect((await bridge.loadElements())[0]?.icon).toBeUndefined();
    expect((await bridge.loadElements())[0]?.icon).toBeUndefined();
    expect(describes).toBe(1);
    expect(resolutions).toBe(1);
  });

  test("missing icon metadata is cached without any resolution attempt", async () => {
    let describes = 0;
    let resolutions = 0;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        return "unexpected";
      },
      api: api({
        listApps: async () => ({ apps: [{ id: "files", description: "Files" }] }),
        describeApp: async () => {
          describes += 1;
          return {
            id: "files",
            name: "Files",
            tiles: [{ id: "main", title: "Files" }],
          };
        },
      }),
    });

    await bridge.loadElements();
    await bridge.loadElements();
    expect(describes).toBe(1);
    expect(resolutions).toBe(0);
  });

  test("runtime refresh changes only running state and does not redo descriptor/icon discovery", async () => {
    let describes = 0;
    let resolutions = 0;
    let live = false;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        return "resolved:files";
      },
      api: api({
        listApps: async () => ({ apps: [{ id: "files", description: "Files" }] }),
        describeApp: async () => {
          describes += 1;
          return {
            id: "files",
            name: "Files",
            tiles: [{ id: "main", title: "Files", icon: "static/icon.svg" }],
          };
        },
        listEndpoints: async () => ({
          endpoints: live ? [{ role: "tile", appId: "files" }] : [],
        }),
      }),
    });

    expect((await bridge.loadElements())[0]?.running).toBe("no");
    live = true;
    await bridge.refreshRuntimeState();
    expect((await bridge.loadElements())[0]?.running).toBe("yes");
    expect(describes).toBe(1);
    expect(resolutions).toBe(1);
  });

  test("a real apps.list description change invalidates cached metadata", async () => {
    let discoveryDescription = "Files v1";
    let describes = 0;
    let resolutions = 0;
    const bridge = new VanillaNeutronBridge({
      lifecycleTargets: {},
      resolveIcon: async () => {
        resolutions += 1;
        return `resolved:${resolutions}`;
      },
      api: api({
        listApps: async () => ({
          apps: [{ id: "files", description: discoveryDescription }],
        }),
        describeApp: async () => {
          describes += 1;
          return {
            id: "files",
            name: "Files",
            description: discoveryDescription,
            version: describes,
            tiles: [{ id: "main", title: "Files", icon: "static/icon.svg" }],
          };
        },
      }),
    });

    expect((await bridge.loadElements())[0]?.icon).toBe("resolved:1");
    discoveryDescription = "Files v2";
    expect((await bridge.loadElements())[0]?.icon).toBe("resolved:2");
    expect(describes).toBe(2);
    expect(resolutions).toBe(2);
  });
});

test("openElement remains Kernel-owned and preserves reuseExisting true", async () => {
  const opens: unknown[] = [];
  const bridge = new VanillaNeutronBridge({
    lifecycleTargets: {},
    resolveIcon: async () => undefined,
    api: api({
      listApps: async () => ({ apps: [{ id: "mail", description: "Mail" }] }),
      describeApp: async () => ({
        id: "mail",
        name: "Mail",
        tiles: [{ id: "main", title: "Mail" }],
      }),
      openAppTile: async (request) => {
        opens.push(request);
        return {};
      },
    }),
  });

  await bridge.openElement("mail", { view: "inbox" });
  expect(opens).toEqual([{
    appId: "mail",
    tileId: "main",
    reuseExisting: true,
    view: "inbox",
  }]);
});

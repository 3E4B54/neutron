// This test intentionally runs in its own Bun process.
//
// Bun's mock.module() replacement is process-global and cannot be reliably
// restored. CertifiedAssetsSettingsControls needs a focused getNeutronCan
// replacement, so keeping that mock in the main kernel test process can poison
// later tests that need the real auth module.
import { expect, mock, test } from "bun:test";
import * as React from "react";
import type { NeutronCertifiedAssetsCapabilityConfig } from "neutron-tools/src/capabilities/catalog.js";

const manifest = {
  api: 2,
  max_entries: 10,
  max_committed_bytes: 1_000,
  max_object_bytes: 100,
  max_pending_stages: 1,
  max_staged_bytes: 200,
  max_batch_operations: 2,
  max_batch_bytes: 200,
  max_idempotency_receipts: 4,
  collections: [
    {
      id: "shares",
      mount: "shares",
      kind: "publication",
      max_object_bytes: 50,
    },
  ],
} satisfies NeutronCertifiedAssetsCapabilityConfig;

test("Certified Assets controls load once per generic installation scope", async () => {
  const requests: unknown[] = [];
  const actor = {
    async kernel_certified_assets_scope_info(candidate: unknown) {
      requests.push(candidate);
      throw new Error("temporary query failure");
    },
    async kernel_certified_assets_usage() {
      return null;
    },
  };
  const authModule = new URL("../src/reducer/auth.ts", import.meta.url).href;
  mock.module(authModule, () => ({
    getNeutronCan: async () => actor,
  }));

  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
        H: unknown;
      };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const slots: unknown[] = [];
  const dependencies: Array<readonly unknown[] | undefined> = [];
  const cleanups: Array<undefined | (() => void)> = [];
  let cursor = 0;
  let dirty = false;
  let effects: Array<() => void> = [];

  const dispatcher = {
    useCallback<T extends (...args: never[]) => unknown>(
      callback: T,
      deps: readonly unknown[],
    ): T {
      const index = cursor++;
      if (!sameDependencies(dependencies[index], deps)) {
        slots[index] = callback;
        dependencies[index] = deps;
      }
      return slots[index] as T;
    },
    useEffect(
      create: () => void | (() => void),
      deps: readonly unknown[],
    ): void {
      const index = cursor++;
      if (sameDependencies(dependencies[index], deps)) return;
      dependencies[index] = deps;
      effects.push(() => {
        cleanups[index]?.();
        const cleanup = create();
        cleanups[index] = typeof cleanup === "function" ? cleanup : undefined;
      });
    },
    useRef<T>(initialValue: T): { current: T } {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initialValue };
      return slots[index] as { current: T };
    },
    useState<T>(
      initialValue: T | (() => T),
    ): [T, (next: T | ((current: T) => T)) => void] {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] =
          typeof initialValue === "function"
            ? (initialValue as () => T)()
            : initialValue;
      }
      return [
        slots[index] as T,
        (next) => {
          const current = slots[index] as T;
          slots[index] =
            typeof next === "function"
              ? (next as (value: T) => T)(current)
              : next;
          dirty = true;
        },
      ];
    },
  };

  try {
    const { CertifiedAssetsSettingsControls } = await import(
      "../src/settings/CertifiedAssetsSettingsControls.tsx"
    );
    const baseProps = {
      actionsDisabled: false,
      appId: "example_app",
      appName: "Example app",
      manifest,
      open: true,
      routeSummaries: [],
    };
    let installationUid = "7";
    const render = () => {
      cursor = 0;
      effects = [];
      const previousDispatcher = internals.H;
      internals.H = dispatcher;
      try {
        CertifiedAssetsSettingsControls({
          ...baseProps,
          capabilitySummary: {
            enabled: true,
            installationUid,
            declarationFingerprint: "a".repeat(64),
          } as Parameters<
            typeof CertifiedAssetsSettingsControls
          >[0]["capabilitySummary"],
        });
      } finally {
        internals.H = previousDispatcher;
      }
      for (const effect of effects) effect();
    };
    const settle = async (expectedCalls: number) => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        await Bun.sleep(0);
        if (dirty) {
          dirty = false;
          render();
        }
        if (requests.length === expectedCalls && !dirty) {
          await Bun.sleep(0);
          if (!dirty) return;
        }
      }
      throw new Error(`Timed out waiting for ${expectedCalls} scoped loads`);
    };

    render();
    await settle(1);
    render();
    render();
    await settle(1);
    expect(requests).toEqual([{ app_id: "example_app", installation_uid: 7n }]);

    installationUid = "8";
    render();
    await settle(2);
    render();
    await settle(2);
    expect(requests).toEqual([
      { app_id: "example_app", installation_uid: 7n },
      { app_id: "example_app", installation_uid: 8n },
    ]);
  } finally {
    for (const cleanup of cleanups) cleanup?.();
    mock.restore();
  }
});

function sameDependencies(
  left: readonly unknown[] | undefined,
  right: readonly unknown[],
): boolean {
  return (
    left !== undefined &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

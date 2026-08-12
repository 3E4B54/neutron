// @ts-ignore -- bun:test is available to the repository test runner but excluded from the browser tsconfig globals.
import { expect, test } from "bun:test";
import type { WindowId } from "../contracts/common.ts";
import { NativeWindowManager, type NativeWindowManagerOptions } from "./NativeWindowManager.ts";

function ids() {
  let next = 0;
  return () => `window:mru:${++next}`;
}

function manager(options: NativeWindowManagerOptions = {}): NativeWindowManager {
  return new NativeWindowManager({
    idFactory: ids(),
    viewport: () => ({ x: 0, y: 0, width: 1200, height: 800 }),
    listenForViewportChanges: false,
    ...options,
  });
}

test("create focuses new windows and records newest-first MRU order", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});

  expect(windows.focusSnapshot()).toEqual({
    focusedId: third,
    mru: [third, second, first],
  });
});

test("focus promotes an existing window without duplicating its MRU identity", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});

  windows.focus(first);
  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, third, second] });

  windows.focus(first);
  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, third, second] });
});

test("focus of an unknown window leaves current focus and MRU unchanged", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const before = windows.focusSnapshot();

  windows.focus("window:missing");

  expect(windows.focusSnapshot()).toEqual(before);
  expect(windows.focusSnapshot().focusedId).toBe(first);
});

test("minimizing the focused window activates the newest visible MRU fallback", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});

  windows.focus(first);
  windows.focus(third);
  expect(windows.focusSnapshot().mru).toEqual([third, first, second]);

  windows.minimize(third);

  expect(windows.get(third)?.minimized).toBe(true);
  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, third, second] });
});

test("minimizing an unfocused window keeps current focus and its MRU position", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});
  windows.focus(first);
  const before = windows.focusSnapshot();

  windows.minimize(second);

  expect(windows.focusSnapshot()).toEqual(before);
  expect(windows.focusSnapshot().focusedId).toBe(first);
  expect(windows.get(second)?.minimized).toBe(true);
  expect(windows.get(third)?.minimized).toBe(false);
});

test("automatic fallback skips minimized MRU entries but retains them for explicit switching", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});

  windows.focus(first);
  windows.minimize(third);
  windows.minimize(first);

  expect(windows.focusSnapshot()).toEqual({ focusedId: second, mru: [second, first, third] });
  expect(windows.get(first)?.minimized).toBe(true);
  expect(windows.get(third)?.minimized).toBe(true);
});

test("all hidden windows leave no current focus and explicit focus restores the selected MRU window", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});

  windows.minimize(second);
  windows.minimize(first);
  expect(windows.focusSnapshot()).toEqual({ focusedId: null, mru: [first, second] });

  windows.focus(second);
  expect(windows.get(second)?.minimized).toBe(false);
  expect(windows.focusSnapshot()).toEqual({ focusedId: second, mru: [second, first] });
});

test("restoring a minimized previous window focuses it and promotes it in MRU", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});

  windows.minimize(second);
  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, second] });

  windows.restore(second);
  expect(windows.get(second)?.minimized).toBe(false);
  expect(windows.focusSnapshot()).toEqual({ focusedId: second, mru: [second, first] });
});

test("closing the focused window removes it and activates the newest visible fallback", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});
  windows.focus(first);
  windows.focus(third);

  windows.close(third);

  expect(windows.get(third)).toBeUndefined();
  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, second] });
});

test("closing an unfocused window removes its stale MRU entry without changing focus", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});
  windows.focus(first);

  windows.close(second);

  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first, third] });
  expect(windows.focusSnapshot().mru).not.toContain(second);
});

test("fallback skips a minimized window when the focused window closes", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});

  windows.focus(first);
  windows.minimize(third);
  windows.close(first);

  expect(windows.focusSnapshot()).toEqual({ focusedId: second, mru: [second, third] });
});

test("z-order compaction does not rewrite or duplicate MRU history", () => {
  const windows = manager({ zBase: 0, zCompactAt: 100 });
  const first = windows.create("process:first", {});
  const second = windows.create("process:second", {});
  const third = windows.create("process:third", {});
  windows.focus(first);
  const expected = [first, third, second];

  for (let index = 0; index < 140; index += 1) windows.focus(first);

  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: expected });
  expect(windows.get(first)?.z ?? 1000).toBeLessThan(100);
});

test("focus snapshots are detached from the manager ledger", () => {
  const windows = manager();
  const first = windows.create("process:first", {});
  const snapshot = windows.focusSnapshot();
  (snapshot.mru as WindowId[]).push("window:caller-mutation");

  expect(windows.focusSnapshot()).toEqual({ focusedId: first, mru: [first] });
});

import { expect, test } from "bun:test";
import { canRequestFullscreen, exitFullscreenSafely, requestFullscreenSafely } from "./fullscreen.ts";

test("Photos uses expanded view without requesting fullscreen when policy disables it", async () => {
  let requests = 0;
  const target = { requestFullscreen: async () => { requests += 1; } };
  const result = await requestFullscreenSafely(target, { fullscreenEnabled: false });
  expect(result.mode).toBe("expanded");
  expect(result.message).toContain("expanded view");
  expect(requests).toBe(0);
  expect(canRequestFullscreen(target, { fullscreenEnabled: false })).toBe(false);
});

test("Photos catches fullscreen rejection and falls back cleanly", async () => {
  const target = { requestFullscreen: async () => { throw new TypeError("Fullscreen request denied"); } };
  await expect(requestFullscreenSafely(target, { fullscreenEnabled: true })).resolves.toEqual({
    mode: "expanded",
    message: "Browser fullscreen is unavailable in this hosted view. Using expanded view instead.",
  });
});

test("Photos handles fullscreen exit rejection without an uncaught promise", async () => {
  await expect(exitFullscreenSafely({
    exitFullscreen: async () => { throw new TypeError("denied"); },
  })).resolves.toContain("could not be exited");
});

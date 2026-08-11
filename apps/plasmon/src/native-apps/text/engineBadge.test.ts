import { expect, test } from "bun:test";
import { MONACO_ENGINE_NAME } from "./MonacoEditorSurface.tsx";

test("native Text and Markdown expose a stable visible Monaco engine identity", () => {
  expect(MONACO_ENGINE_NAME).toBe("Monaco");
});

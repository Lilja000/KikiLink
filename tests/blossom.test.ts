// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { resolveMainDrawingContext } from "../src/modules/link-chat/blossom";

describe("room Blossom canvas compatibility", () => {
  it("uses modern Bondage Club's drawing context directly", () => {
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;

    expect(resolveMainDrawingContext(context)).toBe(context);
  });

  it("still supports builds that expose the canvas element", () => {
    const canvas = document.createElement("canvas");
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(canvas, "getContext").mockReturnValue(context);

    expect(resolveMainDrawingContext(canvas)).toBe(context);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { tangPoemDataset } from "../../data/adapters/tangPoem";
import { buildPoetNetwork } from "./poetNetwork";

const { releaseContext } = vi.hoisted(() => ({ releaseContext: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setPixelRatio() {}
      getPixelRatio() {
        return 1;
      }
      setClearColor() {}
      dispose() {
        releaseContext();
      }
    },
  };
});
import { createStarfield } from "./starfieldRenderer";
import { createStarStudy } from "./starStudyRenderer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  releaseContext.mockClear();
});
describe("WebGL failure cleanup", () => {
  it("releases the study renderer and model when its point-comparison texture fails", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const host = document.createElement("div");
    expect(() => createStarStudy(host, "李白", vi.fn(), vi.fn())).toThrow(
      "Canvas texture unavailable",
    );
    expect(host.querySelector("canvas")).toBeNull();
    expect(releaseContext).toHaveBeenCalledOnce();
  });
  it("releases the partial renderer if a star texture cannot initialize", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("devicePixelRatio", 1);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const host = document.createElement("div");
    const poet = buildPoetNetwork(tangPoemDataset).poets[0];
    expect(() => createStarfield(host, [poet], vi.fn(), vi.fn())).toThrow(
      "Canvas texture unavailable",
    );
    expect(host.querySelector("canvas")).toBeNull();
    expect(releaseContext).toHaveBeenCalledOnce();
  });
});

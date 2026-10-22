import { describe, expect, it } from "vitest";
import { createCelestialBody, experimentNames } from "./celestialBodies";

describe("五种星体材质实验", () => {
  it("creates five distinct 3D forms and leaves other poets out of the experiment", () => {
    expect(experimentNames).toEqual(["李白", "杜甫", "王维", "李商隐", "元稹"]);
    const kinds = new Set<string>();
    for (const name of experimentNames) {
      const body = createCelestialBody(name)!;
      kinds.add(body.kind);
      expect(body.group.children.length).toBeGreaterThan(1);
      expect(body.description.length).toBeGreaterThan(8);
      body.update(3);
      body.dispose();
    }
    expect(kinds.size).toBe(5);
    expect(createCelestialBody("韩愈")).toBeNull();
  });
  it("moves two actual stellar cores in the binary form and releases every resource once", () => {
    const body = createCelestialBody("元稹")!;
    const cores = body.group.children.filter(
      (child) => child.name === "stellar-core",
    );
    expect(cores).toHaveLength(2);
    body.update(0);
    const before = cores[0].position.clone();
    body.update(10);
    expect(cores[0].position.distanceTo(before)).toBeGreaterThan(0.1);
    expect(cores[0].position.distanceTo(cores[1].position)).toBeGreaterThan(1);
    let disposed = 0;
    body.group.traverse((object) => {
      const mesh = object as import("three").Mesh;
      mesh.geometry?.addEventListener("dispose", () => disposed++);
    });
    body.dispose();
    const first = disposed;
    expect(first).toBeGreaterThan(0);
    body.dispose();
    expect(disposed).toBe(first);
  });
});

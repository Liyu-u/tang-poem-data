import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyCameraPan } from "./starfieldProjection";

describe("starfield camera pan", () => {
  it("moves near and far stars by the same screen distance", () => {
    const camera = new THREE.PerspectiveCamera(38, 900 / 720, 1, 5000);
    camera.position.z = 1050;
    const screen = (point: THREE.Vector3) => {
      const projected = point.clone().project(camera);
      return { x: (projected.x + 1) * 450, y: (1 - projected.y) * 360 };
    };
    const near = new THREE.Vector3(100, 20, 200);
    const far = new THREE.Vector3(100, 20, -200);
    const beforeNear = screen(near);
    const beforeFar = screen(far);
    applyCameraPan(camera, 70, -35, 900, 720);
    expect(screen(near).x - beforeNear.x).toBeCloseTo(70);
    expect(screen(far).x - beforeFar.x).toBeCloseTo(70);
    expect(screen(near).y - beforeNear.y).toBeCloseTo(-35);
    expect(screen(far).y - beforeFar.y).toBeCloseTo(-35);
  });
});

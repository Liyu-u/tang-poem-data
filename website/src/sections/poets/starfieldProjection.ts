import type { PerspectiveCamera } from "three";

/** Match SVG's screen-space pan without introducing perspective parallax. */
export function applyCameraPan(
  camera: PerspectiveCamera,
  panX: number,
  panY: number,
  width: number,
  height: number,
) {
  if (!width || !height) return;
  const pixelsPerUnit = height / 720;
  camera.setViewOffset(
    width,
    height,
    -panX * pixelsPerUnit,
    -panY * pixelsPerUnit,
    width,
    height,
  );
}

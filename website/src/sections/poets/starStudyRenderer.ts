import * as THREE from "three";
import { createCelestialBody } from "./celestialBodies";

export function createStarStudy(
  host: HTMLElement,
  name: string,
  onFps: (fps: number) => void,
  onFailure: () => void,
) {
  const cleanup: (() => void)[] = [];
  let disposed = false,
    frame = 0;
  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    cleanup.push(() => {
      renderer.domElement.remove();
      renderer.dispose();
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x030710, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.15, 7.3);
    camera.lookAt(0, 0, 0);
    const rotation = new THREE.Group();
    scene.add(rotation);
    const body = createCelestialBody(name);
    if (!body) throw Error("Unsupported star study");
    cleanup.push(() => body.dispose());
    rotation.add(body.group);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas texture unavailable");
    const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.04, "#e7f0ff");
    glow.addColorStop(0.13, "#abc8ec88");
    glow.addColorStop(0.5, "#abc8ec12");
    glow.addColorStop(1, "#abc8ec00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    cleanup.push(() => texture.dispose());
    const pointMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    cleanup.push(() => pointMaterial.dispose());
    const point = new THREE.Sprite(pointMaterial);
    point.scale.set(3.5, 3.5, 1);
    scene.add(point);
    let width = 1,
      height = 1,
      time = 0,
      last = 0,
      measureStart = 0,
      frames = 0,
      visible = false,
      playing = true,
      detailed = true;
    let yaw = 0.15,
      pitch = -0.08;
    const draw = () => {
      if (disposed) return;
      rotation.rotation.set(pitch, yaw, 0);
      body.group.visible = detailed;
      point.visible = !detailed;
      body.update(time, camera);
      renderer.render(scene, camera);
    };
    function tick(now: number) {
      frame = 0;
      if (disposed || !visible || document.hidden || !playing || !detailed)
        return;
      if (now - last >= 32) {
        time += last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        draw();
        frames++;
        if (!measureStart) measureStart = now;
        if (now - measureStart >= 1500) {
          onFps(Math.round((frames * 1000) / (now - measureStart)));
          measureStart = now;
          frames = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const wake = () => {
      if (
        !disposed &&
        !frame &&
        visible &&
        !document.hidden &&
        playing &&
        detailed
      ) {
        last = 0;
        measureStart = 0;
        frames = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    cleanup.push(stop);
    const resize = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    });
    cleanup.push(() => resize.disconnect());
    resize.observe(host);
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) stop();
      else wake();
    });
    cleanup.push(() => observer.disconnect());
    observer.observe(host);
    const visibility = () => {
      if (document.hidden) stop();
      else wake();
    };
    const lost = (e: Event) => {
      e.preventDefault();
      stop();
      onFailure();
    };
    document.addEventListener("visibilitychange", visibility);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    cleanup.push(() => {
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
    });
    draw();
    return {
      update(animate: boolean, detail: boolean) {
        playing = animate;
        detailed = detail;
        draw();
        if (!playing || !detailed) stop();
        else wake();
      },
      rotate(dx: number, dy: number) {
        yaw += dx * 0.012;
        pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.012));
        draw();
      },
      reset() {
        yaw = 0.15;
        pitch = -0.08;
        draw();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        for (const release of cleanup.reverse()) release();
      },
    };
  } catch (error) {
    disposed = true;
    for (const release of cleanup.reverse()) {
      try {
        release();
      } catch {
        /* Continue releasing resources. */
      }
    }
    throw error;
  }
}

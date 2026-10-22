import * as THREE from "three";
import { applyCameraPan } from "./starfieldProjection";
import type { NetworkPoet } from "./poetNetwork";
import { createCelestialBody } from "./celestialBodies";

export type StarView = { yaw: number; pitch: number; zoom: number; panX: number; panY: number };
export type StarMetrics = {
  fps: number;
  particles: number;
  mode: "WebGL" | "静态星图";
};

const vertex = `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_PointSize = clamp(aSize * uPixelRatio * (1100.0 / -p.z), 1.0, 15.0);
  vColor = aColor;
  vAlpha = 0.65 + 0.25 * sin(uTime * 0.65 + aPhase);
}`;
const fragment = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  float glow = exp(-r * r * 25.0);
  float core = exp(-r * r * 230.0);
  gl_FragColor = vec4(vColor * (0.65 + core), (glow * 0.5 + core) * vAlpha);
}`;
const nebulaFragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uDrift;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
 vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
float fbm(vec2 p) {
 float n=0.0, a=0.5;
 for(int i=0;i<5;i++){ n+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p+12.1; a*=0.5; }
 return n;
}
void main(){
 vec2 uv = vUv + uDrift * 0.04;
 vec2 p = uv * vec2(5.0,4.0);
 float t=uTime*0.004;
 float cloud=fbm(p+vec2(fbm(p+2.3+t),fbm(p-1.5-t))*2.1);
 float detail=fbm(p*4.3+cloud*2.0);
 float river=exp(-pow((uv.y-0.24-uv.x*0.52+(cloud-0.5)*0.62)*4.8,2.0));
 float strands=pow(max(0.0,cloud*1.65-0.48),2.0)*river;
 vec3 gold=vec3(0.22,0.20,0.12), blue=vec3(0.09,0.20,0.17), violet=vec3(0.16,0.20,0.18);
 vec3 hue=mix(gold,blue,smoothstep(0.05,0.62,uv.x));
 hue=mix(hue,violet,smoothstep(0.60,1.0,uv.x));
 vec3 color=vec3(0.055,0.095,0.082)+hue*(strands*0.85+detail*river*0.09);
 float dark=fbm(p*2.0+8.1);
 color*=0.5+smoothstep(0.18,0.75,dark);
 float dust=pow(hash(floor(uv*vec2(1800.0,1400.0))),95.0)*river*detail;
 color+=vec3(0.54,0.48,0.32)*dust*0.22;
 gl_FragColor=vec4(color,1.0);
}`;

// A tiny generated light texture: no external asset, portrait, or model request.
function lightTexture(form: NetworkPoet["star"]["form"]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas texture unavailable");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.035, "rgba(255,255,255,1)");
  gradient.addColorStop(0.1, "rgba(244,240,220,.55)");
  gradient.addColorStop(0.22, "rgba(221,225,205,.10)");
  gradient.addColorStop(0.5, "rgba(208,221,201,.015)");
  gradient.addColorStop(1, "rgba(200,220,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  if (form === "flare" || form === "giant") {
    const beam = ctx.createLinearGradient(0, 0, 128, 0);
    beam.addColorStop(0, "transparent");
    beam.addColorStop(0.46, "rgba(255,255,255,.12)");
    beam.addColorStop(0.5, "rgba(244,240,220,.35)");
    beam.addColorStop(0.54, "rgba(255,255,255,.12)");
    beam.addColorStop(1, "transparent");
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(0.18);
    ctx.translate(-64, -64);
    ctx.fillStyle = beam;
    ctx.fillRect(0, 63.3, 128, 1.4);
    ctx.translate(64, 64);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-64, -64);
    ctx.fillRect(0, 63.5, 128, 1);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStarfield(
  host: HTMLElement,
  poets: NetworkPoet[],
  onMetrics: (m: StarMetrics) => void,
  onFailure: () => void,
) {
  const lowPower = matchMedia("(max-width: 700px)").matches;
  const count = lowPower ? 1200 : 2800;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  const failedCleanup: (() => void)[] = [
    () => {
      renderer.domElement.remove();
      renderer.dispose();
    },
  ];
  try {
    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.5),
    );
    renderer.setClearColor(0x243e37, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      (2 * Math.atan(360 / 1050) * 180) / Math.PI,
      900 / 720,
      1,
      5000,
    );
    camera.position.z = 1050;
    const group = new THREE.Group();
    scene.add(group);
    let seed = 14810;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const xyz = new Float32Array(count * 3),
      sizes = new Float32Array(count),
      phases = new Float32Array(count),
      colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 2400,
        band = random() < 0.68;
      xyz.set(
        [
          x,
          band ? x * 0.38 + (random() - 0.5) * 540 : (random() - 0.5) * 1800,
          -(random() * 1500 + 80),
        ],
        i * 3,
      );
      sizes[i] =
        random() < 0.035 ? 5 + random() * 3 : 1.2 + Math.pow(random(), 3) * 3.6;
      phases[i] = random() * Math.PI * 2;
      color.setHSL(
        0.53 + random() * 0.13,
        random() * 0.28,
        0.55 + random() * 0.4,
      );
      if (random() < 0.2) color.set("#e8c79b");
      colors.set([color.r, color.g, color.b], i * 3);
    }
    // Localized dust gives the cloud-shaped poet stars a distinct silhouette.
    const clouds = poets.filter((p) => p.star.form === "nebula");
    for (let i = 0; i < Math.min(count * 0.18, clouds.length * 150); i++) {
      const poet = clouds[i % clouds.length];
      const a = random() * Math.PI * 2,
        r = Math.pow(random(), 1.7) * 70;
      xyz.set(
        [
          poet.position.x + Math.cos(a) * r,
          -poet.position.y + Math.sin(a) * r * 0.4,
          -poet.position.z - 8 - random() * 20,
        ],
        i * 3,
      );
      color.set(poet.star.color);
      colors.set([color.r * 0.65, color.g * 0.65, color.b * 0.65], i * 3);
      sizes[i] = 0.8 + random() * 1.7;
    }
    const geometry = new THREE.BufferGeometry();
    failedCleanup.push(() => geometry.dispose());
    geometry.setAttribute("position", new THREE.BufferAttribute(xyz, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    failedCleanup.push(() => material.dispose());
    group.add(new THREE.Points(geometry, material));
    const textures = new Map<NetworkPoet["star"]["form"], THREE.Texture>();
    const sprites = poets.map((p) => {
      let texture = textures.get(p.star.form);
      if (!texture) {
        texture = lightTexture(p.star.form);
        const createdTexture = texture;
        failedCleanup.push(() => createdTexture.dispose());
        textures.set(p.star.form, texture);
      }
      const mat = new THREE.SpriteMaterial({
        map: texture,
        color: new THREE.Color(p.star.color).lerp(
          new THREE.Color("#d9d7be"),
          0.36,
        ),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      failedCleanup.push(() => mat.dispose());
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(p.position.x, -p.position.y, -p.position.z);
      group.add(sprite);
      return { id: p.id, sprite, mat, size: p.star.size };
    });
    const bodies = poets.flatMap((p) => {
      const body = createCelestialBody(p.name);
      if (!body) return [];
      failedCleanup.push(() => body.dispose());
      body.group.position.set(p.position.x, -p.position.y, -p.position.z);
      group.add(body.group);
      return [{ id: p.id, body, size: p.star.size }];
    });
    const background = new THREE.Scene();
    const nebulaGeometry = new THREE.PlaneGeometry(2, 2);
    failedCleanup.push(() => nebulaGeometry.dispose());
    const nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader: nebulaFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uDrift: { value: new THREE.Vector2() } },
    });
    failedCleanup.push(() => nebulaMaterial.dispose());
    background.add(new THREE.Mesh(nebulaGeometry, nebulaMaterial));
    // Cache the expensive procedural clouds at a lower resolution. Star points
    // remain sharp at display resolution, while cloud motion needs only 5 Hz.
    const cloudTarget = new THREE.WebGLRenderTarget(640, 512, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    failedCleanup.push(() => cloudTarget.dispose());
    const compositeScene = new THREE.Scene();
    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: { uCloud: { value: cloudTarget.texture } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader:
        "varying vec2 vUv;uniform sampler2D uCloud;void main(){vec3 c=texture2D(uCloud,vUv).rgb;float edge=smoothstep(0.,.17,vUv.x)*smoothstep(0.,.17,1.-vUv.x)*smoothstep(0.,.15,vUv.y)*smoothstep(0.,.15,1.-vUv.y);gl_FragColor=vec4(c,edge*.34);}",
    });
    failedCleanup.push(() => compositeMaterial.dispose());
    compositeScene.add(new THREE.Mesh(nebulaGeometry, compositeMaterial));
    let cloudDirty = true,
      lastCloudTime = -1;
    let width = 0,
      height = 0,
      frame = 0,
      disposed = false,
      visible = true,
      playing = true,
      documentVisible = !document.hidden;
    let time = 0,
      last = 0,
      measureStart = 0,
      measuredFrames = 0;
    let view: StarView = { yaw: 0, pitch: -0.08, zoom: 1, panX: 0, panY: 0 };
    let selected: string | undefined;
    let detailed = true;
    const updateTransforms = () => {
      group.rotation.set(view.pitch, -view.yaw, 0, "XYZ");
      group.scale.x = 1;
      group.position.x = 0;
      group.position.y = 5;
      camera.zoom = view.zoom;
      applyCameraPan(camera, view.panX, view.panY, width, height);
      for (const p of sprites) {
        const scale = 48 * p.size * (p.id === selected ? 1.3 : 1);
        p.sprite.scale.set(scale, scale, 1);
        p.mat.opacity =
          detailed && bodies.some((b) => b.id === p.id) ? 0.05 : 0.62;
      }
      for (const b of bodies) {
        b.body.group.visible = detailed;
        const scale = 10 * b.size * (b.id === selected ? 1.2 : 1);
        b.body.group.scale.set(scale, scale, scale);
      }
      nebulaMaterial.uniforms.uDrift.value.set(view.yaw, view.pitch);
      cloudDirty = true;
    };
    function draw() {
      if (disposed || !width || !height) return;
      renderer.autoClear = true;
      if (cloudDirty || time - lastCloudTime > 0.2) {
        renderer.setRenderTarget(cloudTarget);
        renderer.render(background, camera);
        renderer.setRenderTarget(null);
        cloudDirty = false;
        lastCloudTime = time;
      }
      renderer.setViewport(0, 0, width, height);
      renderer.render(compositeScene, camera);
      renderer.autoClear = false;
      renderer.setViewport(0, 0, width, height);
      if (detailed) for (const b of bodies) b.body.update(time, camera);
      renderer.render(scene, camera);
    }
    function tick(now: number) {
      frame = 0;
      if (disposed || !visible || !documentVisible || !playing) return;
      if (now - last >= 32) {
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
        time += dt;
        last = now;
        material.uniforms.uTime.value = time;
        nebulaMaterial.uniforms.uTime.value = time;
        draw();
        measuredFrames++;
        if (!measureStart) measureStart = now;
        if (now - measureStart >= 1500) {
          onMetrics({
            fps: Math.round((measuredFrames * 1000) / (now - measureStart)),
            particles: count,
            mode: "WebGL",
          });
          measureStart = now;
          measuredFrames = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (!frame && !disposed && visible && documentVisible && playing) {
        last = 0;
        measureStart = 0;
        measuredFrames = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    const resize = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateTransforms();
      renderer.setSize(width, height, false);
      cloudTarget.setSize(
        Math.max(1, Math.round(Math.min(width, 1000) * 0.7)),
        Math.max(1, Math.round(Math.min(height, 800) * 0.7)),
      );
      cloudDirty = true;
      draw();
    });
    failedCleanup.push(() => resize.disconnect());
    resize.observe(host);
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      wake();
    });
    observer.observe(host);
    failedCleanup.push(() => observer.disconnect());
    const visibility = () => {
      documentVisible = !document.hidden;
      if (!documentVisible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      wake();
    };
    const lost = (e: Event) => {
      e.preventDefault();
      onFailure();
    };
    document.addEventListener("visibilitychange", visibility);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    failedCleanup.push(() => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
    });
    updateTransforms();
    wake();
    onMetrics({ fps: 0, particles: count, mode: "WebGL" });
    return {
      update(
        next: StarView,
        id: string | undefined,
        animate: boolean,
        detailedBodies = true,
      ) {
        view = next;
        selected = id;
        playing = animate;
        detailed = detailedBodies;
        updateTransforms();
        draw();
        if (!playing && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        wake();
      },
      dispose() {
        disposed = true;
        cancelAnimationFrame(frame);
        resize.disconnect();
        observer.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        geometry.dispose();
        material.dispose();
        nebulaGeometry.dispose();
        nebulaMaterial.dispose();
        cloudTarget.dispose();
        compositeMaterial.dispose();
        for (const p of sprites) p.mat.dispose();
        for (const t of textures.values()) t.dispose();
        for (const b of bodies) b.body.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      },
    };
  } catch (error) {
    for (const cleanup of failedCleanup.reverse()) {
      try {
        cleanup();
      } catch {
        /* Finish releasing the remaining resources. */
      }
    }
    throw error;
  }
}

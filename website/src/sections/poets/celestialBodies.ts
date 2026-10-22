import * as THREE from "three";

import { isExperimentalPoet, experimentNotes } from "./experimentCatalog";
export { experimentNames } from "./experimentCatalog";

const surfaceVertex = `
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vView;
void main(){
 vPosition=position;
 vNormal=normalize(normalMatrix*normal);
 vec4 mv=modelViewMatrix*vec4(position,1.0);
 vView=normalize(-mv.xyz);
 gl_Position=projectionMatrix*mv;
}`;
const noise = `
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(7.1,3.5,1.3);a*=0.5;}return v;}
`;
const surfaceFragment = `
uniform float uTime;
uniform float uGrain;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vView;
${noise}
void main(){
 vec3 p=vPosition*uGrain;
 float t=uTime*0.025;
 float warp=fbm(p*.42+vec3(t,-t,0.0));
 float granules=fbm(p+warp*2.4+vec3(t,0.0,t*.4));
 float filaments=pow(1.0-abs(granules*2.0-1.0),7.0);
 vec3 c=mix(uLow,uMid,smoothstep(.22,.66,granules));
 c=mix(c,uHigh,filaments*.28);
 float facing=max(dot(normalize(vNormal),normalize(vView)),0.0);
 c*=.58+.42*pow(facing,.35);
 c+=uHigh*pow(1.0-facing,4.0)*.13;
 gl_FragColor=vec4(c,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const planeVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const coronaFragment = `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
${noise}
void main(){
 vec2 p=(vUv-.5)*2.0;float r=length(p),a=atan(p.y,p.x);
 float flow=fbm(vec3(cos(a)*4.0,sin(a)*4.0,uTime*.018));
 float edge=.43+flow*.04;
 float envelope=exp(-max(0.0,r-edge)*(11.0+flow*6.0));
 float stream=pow(.5+.5*sin(a*9.0+flow*8.0),3.0);
 float alpha=envelope*smoothstep(.40,.49,r)*(.06+stream*.12)*(1.0-smoothstep(.8,1.0,r));
 gl_FragColor=vec4(uColor,alpha);
}`;
const cloudFragment = `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
uniform float uLayer;
uniform float uViolet;
${noise}
void main(){
 vec2 p=(vUv-.5)*2.0;
 float t=uTime*.008;
 float n=fbm(vec3(p*3.4+uLayer,t+uLayer));
 vec2 q=p+vec2(n-.5,fbm(vec3(p*2.2,uLayer+3.0))-.5)*.5;
 float r=length(q*vec2(.92,1.15));float a=atan(q.y,q.x);
 float spiral=.5+.5*sin(a*2.0+r*8.0-n*5.0+uLayer*2.0+t);
 float ring=exp(-pow((r-(.38+n*.2))*(5.8-uViolet*1.6),2.0));
 float openSpace=smoothstep(.12,.35,r)*(1.0-smoothstep(.65,.94,r));
 float structure=mix(.28+n*.72,pow(spiral,1.7),uViolet*.8);
 float alpha=ring*openSpace*structure*(.32+uViolet*.16);
 gl_FragColor=vec4(uColor*(.6+n*.9),alpha);
}`;

export type CelestialBody = {
  group: THREE.Group;
  kind: string;
  description: string;
  update: (time: number, camera?: THREE.Camera) => void;
  dispose: () => void;
};

/** Shared between the tiny map body and the single selected, detailed study. */
export function createCelestialBody(name: string): CelestialBody | null {
  if (!isExperimentalPoet(name)) return null;
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const timed: THREE.ShaderMaterial[] = [];
  const billboards: THREE.Mesh[] = [];
  const flares: THREE.Mesh[] = [];
  const cores: THREE.Mesh[] = [];
  const inverse = new THREE.Quaternion();
  const cameraOrientation = new THREE.Quaternion();
  let disposed = false;
  const geometry = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.add(g);
    return g;
  };
  const material = <T extends THREE.Material>(m: T): T => {
    materials.add(m);
    return m;
  };

  function core(
    radius: number,
    low: string,
    mid: string,
    high: string,
    grain: number,
  ) {
    const mat = material(
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        uniforms: {
          uTime: { value: 0 },
          uGrain: { value: grain },
          uLow: { value: new THREE.Color(low) },
          uMid: { value: new THREE.Color(mid) },
          uHigh: { value: new THREE.Color(high) },
        },
      }),
    );
    timed.push(mat);
    const mesh = new THREE.Mesh(
      geometry(new THREE.SphereGeometry(radius, 40, 28)),
      mat,
    );
    mesh.name = "stellar-core";
    group.add(mesh);
    cores.push(mesh);
    return mesh;
  }
  function corona(color: string, diameter: number) {
    const mat = material(
      new THREE.ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: coronaFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const mesh = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(diameter, diameter)),
      mat,
    );
    group.add(mesh);
    timed.push(mat);
    billboards.push(mesh);
    return mesh;
  }
  const kind =
    name === "李白"
      ? "plasma-flare"
      : name === "杜甫"
        ? "granular-giant"
        : name === "王维"
          ? "jade-shell"
          : name === "李商隐"
            ? "veiled-nebula"
            : "orbiting-binary";
  if (name === "李白") {
    core(0.94, "#283e3d", "#819e9b", "#e3e5d9", 5.2);
    corona("#b9cbc0", 3.6);
    for (let i = 0; i < 2; i++) {
      const mesh = new THREE.Mesh(
        geometry(
          new THREE.TorusGeometry(
            1.06 + i * 0.12,
            0.022 - i * 0.005,
            8,
            90,
            Math.PI * 1.35,
          ),
        ),
        material(
          new THREE.MeshBasicMaterial({
            color: i ? "#8baba3" : "#d2dcd0",
            transparent: true,
            opacity: 0.34,
          }),
        ),
      );
      mesh.rotation.set(0.9 + i * 0.8, 0.4 + i * 0.6, 0.4 + i * 1.6);
      group.add(mesh);
      flares.push(mesh);
    }
  } else if (name === "杜甫") {
    core(1.12, "#443d28", "#a08e5d", "#e5d4a4", 4.2);
    corona("#c3ae7d", 3.9);
  } else if (name === "王维" || name === "李商隐") {
    const violet = name === "李商隐";
    core(
      violet ? 0.22 : 0.3,
      violet ? "#443e47" : "#234237",
      violet ? "#9b8e9c" : "#88ad97",
      "#e0e9df",
      4,
    );
    for (let i = 0; i < 3; i++) {
      const colors = violet
        ? ["#7e7484", "#ad9eaa", "#7e8794"]
        : ["#6b9480", "#91b69d", "#bac9ad"];
      const mat = material(
        new THREE.ShaderMaterial({
          vertexShader: planeVertex,
          fragmentShader: cloudFragment,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(colors[i]) },
            uLayer: { value: i * 0.7 },
            uViolet: { value: violet ? 1 : 0 },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      const mesh = new THREE.Mesh(
        geometry(new THREE.PlaneGeometry(4.2, 4.2)),
        mat,
      );
      mesh.position.set(
        (i - 1) * (violet ? 0.23 : 0.08),
        (i - 1) * 0.1,
        (i - 1) * 0.38,
      );
      group.add(mesh);
      timed.push(mat);
      billboards.push(mesh);
    }
  } else {
    core(0.66, "#61372d", "#db9177", "#ffe9bd", 6.2);
    core(0.44, "#493442", "#be83a0", "#fce3d7", 7.8);
    corona("#eac09c", 4.7);
  }
  return {
    group,
    kind,
    description: experimentNotes[name],
    update(time, camera) {
      if (disposed) return;
      for (const m of timed) m.uniforms.uTime.value = time;
      cores.forEach((mesh, i) => {
        mesh.rotation.y =
          time * (name === "杜甫" ? 0.025 : 0.045) * (i ? -1 : 1);
      });
      flares.forEach((mesh, i) => {
        mesh.rotation.z = 0.4 + i * 1.6 + time * 0.06 * (i ? -1 : 1);
      });
      if (name === "元稹") {
        const a = time * 0.13;
        cores[0].position.set(
          -Math.cos(a) * 0.78,
          -Math.sin(a) * 0.3,
          -Math.sin(a) * 0.4,
        );
        cores[1].position.set(
          Math.cos(a) * 0.98,
          Math.sin(a) * 0.38,
          Math.sin(a) * 0.5,
        );
      }
      if (camera)
        for (const mesh of billboards) {
          mesh.parent!.getWorldQuaternion(inverse).invert();
          camera.getWorldQuaternion(cameraOrientation);
          mesh.quaternion.copy(inverse).multiply(cameraOrientation);
        }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      group.clear();
    },
  };
}

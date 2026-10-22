export type ScenePointer = { x: number; y: number; speed: number; vx?: number; inside: boolean };
export type PaintSprite = { file: string; x: number; y: number; width: number; height: number };
export type PaintLayer = PaintSprite & {
  id: string;
  kind: 'bend' | 'mist' | 'cloud' | 'bird' | 'boat' | 'reflection' | 'bloom' | 'water';
  pivot: [number, number]; strength: number; phase: number; mesh?: [number, number];
};

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

export function movePaintPoint(layer: PaintLayer, x: number, y: number, time: number, amount: number, pointer: ScenePointer) {
  if (amount <= 0) return { x, y };
  const a = clamp(amount), mx = clamp((pointer.x - 460) / 430, -1, 1);
  const speed = clamp(pointer.speed), vx = clamp(pointer.vx ?? 0, -1, 1);
  const phase = layer.phase;
  let dx = 0, dy = 0;
  switch (layer.kind) {
    case 'bend': {
      const h = clamp((layer.pivot[1] - y) / Math.max(1, layer.pivot[1] - layer.y));
      const nearby = .45 + .55 * Math.exp(-(((pointer.x - layer.pivot[0]) / 320) ** 2));
      const wind = mx * .58 + vx * .48 + Math.sin(time * 1.85 + phase) * (.35 + speed * .35);
      dx = layer.strength * wind * h ** 1.8 * nearby;
      dy = -Math.abs(dx) * h * .045;
      break;
    }
    case 'mist':
      dx = layer.strength * (mx * .8 + Math.sin(time * .35 + phase) * .65);
      dy = Math.sin(time * .42 + phase) * 1.8;
      break;
    case 'cloud':
      dx = layer.strength * (mx * .8 + Math.sin(time * .25 + phase) * .7);
      dy = Math.sin(time * .34 + phase + x * .004) * 2;
      break;
    case 'bird': {
      dx = Math.sin(time * .46 + phase * .12) * 32 + mx * 10;
      dy = -5 - Math.sin(time * .78 + phase * .32) * 7;
      const wing = clamp(Math.abs(x - layer.pivot[0]) / Math.max(1, layer.width * .4));
      dy += (y - layer.pivot[1]) * Math.sin(time * 7 + phase) * .85 * wing;
      break;
    }
    case 'boat':
    case 'reflection': {
      dx = mx * 30 + Math.sin(time * .28) * 26;
      dy = Math.sin(time * 1.3) * .85;
      if (layer.kind === 'reflection') {
        dx += Math.sin(y * .19 + time * 2) * 1.3;
        dy *= .5;
      } else {
        dx += (layer.pivot[1] - y) * Math.sin(time * 1.3) * .015;
      }
      break;
    }
    case 'bloom': {
      const px = x - layer.pivot[0], py = y - layer.pivot[1];
      const near = .4 + .6 * Math.exp(-(((pointer.x - layer.pivot[0]) / 135) ** 2 + ((pointer.y - layer.pivot[1]) / 70) ** 2));
      const opening = (1 - Math.exp(-time * 1.4)) * near;
      const angle = Math.atan2(py, px);
      const spread = opening * (.28 + Math.sin(angle * 5 + phase) * .055);
      dx = px * spread;
      dy = py * spread - opening * .5;
      break;
    }
    case 'water':
      dx = Math.sin(y * .28 + time * 1.4) * layer.strength;
      dy = Math.sin(x * .08 + time * 1.8) * .35;
      break;
  }
  return { x: x + dx * a, y: y + dy * a };
}

export function particlePose(index: number, time: number, amount: number, pointer: ScenePointer, scene: string) {
  const life = (time * (.14 + index % 4 * .008) + index * .6180339) % 1;
  const wind = clamp((pointer.x - 440) / 420, -1, 1) * 35 + clamp(pointer.vx ?? 0, -1, 1) * 20;
  return {
    x: life * (22 + wind) + Math.sin(life * 5 + index) * 8,
    y: life * (scene === '春' ? 58 : 72),
    alpha: clamp(amount) * Math.sin(life * Math.PI) ** .7 * .85,
    rotation: index * 2.399 + time * (.45 + index % 3 * .2),
    scale: .65 + (index % 5) * .12,
  };
}

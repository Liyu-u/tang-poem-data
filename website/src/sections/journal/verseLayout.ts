export type VerseSpace = { width: number; height: number; cx: number; cy: number; radius: number };
export type VersePlacement = { x: number; y: number; fontSize: number; width: number; height: number; visible: number };

// Fill the four diagonal gaps between the peripheral lettering and the center.
export function layoutCornerVerses(lines: string[], space: VerseSpace, occupied: VersePlacement[], seed: number): VersePlacement[] {
  const placed: VersePlacement[] = [];
  const random = (n: number) => {
    const value = Math.sin(seed * 23.71 + n * 67.13) * 43758.5453;
    return value - Math.floor(value);
  };
  lines.forEach((line, index) => {
    const right = index % 2 === 1;
    const lower = index >= 2;
    const targetX = space.cx + (right ? 1 : -1) * space.radius * .52;
    let best: VersePlacement | undefined;
    let bestScore = -Infinity;
    for (const scale of [1, .88, .76]) {
      const fontSize = Math.min(31, Math.max(19, space.width * .044)) * scale;
      const width = fontSize + 6;
      const height = Array.from(line).length * fontSize * 1.2;
      for (let sample = 0; sample < 160; sample++) {
        const x = targetX - width / 2 + (random(sample * 2 + index * 500) - .5) * space.radius * .36;
        const offset = 12 + random(sample * 2 + index * 500 + 1) * 48;
        const y = lower ? space.height - height - 32 - offset : offset;
        if (x < 4 || x + width > space.width - 4 || y < 4 || y + height > space.height - 30) continue;
        if ([...occupied, ...placed].some(p => p.fontSize && x < p.x + p.width + 8 && x + width + 8 > p.x && y < p.y + p.height + 10 && y + height + 10 > p.y)) continue;
        const score = -Math.abs(x + width / 2 - targetX) + scale * 30 + random(sample + 4000) * 14;
        if (score > bestScore) { bestScore = score; best = { x, y, width, height, fontSize, visible: 0 }; }
      }
    }
    placed.push(best ?? { x: 0, y: 0, width: 0, height: 0, fontSize: 0, visible: 0 });
  });
  return placed;
}

// Supplemental lettering can sit behind the ring; keep the established outer layout.
export function layoutMiddleVerses(lines: string[], space: VerseSpace, outer: VersePlacement[], seed: number): VersePlacement[] {
  const placed: VersePlacement[] = [];
  const random = (n: number) => {
    const value = Math.sin(seed * 17.31 + n * 73.17) * 43758.5453;
    return value - Math.floor(value);
  };
  lines.forEach((line, index) => {
    const fontSize = Math.min(34, Math.max(23, space.width * .05));
    const width = fontSize + 6;
    const height = Array.from(line).length * fontSize * 1.2;
    const lateral = index < 2;
    const targetX = lateral ? space.cx + (index === 0 ? -1 : 1) * space.radius * .92 : space.cx;
    const targetY = lateral ? space.cy : index % 2 === 0 ? height / 2 + 12 : space.height - height / 2 - 38;
    let best: VersePlacement | undefined;
    let bestScore = -Infinity;
    for (let sample = 0; sample < 180; sample++) {
      const x = Math.max(4, Math.min(space.width - width - 4, targetX + (random(sample * 2 + index * 500) - .5) * space.radius * (lateral ? .65 : 1.25) - width / 2));
      const y = Math.max(4, Math.min(space.height - height - 30, targetY - height / 2 + (random(sample * 2 + index * 500 + 1) - .5) * (lateral ? space.radius * .45 : 36)));
      if (y < 4 || y + height > space.height - 26) continue;
      if ([...outer, ...placed].some(p => p.fontSize && x < p.x + p.width + 8 && x + width + 8 > p.x && y < p.y + p.height + 10 && y + height + 10 > p.y)) continue;
      const score = -Math.hypot(x + width / 2 - targetX, (y + height / 2 - targetY) * 1.3) + random(sample + 4000) * 25;
      if (score > bestScore) { bestScore = score; best = { x, y, width, height, fontSize, visible: 0 }; }
    }
    placed.push(best ?? { x: 0, y: 0, width: 0, height: 0, fontSize: 0, visible: 0 });
  });
  return placed;
}

// Search around the actual ring, preferring readable letters and balanced whitespace.
export function layoutVerses(lines: string[], space: VerseSpace, seed: number): VersePlacement[] {
  const { width, height, cx, cy, radius } = space;
  const random = (n: number) => {
    const value = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const placed: VersePlacement[] = [];
  const base = Math.min(38, Math.max(26, width * .055));
  lines.forEach((line, index) => {
    let best: VersePlacement | undefined;
    let bestScore = -Infinity;
    for (const scale of [1, .88, .76, .64]) {
      const fontSize = base * scale;
      const w = fontSize + 6;
      const h = Array.from(line).length * fontSize * 1.2;
      if (h > height - 32) continue;
      for (let sample = 0; sample < 280; sample++) {
        const x = 4 + random(sample * 2 + index * 1001) * Math.max(0, width - w - 8);
        const y = 4 + random(sample * 2 + index * 1001 + 1) * Math.max(0, height - h - 32);
        if (placed.some(p => x < p.x + p.width + 7 && x + w + 7 > p.x && y < p.y + p.height + 10 && y + h + 10 > p.y)) continue;
        let visible = 0;
        for (let char = 0; char < Array.from(line).length; char++) {
          const nearX = Math.max(x - 3, Math.min(cx, x + w + 3));
          const nearY = Math.max(y + char * fontSize * 1.2 - 3, Math.min(cy, y + (char + 1) * fontSize * 1.2 + 3));
          if (Math.hypot(nearX - cx, nearY - cy) > radius) visible++;
        }
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const neighbors = placed.filter(p => (p.x < cx) === (x < cx) && (p.y + p.height / 2 < cy) === (centerY < cy)).length;
        const spacing = placed.length ? Math.min(...placed.map(p => Math.hypot(centerX - p.x - p.width / 2, centerY - p.y - p.height / 2))) / Math.max(width, height) : 0;
        const score = visible / Array.from(line).length * 100 + scale * 14 + spacing * 8 - neighbors * 5 + random(sample + index * 37 + 8000) * 9;
        if (score > bestScore) { bestScore = score; best = { x, y, width: w, height: h, fontSize, visible }; }
      }
    }
    // Extremely small panels may have insufficient whitespace; omit visual overflow.
    placed.push(best ?? { x: 0, y: 0, width: 0, height: 0, fontSize: 0, visible: 0 });
  });
  return placed;
}

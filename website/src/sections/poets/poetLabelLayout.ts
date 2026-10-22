type Point = { x: number; y: number };
type LabelInput = { id: string; name: string; point: Point };
export type PoetLabel = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  tier: "prominent" | "familiar" | "other";
};

// Editorial visual prominence, not a numeric measure of literary merit.
const prominent = new Set([
  "李白", "杜甫", "王维", "白居易", "李商隐", "杜牧", "孟浩然",
  "王昌龄", "王勃", "韩愈", "柳宗元", "刘禹锡", "岑参", "高适",
  "李贺", "陈子昂", "王之涣",
]);
const familiar = new Set([
  "元稹", "张若虚", "韦应物", "贺知章", "贾岛", "孟郊", "温庭筠",
  "薛涛", "张籍", "张祜", "皮日休", "陆龟蒙", "裴迪", "王建",
  "李颀", "常建", "骆宾王", "杨炯", "祖咏", "王湾", "张继",
  "王翰", "卢纶", "李益", "刘长卿", "司空图",
]);

export function labelTier(name: string): PoetLabel["tier"] {
  return prominent.has(name) ? "prominent" : familiar.has(name) ? "familiar" : "other";
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function layoutPoetLabels(
  items: LabelInput[],
  viewWidth: number,
  surfaceHeight: number,
  selectedId?: string,
): Map<string, PoetLabel> {
  const compact = viewWidth < 650;
  const unitScale = 720 / surfaceHeight;
  const sizes = compact
    ? { prominent: 18, familiar: 14, other: 11 }
    : { prominent: 18, familiar: 14, other: 11 };
  const priority = { prominent: 2, familiar: 1, other: 0 };
  const result = new Map<string, PoetLabel>();
  const placed: Array<{ x: number; top: number; width: number; height: number }> = [];

  for (const item of [...items].sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId) ||
    priority[labelTier(b.name)] - priority[labelTier(a.name)] ||
    a.name.localeCompare(b.name, "zh-CN"),
  )) {
    const tier = labelTier(item.name);
    const fontSize = sizes[tier] * unitScale * (item.id === selectedId ? 1.15 : 1);
    const width = Math.min(viewWidth - 12, item.name.length * fontSize + 7);
    const height = fontSize + 5 * unitScale;
    const step = Math.max(13, height + 3 * unitScale);
    let best: { x: number; y: number; score: number } | undefined;

    search: for (let row = 0; row <= 28; row++) {
      for (const direction of row === 0 ? [0] : [-1, 1]) {
        for (const side of [1, -1]) {
          for (const column of [0, 1, 2]) {
            const preferredX = item.point.x + side * (16 * unitScale + column * (width + 8 * unitScale));
            const x = clamp(side > 0 ? preferredX : preferredX - width, 6, viewWidth - width - 6);
            const y = clamp(item.point.y + fontSize * 0.34 + direction * row * step, fontSize + 9, 697);
            const top = y - fontSize;
            const overlap = placed.reduce((sum, other) => {
              const dx = Math.max(0, Math.min(x + width, other.x + other.width) - Math.max(x, other.x));
              const dy = Math.max(0, Math.min(top + height, other.top + other.height) - Math.max(top, other.top));
              return sum + dx * dy;
            }, 0);
            const distance = Math.hypot(x - item.point.x, y - item.point.y);
            const score = overlap * 50 + distance + row * 0.1;
            if (!best || score < best.score) best = { x, y, score };
            if (overlap === 0 && distance < step * 1.5) break search;
          }
        }
      }
    }
    const label = { x: best!.x, y: best!.y, width, fontSize, tier };
    result.set(item.id, label);
    placed.push({ x: label.x, top: label.y - fontSize, width, height });
  }
  return result;
}

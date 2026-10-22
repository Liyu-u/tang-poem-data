import relationCsv from "../../../../data/poet_relations.csv?raw";
import publicRelationCsv from "../../../../public_data/relations.csv?raw";
import publicPoetCsv from "../../../../public_data/poets.csv?raw";
import { starProfile, type StarProfile } from "./starProfiles";
import type { Dataset, PoetRecord } from "../../types/domain";
import { researchedRelations, supplementalPoets } from "./supplementalPoets";

export type Vec3 = { x: number; y: number; z: number };
export type NetworkPoet = PoetRecord & {
  position: Vec3;
  star: StarProfile;
  dateLabel?: string;
};
export type PoetRelation = {
  id: string;
  source: string;
  target: string;
  label: string;
  explanation: string;
  evidence: string;
  sourceLabel: string;
  reviewStatus: string;
  poemIds: string[];
  directed: boolean;
};

// Read the repository's records, preserving review status and direction.
function csvRecords(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else field += c;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows
    .filter((r) => r.length === headers.length)
    .map((r) =>
      Object.fromEntries(
        headers.map((h, i) => [h.replace(/^\uFEFF/, ""), r[i]]),
      ),
    );
}

// Keep each connected constellation in one sector of the sky. The previous
// degree-only rings sent relationships across the entire chart and crowded its
// centre; sectors let the actual graph determine the composition.
function constellationPositions(records: PoetRecord[], relations: PoetRelation[]) {
  const neighbours = new Map(records.map((poet) => [poet.id, new Set<string>()]));
  for (const relation of relations) {
    neighbours.get(relation.source)?.add(relation.target);
    neighbours.get(relation.target)?.add(relation.source);
  }
  const degree = (id: string) => neighbours.get(id)?.size ?? 0;
  const byId = new Map(records.map((poet) => [poet.id, poet]));
  const visited = new Set<string>();
  const groups: PoetRecord[][] = [];
  for (const poet of records) {
    if (visited.has(poet.id)) continue;
    const group: PoetRecord[] = [];
    const queue = [poet.id];
    while (queue.length) {
      const id = queue.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const member = byId.get(id);
      if (member) group.push(member);
      queue.push(...(neighbours.get(id) ?? []));
    }
    groups.push(group);
  }
  const connected = groups.filter((group) => group.length > 1).sort((a, b) =>
    b.length - a.length || a[0].name.localeCompare(b[0].name, "zh-CN"),
  );
  const singles = groups.filter((group) => group.length === 1).map((group) => group[0]);
  const positions = new Map<string, Vec3>();
  const totalWeight = connected.reduce((sum, group) => sum + group.length + 2, 0);
  let cursor = -Math.PI * 0.86;
  for (const group of connected) {
    const sweep = Math.PI * 1.72 * (group.length + 2) / Math.max(1, totalWeight);
    const middle = cursor + sweep / 2;
    const ranked = [...group].sort((a, b) =>
      degree(b.id) - degree(a.id) || a.name.localeCompare(b.name, "zh-CN"),
    );
    const columns = Math.ceil((ranked.length - 1) / 3);
    for (const [index, poet] of ranked.entries()) {
      const hub = index === 0;
      const lane = hub ? 0 : 1 + (index - 1) % 3;
      const column = Math.floor((index - 1) / 3);
      const angle = hub ? middle : cursor + sweep * (column + 0.5 + (lane - 2) * 0.19) / Math.max(1, columns);
      const radius = hub ? 160 : [0, 250, 340, 425][lane];
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.74;
      const z = (hub ? 125 : (lane - 2) * 112) + Math.sin(angle * 2) * 55;
      positions.set(poet.id, { x, y, z });
    }
    cursor += sweep;
  }
  // Unlinked poets remain visible, but occupy the quieter outer sky rather
  // than falsely suggesting that they belong to a documented constellation.
  for (const poet of singles.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))) {
    let best = { x: 0, y: 0, z: 0 };
    let bestClearance = -Infinity;
    for (let slot = 0; slot < 96; slot++) {
      const angle = -Math.PI + slot * Math.PI * 2 / 96;
      const radius = slot % 3 === 0 ? 445 : 385;
      const candidate = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.74, z: slot % 2 ? -95 : 95 };
      const clearance = Math.min(...[...positions.values()].map((point) =>
        Math.hypot((point.x - candidate.x) * 0.9, point.y - candidate.y),
      ), 999);
      if (clearance > bestClearance) {
        best = candidate;
        bestClearance = clearance;
      }
    }
    positions.set(poet.id, best);
  }
  // A fixed, deterministic relaxation creates breathing room for the names.
  // Connected stars still pull together, while every pair resists collision.
  for (let iteration = 0; iteration < 260; iteration++) {
    const movement = new Map(records.map((poet) => [poet.id, { x: 0, y: 0 }]));
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = positions.get(records[i].id)!;
        const b = positions.get(records[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        const spacing = 66 + Math.max(records[i].name.length, records[j].name.length) * 3;
        if (distance >= spacing) continue;
        const force = (spacing - distance) * 0.065;
        movement.get(records[i].id)!.x += dx / distance * force;
        movement.get(records[i].id)!.y += dy / distance * force;
        movement.get(records[j].id)!.x -= dx / distance * force;
        movement.get(records[j].id)!.y -= dy / distance * force;
      }
    }
    for (const relation of relations) {
      const a = positions.get(relation.source);
      const b = positions.get(relation.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (distance < 145) continue;
      const force = Math.min(1.8, (distance - 145) * 0.008);
      movement.get(relation.source)!.x += dx / distance * force;
      movement.get(relation.source)!.y += dy / distance * force;
      movement.get(relation.target)!.x -= dx / distance * force;
      movement.get(relation.target)!.y -= dy / distance * force;
    }
    for (const poet of records) {
      const point = positions.get(poet.id)!;
      const delta = movement.get(poet.id)!;
      point.x = Math.max(-425, Math.min(425, point.x + delta.x));
      point.y = Math.max(-290, Math.min(290, point.y + delta.y));
    }
  }
  for (const point of positions.values()) point.z *= 0.55;
  return positions;
}
export function buildPoetNetwork(dataset: Dataset) {
  const records: (PoetRecord & { dateLabel?: string })[] = [...dataset.poets];
  if (records.length && records.some((p) => !p.isDemo)) {
    for (const row of csvRecords(publicPoetCsv)) {
      if (records.some((p) => p.name === row.name))
        continue;
      records.push({
        id: row.poet_id,
        name: row.name,
        period: row.period as PoetRecord["period"],
        dateLabel: `${row.birth_year || "生年待考"} — ${row.death_year || "卒年待考"}`,
        biography: `唐代诗人。人物资料取自本地公开诗人表，生卒年沿用该表的约数与待考口径。人物详情仍待审核。`,
        poemIds: dataset.poems
          .filter((p) => p.poetId === row.poet_id)
          .map((p) => p.id),
        isDemo: false,
        dataStatus: "production",
        reviewStatus: "pending",
      });
    }
    for (const [name, period] of supplementalPoets) {
      if (records.some((poet) => poet.name === name)) continue;
      records.push({
        id: `poet-research-${name}`,
        name,
        period,
        dateLabel: "生卒年待考",
        biography: "唐代诗人。人物已列入星河拓展名录；生平、字号与生卒年仍待逐项核验。",
        poemIds: [],
        isDemo: false,
        dataStatus: "production",
        reviewStatus: "pending",
      });
    }
  }
  const poetIds = new Set(records.map((p) => p.id));
  const poemIds = new Set(dataset.poems.map((p) => p.id));
  const labels: Record<string, string> = {
    gift_poem: "赠诗",
    friend: "同游",
    other: "寄怀",
  };
  const relations: PoetRelation[] = csvRecords(relationCsv)
    .filter((r) => poetIds.has(r.from_poet_id) && poetIds.has(r.to_poet_id))
    .map((r) => ({
      id: r.poet_relation_id,
      source: r.from_poet_id,
      target: r.to_poet_id,
      label: labels[r.relation_type] ?? "文学往来",
      explanation: r.explanation,
      evidence: r.evidence_quote,
      sourceLabel: r.source_locator,
      reviewStatus: r.review_status,
      poemIds: poemIds.has(r.evidence_poem_id) ? [r.evidence_poem_id] : [],
      directed: true,
    }));
  const poetByName = new Map(records.map((p) => [p.name, p]));
  for (const r of csvRecords(publicRelationCsv)) {
    const from = poetByName.get(r.from_poet);
    const to = poetByName.get(r.to_poet);
    if (
      !from ||
      !to ||
      relations.some(
        (e) =>
          (e.source === from.id && e.target === to.id) ||
          (e.source === to.id && e.target === from.id),
      )
    )
      continue;
    relations.push({
      id: `public-${from.id}-${to.id}`,
      source: from.id,
      target: to.id,
      label: r.relation_scopes.includes("史料交游")
        ? "交游"
        : r.relation_scopes.includes("荐举")
          ? "荐举"
          : r.relation_scopes.includes("文学往来")
            ? "文学往来"
            : "文学关联",
      explanation: `本地资料将二人列为“${r.relation_scopes}”。此记录尚未完成人工审核，仅作为探索线索；文学关联不等同于现实交游。`,
      evidence: r.evidence,
      sourceLabel: r.sources,
      reviewStatus: "pending",
      directed: false,
      poemIds: dataset.poems
        .filter((p) => r.evidence.includes(p.title))
        .map((p) => p.id),
    });
  }
  for (const [index, item] of researchedRelations.entries()) {
    const from = poetByName.get(item.from);
    const to = poetByName.get(item.to);
    if (!from || !to) continue;
    relations.push({
      id: `research-${index}`,
      source: from.id,
      target: to.id,
      label: item.label,
      explanation: `${item.work.startsWith("《") ? item.work : `《${item.work}》`}支持“${item.label}”线索；请按所引作品或文献的具体记载理解，不据此推断关系强度。`,
      evidence: item.work,
      sourceLabel: item.url,
      reviewStatus: "pending",
      poemIds: dataset.poems
        .filter((poem) => poem.title === item.work && poem.poetId === from.id)
        .map((poem) => poem.id),
      directed: !["文学往来", "文学并称", "唱和", "同游", "同作", "交游", "联唱", "宗亲"].includes(item.label),
    });
  }
  const positions = constellationPositions(records, relations);
  const poets: NetworkPoet[] = records.map((p) => {
    return {
      ...p,
      star: starProfile(p.name),
      position: positions.get(p.id)!,
    };
  });
  return { poets, relations };
}

export function projectPoint(
  point: Vec3,
  yaw: number,
  pitch: number,
  zoom: number,
  viewWidth = 900,
) {
  const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
  const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  const y = point.y * Math.cos(pitch) - z * Math.sin(pitch);
  const depth = point.y * Math.sin(pitch) + z * Math.cos(pitch);
  const scale = (1050 / (1050 + depth)) * zoom;
  return {
    x: viewWidth / 2 + x * scale,
    y: 355 + y * scale,
    depth,
    scale,
  };
}

export function boundedZoom(value: number) {
  return Math.min(1.65, Math.max(0.65, value));
}



import { describe, expect, it } from "vitest";
import { tangPoemDataset } from "../../data/adapters/tangPoem";
import { buildPoetNetwork, projectPoint } from "./poetNetwork";

describe("星河样本数据", () => {
  it("provides 80 distinct poets with an explained artistic star identity", () => {
    const { poets, relations } = buildPoetNetwork(tangPoemDataset);
    expect(poets).toHaveLength(80);
    expect(new Set(poets.map((p) => p.id)).size).toBe(80);
    for (const poet of poets) {
      expect(poet.star.type).toBeTruthy();
      expect(poet.star.reason.length).toBeGreaterThan(8);
      expect(poet.star.color).toMatch(/^#[\da-f]{6}$/i);
    }
    expect(poets.map((p) => p.name)).toContain("元稹");
    expect(poets.map((p) => p.name)).toContain("裴迪");
    expect(poets.map((p) => p.name)).toContain("陆龟蒙");
    expect(poets.map((p) => p.name)).toContain("王之涣");
    expect(new Set(poets.map((p) => p.period))).toEqual(
      new Set(["初唐", "盛唐", "中唐", "晚唐"]),
    );
    const ids = new Set(poets.map((p) => p.id));
    expect(relations.every((r) => ids.has(r.source) && ids.has(r.target))).toBe(
      true,
    );
    expect(relations.length).toBeGreaterThanOrEqual(30);
    const connectedIds = new Set(relations.flatMap((relation) => [relation.source, relation.target]));
    expect(poets.filter((poet) => !connectedIds.has(poet.id)).length).toBeLessThanOrEqual(25);
    expect(relations.filter((relation) => relation.id.startsWith("research-")).every((relation) =>
      relation.sourceLabel.startsWith("https://zh.wikisource.org/") && relation.evidence.length > 2,
    )).toBe(true);
    const named = new Map(poets.map((poet) => [poet.id, poet.name]));
    expect(
      relations.some(
        (relation) =>
          named.get(relation.source) === "王维" &&
          named.get(relation.target) === "裴迪" &&
          relation.sourceLabel.includes("http"),
      ),
    ).toBe(true);
    const hasRelation = (a: string, b: string, label: string) =>
      relations.some((relation) =>
        named.get(relation.source) === a && named.get(relation.target) === b && relation.label === label,
      );
    expect(hasRelation("张籍", "王建", "赠诗")).toBe(true);
    expect(hasRelation("鱼玄机", "温庭筠", "寄怀")).toBe(true);
    expect(hasRelation("宋之问", "沈佺期", "文学并称")).toBe(true);
  });
  it("does not inject the prototype roster into an empty dataset", () => {
    expect(buildPoetNetwork({ ...tangPoemDataset, poets: [] }).poets).toEqual(
      [],
    );
  });
  it("spreads graph communities through the available sky", () => {
    const { poets, relations } = buildPoetNetwork(tangPoemDataset);
    const byId = new Map(poets.map((poet) => [poet.id, poet]));
    for (const poet of poets) {
      expect(Number.isFinite(poet.position.x)).toBe(true);
      expect(Number.isFinite(poet.position.y)).toBe(true);
      expect(Math.abs(poet.position.x)).toBeLessThanOrEqual(425);
      expect(Math.abs(poet.position.y)).toBeLessThanOrEqual(290);
    }
    expect(Math.max(...poets.map((poet) => poet.position.x))).toBeGreaterThan(330);
    expect(Math.min(...poets.map((poet) => poet.position.x))).toBeLessThan(-330);
    expect(Math.max(...poets.map((poet) => poet.position.y))).toBeGreaterThan(230);
    expect(Math.min(...poets.map((poet) => poet.position.y))).toBeLessThan(-230);
    const lengths = relations.map((relation) => {
      const from = byId.get(relation.source)!.position;
      const to = byId.get(relation.target)!.position;
      return Math.hypot(from.x - to.x, from.y - to.y);
    }).sort((a, b) => a - b);
    expect(lengths[Math.floor(lengths.length / 2)]).toBeLessThan(300);
  });
  it("keeps spherical proportions when the chart gets wider", () => {
    const point = { x: 200, y: 0, z: 0 };
    const standard = projectPoint(point, 0, 0, 1);
    const wide = projectPoint(point, 0, 0, 1, 1440);
    expect(standard.x).toBe(650);
    expect(wide.x).toBe(920);
    expect(wide.y).toBe(standard.y);
  });
});

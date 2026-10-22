import { describe, expect, it } from "vitest";
import { buildPoetNetwork, projectPoint } from "./poetNetwork";
import { tangPoemDataset } from "../../data/adapters/tangPoem";
import { layoutPoetLabels } from "./poetLabelLayout";

describe("诗人姓名排布", () => {
  const poets = buildPoetNetwork(tangPoemDataset).poets;

  it.each([
    { width: 1320, height: 780 },
    { width: 390, height: 700 },
  ])("keeps all 80 names inside a $width px chart", ({ width, height }) => {
    const viewWidth = (720 * width) / height;
    const points = poets.map((poet) => ({
      id: poet.id,
      name: poet.name,
      point: projectPoint(poet.position, 0, -0.08, 1, viewWidth),
    }));
    const labels = layoutPoetLabels(points, viewWidth, height, poets[0].id);
    expect(labels.size).toBe(80);
    for (const label of labels.values()) {
      expect(label.x).toBeGreaterThanOrEqual(4);
      expect(label.x + label.width).toBeLessThanOrEqual(viewWidth - 4);
      expect(label.y - label.fontSize).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(720);
    }
    const byName = new Map(poets.map((poet) => [poet.name, labels.get(poet.id)!]));
    expect(byName.get("李白")!.fontSize).toBeGreaterThan(byName.get("裴迪")!.fontSize);
    expect(byName.get("裴迪")!.fontSize).toBeGreaterThan(byName.get("郑昈")!.fontSize);
  });
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tangPoemDataset } from "../../data/adapters/tangPoem";
import { PoetJianghu } from "./PoetJianghu";

afterEach(cleanup);

describe("诗人江湖", () => {
  it("omits the explanatory starfield note", () => {
    render(
      <PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />,
    );
    expect(screen.queryByText(/星体为诗风的艺术意象/)).not.toBeInTheDocument();
  });

  it("keeps the relationship network visible while focusing a poet or an evidence link", () => {
    const { container } = render(
      <PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />,
    );
    const links = () =>
      screen.getAllByRole("button", { name: /^查看.+与.+的关系$/ });
    const count = links().length;
    expect(count).toBeGreaterThan(10);
    expect(
      container.querySelectorAll(".pn-link.is-context").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "查看诗人杜甫" }));
    expect(links()).toHaveLength(count);
    expect(
      container.querySelectorAll(".pn-link.is-active").length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("button", { name: "查看李白与孟浩然的关系" }),
    );
    expect(links()).toHaveLength(count);
    expect(container.querySelectorAll(".pn-link.is-active")).toHaveLength(1);
  });
  it("switches between detailed bodies and the original points for five study poets", () => {
    const { container } = render(
      <PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />,
    );
    expect(container.querySelector(".pn-ink-atmosphere")).toBeNull();
    expect(
      container.querySelector(".pn-observation-tools"),
    ).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("星体观测工具", { exact: true }));
    expect(container.querySelector(".pn-observation-tools")).toHaveAttribute(
      "open",
    );
    const experiment = screen.getByRole("group", { name: "五种星体实验" });
    expect(within(experiment).getAllByRole("button")).toHaveLength(5);
    expect(
      screen.queryByRole("region", { name: "旋转李白星体" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "展开星体近景" }));
    expect(screen.getByRole("region", { name: "旋转李白星体" })).toBeVisible();
    fireEvent.click(
      within(experiment).getByRole("button", { name: "实验观察元稹" }),
    );
    expect(screen.getByRole("region", { name: "旋转元稹星体" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "原始光点" }));
    expect(screen.getByText("原始光点 · 对照")).toBeVisible();
    expect(screen.getByRole("button", { name: "原始光点" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "精细星体" }));
    expect(screen.getByText("星体近景")).toBeVisible();
  });
  it("shows 80 named stars without avatars and filters epochs", () => {
    const { container } = render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    expect(screen.getAllByRole("button", { name: /^查看诗人/ })).toHaveLength(
      80,
    );
    expect(container.querySelectorAll(".pn-node-name")).toHaveLength(80);
    expect(container.querySelector(".pn-node-name--prominent")?.textContent).toBeTruthy();
    expect(container.querySelector(".pn-node-name--other")?.textContent).toBeTruthy();
    expect(
      screen.queryByRole("img", { name: /人物插画/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "只看晚唐" }));
    expect(
      screen.getByRole("button", { name: "查看诗人李商隐" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "查看诗人李白" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "查找诗人" }), {
      target: { value: "元稹" },
    });
    fireEvent.click(screen.getByRole("button", { name: /元稹\s*中唐/ }));
    expect(
      screen.getByRole("button", { name: "查看诗人元稹" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("桃金伴星")).toBeVisible();
  });
  it("shows every relation line by default and allows a focused view", () => {
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    const toggle = screen.getByRole("button", { name: "收起全部关系线" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "诗人三维关系星云图" })).toHaveClass("is-all-relations");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "显示全部关系线" })).toHaveAttribute("aria-pressed", "false");
  });
  it("allows motion to be paused independently of selection", () => {
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "暂停星空动态" }));
    expect(screen.getByRole("button", { name: "播放星空动态" })).toBeVisible();
  });
  it("selects a poet and opens an actual work from the dataset", () => {
    const open = vi.fn();
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={open} />);
    fireEvent.click(screen.getByRole("button", { name: "查看诗人杜甫" }));
    const panel = screen.getByRole("complementary", { name: "诗人江湖详情" });
    expect(within(panel).getByRole("heading", { name: "杜甫" })).toBeVisible();
    expect(within(panel).getByText("待审核")).toBeVisible();
    fireEvent.click(
      within(panel).getByRole("button", { name: /阅读《春望》/ }),
    );
    expect(open).toHaveBeenCalledWith(
      tangPoemDataset.poems.find((p) => p.title === "春望")!.id,
    );
  });

  it("shows directional work evidence and review status for a selected relationship", () => {
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    fireEvent.click(
      screen.getByRole("button", { name: "查看李白与孟浩然的关系" }),
    );
    const panel = screen.getByRole("complementary", { name: "诗人江湖详情" });
    expect(
      within(panel).getByRole("heading", { name: "李白与孟浩然" }),
    ).toBeVisible();
    expect(within(panel).getByText("待审核")).toBeVisible();
    expect(
      within(panel).getByRole("button", {
        name: /阅读《黄鹤楼送孟浩然之广陵》/,
      }),
    ).toBeVisible();
  });

  it("captures wheel events only inside the graph and clamps/reset zoom", () => {
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    const graph = screen.getByRole("region", { name: "诗人三维关系星云图" });
    const inside = new WheelEvent("wheel", {
      deltaY: -10000,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      graph.dispatchEvent(inside);
    });
    expect(inside.defaultPrevented).toBe(true);
    expect(screen.getByLabelText("图谱缩放比例")).toHaveTextContent("165%");
    const outside = new WheelEvent("wheel", {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    screen.getByRole("heading", { name: "诗人星河" }).dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "重置视角" }));
    expect(screen.getByLabelText("图谱缩放比例")).toHaveTextContent("100%");
  });

  it("rotates with left drag, pans with middle drag, and resets", () => {
    render(<PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />);
    const graph = screen.getByRole("region", { name: "诗人三维关系星云图" });
    const starX = () => Number(screen.getByRole("button", { name: "查看诗人李白" }).querySelector(".pn-point-core")!.getAttribute("cx"));
    const pointer = (type: string, id: number, x: number, y: number, button = 0) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { pointerId: id, clientX: x, clientY: y, button });
      fireEvent(graph, event);
    };
    const initialX = starX();
    pointer("pointerdown", 1, 100, 100);
    pointer("pointermove", 1, 140, 100);
    pointer("pointerup", 1, 140, 100);
    expect(starX()).not.toBeCloseTo(initialX);
    expect(screen.getByLabelText("图谱缩放比例")).toHaveTextContent("100%");
    fireEvent.click(screen.getByRole("button", { name: "重置视角" }));
    pointer("pointerdown", 2, 100, 100, 1);
    pointer("pointermove", 2, 140, 120, 1);
    pointer("pointerup", 2, 140, 120, 1);
    expect(starX()).toBeCloseTo(initialX + 40);
    fireEvent.click(screen.getByRole("button", { name: "重置视角" }));
    expect(starX()).toBeCloseTo(initialX);
  });

  it("supports name search and an empty dataset without broken details", () => {
    const { unmount } = render(
      <PoetJianghu dataset={tangPoemDataset} onOpenPoem={() => {}} />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "查找诗人" }), {
      target: { value: "不存在" },
    });
    expect(screen.getByText("未找到这位诗人，请换个名字试试。")).toBeVisible();
    unmount();
    render(
      <PoetJianghu
        dataset={{ ...tangPoemDataset, poets: [] }}
        onOpenPoem={() => {}}
      />,
    );
    expect(screen.getByText("诗人资料整理中")).toBeVisible();
  });
});

"""Build reviewed-scope statistics for the new 130-poem batch."""

from __future__ import annotations

import argparse
import csv
import json
import pathlib
from collections import Counter, defaultdict


REVIEWER = "Codex辅助复核（新增130首；非人工双审）"


def read_csv(path: pathlib.Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def approved(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    return [row for row in rows if row["review_status"] == "approved"]


def write_markdown(path: pathlib.Path, result: dict) -> None:
    metadata = result["metadata"]
    counts = metadata["decision_counts"]
    lines = [
        "# 新增130首辅助复核摘要 v1",
        "",
        f"- 复核时间：{metadata['reviewed_at']}",
        f"- 复核者：{metadata['reviewer']}",
        f"- 范围：{metadata['poem_count']} 首新增唐诗，{metadata['review_row_count']} 条复核记录",
        "- 口径：仅把 `approved` 标注纳入探索统计；`needs_revision` 和 `rejected` 不进入确认统计。",
        "- 边界：这是 Codex 辅助复核，不是两位真人专家终审；`poems.review_status` 仍保留 `pending`。",
        "",
        "## 复核结果",
        "",
        "| 数据对象 | approved | needs_revision | rejected |",
        "| --- | ---: | ---: | ---: |",
    ]
    for table in ("poem_tags", "poem_imagery", "color_occurrences", "technique_annotations", "dating_decision"):
        item = counts[table]
        lines.append(f"| `{table}` | {item.get('approved', 0)} | {item.get('needs_revision', 0)} | {item.get('rejected', 0)} |")
    lines.extend([
        "",
        "## 年份处理",
        "",
        f"- 有年份候选：{metadata['dating']['provisional_count']} 首；当前标为 `needs_revision`，需逐篇补年谱/编年本定位。",
        f"- 暂无可靠年份：{metadata['dating']['undetermined_count']} 首；已确认保留空值，不以作者生卒年替代创作年。",
        "",
        "## 使用说明",
        "",
        "- 主题、意象、颜色和表现手法统计只使用已通过辅助复核的行。",
        "- 结果仅代表本项目新增130首研究样本，不外推全部唐诗。",
        "- 人工复核时应优先处理所有 `needs_revision` 和 `rejected` 行，并补录审核者、日期、来源定位。",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    reports = root / "reports"
    output = reports / "tang_poem_stats_new130_reviewed_v1.json"
    summary = reports / "tang_poem_new130_review_summary_v1.md"
    if output.exists() or summary.exists():
        raise RuntimeError("reviewed statistics outputs already exist; refusing to overwrite them")

    manifest = read_csv(reports / "tang_poem_expansion_manifest_v1.csv")
    poem_ids = {row["poem_id"] for row in manifest}
    poems = [row for row in read_csv(root / "data" / "poems.csv") if row["poem_id"] in poem_ids]
    poets = {row["poet_id"]: row["name"] for row in read_csv(root / "data" / "poets.csv")}
    tags = {row["tag_id"]: row for row in read_csv(root / "data" / "tags.csv")}
    imagery = {row["imagery_id"]: row for row in read_csv(root / "data" / "imagery.csv")}
    poem_tags_all = [row for row in read_csv(root / "data" / "poem_tags.csv") if row["poem_id"] in poem_ids]
    poem_imagery_all = [row for row in read_csv(root / "data" / "poem_imagery.csv") if row["poem_id"] in poem_ids]
    colors_all = [row for row in read_csv(root / "data" / "color_occurrences.csv") if row["poem_id"] in poem_ids]
    techniques_all = [row for row in read_csv(root / "data" / "technique_annotations.csv") if row["poem_id"] in poem_ids]
    evidence = [row for row in read_csv(reports / "tang_poem_evidence_register_v2.csv") if row["poem_id"] in poem_ids]

    poem_tags = approved(poem_tags_all)
    poem_imagery = approved(poem_imagery_all)
    colors = approved(colors_all)
    techniques = approved(techniques_all)
    poem_by_id = {row["poem_id"]: row for row in poems}

    theme_poems = defaultdict(set)
    theme_annotations = Counter()
    for row in poem_tags:
        name = tags[row["tag_id"]]["tag_name"]
        theme_poems[name].add(row["poem_id"])
        theme_annotations[name] += 1

    imagery_poems = defaultdict(set)
    imagery_occurrences = Counter()
    for row in poem_imagery:
        name = imagery[row["imagery_id"]]["canonical_name"]
        imagery_poems[name].add(row["poem_id"])
        imagery_occurrences[name] += 1

    color_poems = defaultdict(set)
    color_occurrences = Counter()
    for row in colors:
        name = row["normalized_color"]
        color_poems[name].add(row["poem_id"])
        color_occurrences[name] += 1

    technique_poems = defaultdict(set)
    technique_annotations = Counter()
    for row in techniques:
        name = tags[row["technique_tag_id"]]["tag_name"]
        technique_poems[name].add(row["poem_id"])
        technique_annotations[name] += 1

    imagery_sets = defaultdict(set)
    for row in poem_imagery:
        imagery_sets[row["poem_id"]].add(imagery[row["imagery_id"]]["canonical_name"])
    cooccurrence = Counter()
    for names in imagery_sets.values():
        ordered = sorted(names)
        for index, left in enumerate(ordered):
            for right in ordered[index + 1:]:
                cooccurrence[(left, right)] += 1

    poet_theme = defaultdict(lambda: defaultdict(set))
    for row in poem_tags:
        poet = poets[poem_by_id[row["poem_id"]]["poet_id"]]
        theme = tags[row["tag_id"]]["tag_name"]
        poet_theme[poet][theme].add(row["poem_id"])

    decision_counts: dict[str, dict[str, int]] = {}
    for table, rows in (
        ("poem_tags", poem_tags_all),
        ("poem_imagery", poem_imagery_all),
        ("color_occurrences", colors_all),
        ("technique_annotations", techniques_all),
    ):
        decision_counts[table] = dict(Counter(row["review_status"] for row in rows))
    dating_rows = [row for row in evidence if row["dimension"] == "dating"]
    decision_counts["dating_decision"] = dict(Counter(row["review_status"] for row in dating_rows))

    result = {
        "metadata": {
            "dataset": "tang-poem-data",
            "version": "new130-reviewed-v1",
            "sample_scope": "新增130首精选唐诗；不是全部唐诗总体分布",
            "poem_count": len(poems),
            "poet_count": len(poets),
            "review_row_count": len(evidence),
            "reviewed_at": "2026-10-17T18:00:00+08:00",
            "reviewer": REVIEWER,
            "human_double_review_required": True,
            "annotation_scope": "仅纳入 review_status=approved 的主题、意象、颜色和表现手法行",
            "decision_counts": decision_counts,
            "dating": {
                "provisional_count": sum(row["dating_status"] == "provisional" for row in dating_rows),
                "undetermined_count": sum(row["dating_status"] == "undetermined" for row in dating_rows),
                "known_years_are_not_final": True,
            },
            "theme_unit": "含该主题已通过辅助复核的诗作数；一首诗可多主题",
            "imagery_unit": "已通过辅助复核的词面出现次数与包含该意象的诗作数",
            "color_unit": "已通过辅助复核的颜色词出现次数与包含该颜色的诗作数",
            "technique_unit": "已通过辅助复核的手法标注次数与包含该手法的诗作数",
        },
        "theme_distribution": [
            {"theme": name, "poem_count": len(theme_poems[name]), "annotation_count": theme_annotations[name]}
            for name in sorted(theme_poems)
        ],
        "imagery_distribution": [
            {
                "imagery": name,
                "category": next(row["category"] for row in imagery.values() if row["canonical_name"] == name),
                "poem_count": len(imagery_poems[name]),
                "occurrence_count": imagery_occurrences[name],
            }
            for name in sorted(imagery_occurrences, key=lambda value: (-imagery_occurrences[value], value))
        ],
        "color_distribution": [
            {"color": name, "poem_count": len(color_poems[name]), "occurrence_count": color_occurrences[name]}
            for name in sorted(color_occurrences, key=lambda value: (-color_occurrences[value], value))
        ],
        "technique_distribution": [
            {"technique": name, "poem_count": len(technique_poems[name]), "annotation_count": technique_annotations[name]}
            for name in sorted(technique_annotations, key=lambda value: (-technique_annotations[value], value))
        ],
        "imagery_cooccurrence": [
            {"source": left, "target": right, "poem_count": count}
            for (left, right), count in sorted(cooccurrence.items(), key=lambda item: (-item[1], item[0]))
        ],
        "poet_theme": [
            {"poet": poet, "theme": theme, "poem_count": len(poem_ids_for_theme)}
            for poet in sorted(poet_theme)
            for theme, poem_ids_for_theme in sorted(poet_theme[poet].items())
        ],
        "period_candidate_distribution": dict(Counter(row["period"] for row in poems)),
    }
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(summary, result)
    print(f"wrote {output}")
    print(f"wrote {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

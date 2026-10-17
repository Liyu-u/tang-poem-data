"""Build statistics after the web-evidence resolution pass."""

from __future__ import annotations

import argparse
import csv
import json
import pathlib
from collections import Counter, defaultdict


def read(path: pathlib.Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data = root / "data"
    reports = root / "reports"
    poems_manifest = {row["poem_id"] for row in read(reports / "tang_poem_expansion_manifest_v1.csv")}
    poems = [row for row in read(data / "poems.csv") if row["poem_id"] in poems_manifest]
    poems_by_id = {row["poem_id"]: row for row in poems}
    tags = {row["tag_id"]: row for row in read(data / "tags.csv")}
    imagery = {row["imagery_id"]: row for row in read(data / "imagery.csv")}
    poets = {row["poet_id"]: row["name"] for row in read(data / "poets.csv")}

    poem_tags_all = [row for row in read(data / "poem_tags.csv") if row["poem_id"] in poems_manifest]
    poem_imagery_all = [row for row in read(data / "poem_imagery.csv") if row["poem_id"] in poems_manifest]
    colors_all = [row for row in read(data / "color_occurrences.csv") if row["poem_id"] in poems_manifest]
    techniques_all = [row for row in read(data / "technique_annotations.csv") if row["poem_id"] in poems_manifest]
    evidence = [row for row in read(reports / "tang_poem_evidence_register_v3.csv") if row["poem_id"] in poems_manifest]

    def approved(rows: list[dict[str, str]]) -> list[dict[str, str]]:
        return [row for row in rows if row["review_status"] == "approved"]

    poem_tags = approved(poem_tags_all)
    poem_imagery = approved(poem_imagery_all)
    colors = approved(colors_all)
    techniques = approved(techniques_all)
    theme_poems: dict[str, set[str]] = defaultdict(set)
    theme_annotations = Counter()
    for row in poem_tags:
        name = tags[row["tag_id"]]["tag_name"]
        theme_poems[name].add(row["poem_id"])
        theme_annotations[name] += 1
    imagery_poems: dict[str, set[str]] = defaultdict(set)
    imagery_occurrences = Counter()
    imagery_sets: dict[str, set[str]] = defaultdict(set)
    for row in poem_imagery:
        name = imagery[row["imagery_id"]]["canonical_name"]
        imagery_poems[name].add(row["poem_id"])
        imagery_occurrences[name] += 1
        imagery_sets[row["poem_id"]].add(name)
    color_poems: dict[str, set[str]] = defaultdict(set)
    color_occurrences = Counter()
    for row in colors:
        color_poems[row["normalized_color"]].add(row["poem_id"])
        color_occurrences[row["normalized_color"]] += 1
    technique_poems: dict[str, set[str]] = defaultdict(set)
    technique_annotations = Counter()
    for row in techniques:
        name = tags[row["technique_tag_id"]]["tag_name"]
        technique_poems[name].add(row["poem_id"])
        technique_annotations[name] += 1
    cooccurrence = Counter()
    for names in imagery_sets.values():
        ordered = sorted(names)
        for i, left in enumerate(ordered):
            for right in ordered[i + 1 :]:
                cooccurrence[(left, right)] += 1
    poet_theme: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for row in poem_tags:
        poet = poets[poems_by_id[row["poem_id"]]["poet_id"]]
        theme = tags[row["tag_id"]]["tag_name"]
        poet_theme[poet][theme].add(row["poem_id"])

    dating = [row for row in evidence if row["dimension"] == "dating"]
    result = {
        "metadata": {
            "dataset": "tang-poem-data",
            "version": "new130-web-resolved-v1",
            "sample_scope": "新增130首精选唐诗；不是全部唐诗总体分布",
            "poem_count": len(poems),
            "reviewed_at": "2026-10-17T23:30:00+08:00",
            "reviewer": "Codex网页证据复核（非人工双审）",
            "human_double_review_required": True,
            "annotation_scope": "仅纳入 review_status=approved 的主题、意象、颜色和表现手法行",
            "decision_counts": {
                "poem_tags": dict(Counter(row["review_status"] for row in poem_tags_all)),
                "poem_imagery": dict(Counter(row["review_status"] for row in poem_imagery_all)),
                "color_occurrences": dict(Counter(row["review_status"] for row in colors_all)),
                "technique_annotations": dict(Counter(row["review_status"] for row in techniques_all)),
                "dating_decision": dict(Counter(row["review_status"] for row in dating)),
            },
            "dating": {
                "approved_count": sum(row["review_status"] == "approved" for row in dating),
                "provisional_count": sum(row["dating_status"] == "provisional" for row in dating),
                "undetermined_count": sum(row["dating_status"] == "undetermined" for row in dating),
                "known_years_are_not_final": True,
            },
            "theme_unit": "含该主题且已通过网页证据复核的诗作数；一首诗可多主题",
            "imagery_unit": "已通过网页证据复核的词面出现次数与包含该意象的诗作数",
            "color_unit": "已通过网页证据复核的颜色词出现次数与包含该颜色的诗作数；usage_type另行区分literal/figurative",
            "technique_unit": "已通过网页证据复核的手法标注次数与包含该手法的诗作数",
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
            {"poet": poet, "theme": theme, "poem_count": len(poem_ids)}
            for poet in sorted(poet_theme)
            for theme, poem_ids in sorted(poet_theme[poet].items())
        ],
        "period_candidate_distribution": dict(Counter(row["period"] for row in poems)),
    }
    output = reports / "tang_poem_stats_new130_web_v1.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = reports / "tang_poem_new130_web_summary_v1.md"
    counts = result["metadata"]["decision_counts"]
    lines = [
        "# 新增130首网页证据统计摘要 v1",
        "",
        "- 仅将网页证据复核后 `approved` 的主题、意象、颜色和表现手法纳入统计。",
        "- `rejected` 记录保留在原始表中，但不进入确认统计。",
        "- 年份的 `provisional` 只表示有网页候选范围，不等同编年本终审；`undetermined` 保留空值。",
        "",
        "| 数据对象 | approved | rejected | needs_revision |",
        "| --- | ---: | ---: | ---: |",
    ]
    for table in ("poem_tags", "poem_imagery", "color_occurrences", "technique_annotations", "dating_decision"):
        c = counts[table]
        lines.append(f"| `{table}` | {c.get('approved', 0)} | {c.get('rejected', 0)} | {c.get('needs_revision', 0)} |")
    lines += [
        "",
        "- 本报告是新增130首样本的网页证据复核结果，不外推全部唐诗，也不替代两位真人专家终审。",
    ]
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote={output}")
    print(f"wrote={summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

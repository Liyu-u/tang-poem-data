"""Build pilot statistics using only internally approved annotation rows."""

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


REVIEWER = "Codex辅助复核（非人工双审）"


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def approved(rows):
    return [row for row in rows if row["review_status"] == "approved"]


def main():
    parser = argparse.ArgumentParser(description="Build reviewed-scope exploratory statistics for the pilot.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, help="versioned JSON output path; defaults to the v1 report")
    parser.add_argument("--version", default="pilot-v1-reviewed-scope", help="version recorded in the report metadata")
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    output = (args.output or (reports_dir / "tang_poem_stats_reviewed_v1.json")).resolve()
    if output.exists():
        raise RuntimeError(f"refusing to overwrite existing statistics report: {output}")

    poems = read_csv(data_dir / "poems.csv")
    poets = {row["poet_id"]: row for row in read_csv(data_dir / "poets.csv")}
    tags = {row["tag_id"]: row for row in read_csv(data_dir / "tags.csv")}
    imagery = {row["imagery_id"]: row for row in read_csv(data_dir / "imagery.csv")}
    all_poem_tags = read_csv(data_dir / "poem_tags.csv")
    all_poem_imagery = read_csv(data_dir / "poem_imagery.csv")
    all_colors = read_csv(data_dir / "color_occurrences.csv")
    poem_tags = approved(all_poem_tags)
    poem_imagery = approved(all_poem_imagery)
    colors = approved(all_colors)
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
        color = row["normalized_color"]
        color_poems[color].add(row["poem_id"])
        color_occurrences[color] += 1

    poem_imagery_sets = defaultdict(set)
    for row in poem_imagery:
        poem_imagery_sets[row["poem_id"]].add(imagery[row["imagery_id"]]["canonical_name"])
    cooccurrence = Counter()
    for names in poem_imagery_sets.values():
        ordered = sorted(names)
        for index, left in enumerate(ordered):
            for right in ordered[index + 1:]:
                cooccurrence[(left, right)] += 1

    poet_theme = defaultdict(lambda: defaultdict(set))
    for row in poem_tags:
        poem = poem_by_id[row["poem_id"]]
        poet_name = poets[poem["poet_id"]]["name"]
        theme_name = tags[row["tag_id"]]["tag_name"]
        poet_theme[poet_name][theme_name].add(row["poem_id"])

    result = {
        "metadata": {
            "dataset": "tang-poem-data",
            "version": args.version,
            "sample_scope": "首批20首精选唐诗；不是全部唐诗总体分布",
            "poem_count": len(poems),
            "poet_count": len(poets),
            "annotation_scope": "仅纳入 review_status=approved 的候选行",
            "reviewer": REVIEWER,
            "human_double_review_required": True,
            "excluded_annotation_counts": {
                "poem_tags_needs_revision": sum(row["review_status"] == "needs_revision" for row in all_poem_tags),
                "poem_imagery_needs_revision": sum(row["review_status"] == "needs_revision" for row in all_poem_imagery),
                "poem_imagery_rejected": sum(row["review_status"] == "rejected" for row in all_poem_imagery),
                "color_needs_revision": sum(row["review_status"] == "needs_revision" for row in all_colors),
                "color_rejected": sum(row["review_status"] == "rejected" for row in all_colors),
            },
            "theme_unit": "含该主题已通过候选的诗作数；一首诗可多主题",
            "imagery_unit": "已通过词面候选出现次数与包含该意象候选的诗作数",
            "color_unit": "已通过颜色词候选出现次数与包含该颜色候选的诗作数",
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
        "imagery_cooccurrence": [
            {"source": left, "target": right, "poem_count": count}
            for (left, right), count in sorted(cooccurrence.items(), key=lambda item: (-item[1], item[0]))
        ],
        "poet_theme": [
            {"poet": poet, "theme": theme, "poem_count": len(poem_ids)}
            for poet in sorted(poet_theme)
            for theme, poem_ids in sorted(poet_theme[poet].items())
        ],
    }
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {output}")


if __name__ == "__main__":
    main()

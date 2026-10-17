"""Clarify that year decisions do not change poems.review_status."""

from __future__ import annotations

import argparse
import json
import pathlib


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    json_path = root / "reports" / "tang_poem_stats_new130_reviewed_v1.json"
    markdown_path = root / "reports" / "tang_poem_new130_review_summary_v1.md"
    result = json.loads(json_path.read_text(encoding="utf-8"))
    counts = result["metadata"]["decision_counts"]
    if "poems" in counts:
        counts["dating_decision"] = counts.pop("poems")
    json_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    markdown = markdown_path.read_text(encoding="utf-8")
    markdown = markdown.replace("| `poems` |", "| `dating_decision` |")
    markdown_path.write_text(markdown, encoding="utf-8")
    print(f"updated={json_path}")
    print(f"updated={markdown_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

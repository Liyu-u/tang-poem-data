"""Use the four-period grouping as the only poem dating field.

The project does not need a precise year for every poem.  This migration keeps
the historical values in an audit report, clears ``year_start``/``year_end``
from the serving table, and makes ``period`` the explicit analysis grouping.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        return
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def apply(root: Path) -> None:
    data_path = root / "data" / "poems.csv"
    poems = read_csv(data_path)
    audit: list[dict[str, str]] = []
    for poem in poems:
        previous_start = poem["year_start"]
        previous_end = poem["year_end"]
        poem["year_start"] = ""
        poem["year_end"] = ""
        poem["dating_basis"] = (
            f"项目统一四期口径；当前按{poem['period']}作为文学时间分组；"
            "不主张作品专属精确年份，year_start/year_end 按 period_only_policy_v1 留空。"
        )
        note = poem.get("notes", "")
        marker = "period_only_policy_v1=true"
        if marker not in note:
            poem["notes"] = f"{note}; {marker}; precise_years_not_used=true".strip("; ")
        audit.append(
            {
                "poem_id": poem["poem_id"],
                "title": poem["title"],
                "period": poem["period"],
                "previous_year_start": previous_start,
                "previous_year_end": previous_end,
                "year_start": "",
                "year_end": "",
                "reason": "项目改用初唐/盛唐/中唐/晚唐分组；不把作者生卒年或推定年份当作作品创作年。",
            }
        )
    write_csv(data_path, poems)
    write_csv(root / "reports" / "tang_poem_period_only_rewrite_v1.csv", audit)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    apply(args.root.resolve())
    print(f"rewrote {len(read_csv(args.root.resolve() / 'data' / 'poems.csv'))} poems with period-only dating")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

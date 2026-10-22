"""Normalize new130 color usage labels to the project schema enum."""

from __future__ import annotations

import argparse
import csv
import pathlib


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    path = args.root.resolve() / "data" / "color_occurrences.csv"
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = list(reader.fieldnames or [])
        rows = list(reader)
    mapping = {
        "color_candidate": "literal",
        "proper_name_or_place": "ambiguous",
        "ambiguous": "ambiguous",
    }
    changed = 0
    for row in rows:
        value = row.get("usage_type", "")
        if value in mapping:
            row["usage_type"] = mapping[value]
            changed += 1
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)
    print(f"normalized={changed} path={path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

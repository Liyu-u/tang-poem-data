"""Make the resolved 春思 attribution explicit while retaining the variant note."""

from __future__ import annotations

import argparse
import csv
import pathlib


NOW = "2026-10-17T23:30:00+08:00"
POEM_ID = "poem_998f597c-4be4-56b6-a645-7b5022e46fed"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    path = args.root.resolve() / "data" / "poems.csv"
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = list(reader.fieldnames or [])
        rows = list(reader)
    for row in rows:
        if row["poem_id"] != POEM_ID:
            continue
        row["variant_notes"] = (
            "《全唐诗》卷151题作《赋得》列刘长卿并注一作皇甫冉；卷250列皇甫冉《春思》并注一作刘长卿诗。"
            "本项目本轮采用皇甫冉《春思》作为展示主记录，异题异归属保留为待核版本。"
        )
        row["updated_at"] = NOW
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)
    print(f"repaired={POEM_ID}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

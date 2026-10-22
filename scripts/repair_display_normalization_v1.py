"""Repair non-idempotent OpenCC display fields in the 150-poem export."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from opencc import OpenCC


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def simplify(converter: OpenCC, value: str) -> str:
    for _ in range(3):
        normalized = converter.convert(value)
        if normalized == value:
            return value
        value = normalized
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    converter = OpenCC("t2s")
    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    audit_path = root / "reports" / "tang_poem_expansion_text_audit_v1.csv"
    audit = read_csv(audit_path)
    audit_by_poem = {row["poem_id"]: row for row in audit}
    changed = 0
    for poem in poems:
        if poem["created_by"] != "corpus_expansion_v1":
            continue
        normalized_title = simplify(converter, poem["title"])
        if normalized_title != poem["title"]:
            poem["title"] = normalized_title
            audit_by_poem[poem["poem_id"]]["title_after"] = normalized_title
            changed += 1
    write_csv(data_dir / "poems.csv", poems)
    write_csv(audit_path, list(audit_by_poem.values()))
    print(f"repaired_titles={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

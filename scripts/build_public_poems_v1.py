"""Build the minimal public poem-text export.

The internal ``poems.csv`` keeps provenance, review, dating, and migration
fields.  This export is intended for public display and contains only the
stable poem identifier, title, author, and selected display text.  Source and
license information remains in ``public_sources.csv`` and
``public_poem_sources.csv``.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


PUBLIC_FIELDS = ["poem_id", "title", "author", "full_text"]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def build(root: Path) -> int:
    data = root / "data"
    poems = read_csv(data / "poems.csv")
    poets = {row["poet_id"]: row["name"] for row in read_csv(data / "poets.csv")}

    rows: list[dict[str, str]] = []
    for poem in poems:
        author = poets.get(poem["poet_id"], "")
        if not author:
            raise ValueError(f"missing author for poem_id={poem['poem_id']}")
        if not poem["title"] or not poem["full_text"]:
            raise ValueError(f"missing title or full_text for poem_id={poem['poem_id']}")
        rows.append(
            {
                "poem_id": poem["poem_id"],
                "title": poem["title"],
                "author": author,
                "full_text": poem["full_text"],
            }
        )

    output = data / "public_poems.csv"
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=PUBLIC_FIELDS, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)

    print(f"public_poems={len(rows)}; fields={','.join(PUBLIC_FIELDS)}")
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

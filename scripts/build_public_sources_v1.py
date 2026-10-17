"""Build the small source list intended for public UI display.

The full ``sources.csv`` remains an internal provenance table because other
tables use its IDs as foreign keys.  This export contains only sources directly
used by poem records and intentionally omits review, audit, and internal-rule
records.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


UPSTREAM_REPOSITORY = "https://github.com/chinese-poetry/chinese-poetry"
UPSTREAM_COMMIT = "b8594f81a89752241442f2ce267d6f66f96704ee"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        fields = list(rows[0]) if rows else ["source_id", "title", "source_type", "url", "attribution", "description"]
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def attribution(title: str, source_type: str) -> str:
    if "Chinese Poetry" in title:
        return "Chinese Poetry contributors"
    if "维基文库" in title:
        return "维基文库"
    if "人民教育出版社" in title:
        return "人民教育出版社"
    if "国家中小学智慧教育平台" in title:
        return "国家中小学智慧教育平台"
    if "人民网" in title:
        return "人民网"
    if source_type == "database":
        return "相关古籍数据库/整理者"
    return title.split("公开", 1)[0].strip() or "来源页面"


def license_fields(source: dict[str, str]) -> tuple[str, str]:
    if "Chinese Poetry" in source["title"] or "chinese-poetry" in source["url"]:
        return "MIT", f"{UPSTREAM_REPOSITORY}/blob/{UPSTREAM_COMMIT}/LICENSE"
    if "维基文库" in source["title"] or "wikisource.org" in source["url"]:
        return "按具体页面许可核对（常见为 CC BY-SA）", "https://zh.wikisource.org/wiki/Wikisource:%E7%89%88%E6%9D%83"
    return "未确认可再发布许可", ""


def public_source_url(source: dict[str, str]) -> str:
    if "Chinese Poetry" in source["title"] or "chinese-poetry" in source["url"]:
        return f"{UPSTREAM_REPOSITORY}/tree/{UPSTREAM_COMMIT}"
    return source["url"]


def build(root: Path) -> None:
    data = root / "data"
    poems = read_csv(data / "poems.csv")
    poets = {row["poet_id"]: row["name"] for row in read_csv(data / "poets.csv")}
    sources = read_csv(data / "sources.csv")
    used_ids = {row["source_id"] for row in poems}
    source_by_id = {row["source_id"]: row for row in sources}
    rows: list[dict[str, str]] = []
    for source_id in sorted(used_ids):
        source = source_by_id[source_id]
        license_name, license_url = license_fields(source)
        rows.append(
            {
                "source_id": source_id,
                "title": source["title"],
                "source_type": source["source_type"],
                "url": public_source_url(source),
                "license": license_name,
                "license_url": license_url,
                "attribution": attribution(source["title"], source["source_type"]),
                "description": "公开主文本来源；仅展示来源、许可和署名信息，不展示内部审核字段。",
            }
        )
    write_csv(data / "public_sources.csv", rows)
    poem_source_rows = []
    for poem in poems:
        source = source_by_id[poem["source_id"]]
        license_name, license_url = license_fields(source)
        poem_source_rows.append(
            {
                "poem_id": poem["poem_id"],
                "title": poem["title"],
                "author": poets.get(poem["poet_id"], ""),
                "source_id": poem["source_id"],
                "source_title": source["title"],
                "source_url": public_source_url(source),
                "source_locator": poem["source_locator"],
                "license": license_name,
                "license_url": license_url,
                "attribution": attribution(source["title"], source["source_type"]),
            }
        )
    write_csv(data / "public_poem_sources.csv", poem_source_rows)
    internal = [source for source in sources if source["source_id"] not in used_ids]
    print(f"public_sources={len(rows)}; public_poem_sources={len(poem_source_rows)}; internal_or_reference_sources_hidden={len(internal)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

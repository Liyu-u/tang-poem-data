"""Promote the local Chinese Poetry snapshot to the public primary source.

The selected display text is kept in place so existing line and annotation
coordinates remain valid.  The script changes poem and line provenance to the
Chinese Poetry record, writes a record-level audit report, and records whether
the selected display text matches the simplified snapshot after whitespace
normalization.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

from opencc import OpenCC


PRIMARY_SOURCE_ID = "src_b56de4c0-21dc-59b6-93f9-2a291b42a02b"
REPOSITORY_URL = "https://github.com/chinese-poetry/chinese-poetry"
LICENSE_URL = f"{REPOSITORY_URL}/blob/master/LICENSE"
cc = OpenCC("t2s")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], fields: list[str] | None = None) -> None:
    if fields is None:
        fields = list(rows[0]) if rows else []
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def normalize_text(value: str) -> str:
    value = cc.convert(value or "")
    return re.sub(r"\s+", "", value.replace("\r\n", "\n").replace("\r", "\n"))


def extract_record_id(locator: str) -> str:
    match = re.search(r"\bid=([^;\s]+)", locator or "")
    return match.group(1) if match else ""


def snapshot_paths(snapshot_root: Path, legacy_root: Path) -> list[Path]:
    paths = sorted(snapshot_root.glob("poet.tang.*.json"))
    if (snapshot_root / "唐诗三百首.json").exists():
        paths.append(snapshot_root / "唐诗三百首.json")
    if (legacy_root / "tang300.json").exists():
        paths.append(legacy_root / "tang300.json")
    return paths


def load_records(snapshot_root: Path, legacy_root: Path) -> tuple[dict[str, list[tuple[Path, int, dict]]], dict[tuple[str, str], list[tuple[Path, int, dict]]]]:
    by_id: dict[str, list[tuple[Path, int, dict]]] = {}
    by_title_author: dict[tuple[str, str], list[tuple[Path, int, dict]]] = {}
    paths = snapshot_paths(snapshot_root, legacy_root)
    if not paths:
        raise FileNotFoundError(f"未找到 Chinese Poetry 快照：{snapshot_root}")
    for path in paths:
        with path.open("r", encoding="utf-8") as handle:
            records = json.load(handle)
        for index, record in enumerate(records):
            item = (path, index, record)
            by_id.setdefault(record.get("id", ""), []).append(item)
            key = (normalize_text(record.get("title", "")), normalize_text(record.get("author", "")))
            by_title_author.setdefault(key, []).append(item)
    return by_id, by_title_author


def choose_record(poem: dict[str, str], author: str, by_id, by_title_author):
    candidates = by_id.get(extract_record_id(poem.get("source_locator", "")), [])
    if not candidates:
        key = (normalize_text(poem["title"]), normalize_text(author))
        candidates = by_title_author.get(key, [])
    if not candidates:
        raise ValueError(f"无法定位 Chinese Poetry 记录：{poem['poem_id']} {poem['title']}")
    current = normalize_text(poem["full_text"])
    # Prefer a full Tang poem file over duplicate 唐诗三百首 copies.
    candidates = sorted(candidates, key=lambda item: ("poet.tang." not in item[0].name, item[0].name, item[1]))
    scored = []
    for item in candidates:
        local = normalize_text("\n".join(item[2].get("paragraphs") or []))
        scored.append((SequenceMatcher(None, current, local).ratio(), item))
    best_score = max(score for score, _ in scored)
    best = [item for score, item in scored if score == best_score]
    return best[0], best_score


def canonical_locator(path: Path, index: int, record: dict) -> str:
    return f"snapshot=chinese-poetry-upstream/全唐诗/{path.name}; record_index={index}; id={record['id']}"


def update_variant_notes(existing: str, status: str, locator: str) -> str:
    hidden_history = (
        "legacy_work_id=",
        "legacy_author_id=",
        "legacy_primary_source_id=",
        "legacy_crosscheck_source_id=",
        "canonical_source_url=",
        "original_text_retained_in=",
        "record_index=",
        "id=",
        "text_review_status=",
        "canonical_review_status=",
        "primary_source=",
        "source_license=",
        "source_match_status=",
        "primary_source_locator=",
    )
    parts = [part for part in (existing or "").split("; ") if not part.startswith(hidden_history)]
    parts.extend(
        [
            "primary_source=Chinese Poetry 本地快照",
            "source_license=MIT（保留仓库归属与LICENSE）",
            f"source_match_status={status}",
            f"primary_source_locator={locator}",
        ]
    )
    return "; ".join(parts)


def updated_timestamp(created_at: str, now: str) -> str:
    """Keep updated_at at or after created_at for late-added records."""
    try:
        return max(datetime.fromisoformat(created_at), datetime.fromisoformat(now)).isoformat(timespec="seconds")
    except ValueError:
        return now


def build(root: Path, snapshot_root: Path, legacy_root: Path) -> None:
    data = root / "data"
    reports = root / "reports"
    poems = read_csv(data / "poems.csv")
    poets = {row["poet_id"]: row["name"] for row in read_csv(data / "poets.csv")}
    lines = read_csv(data / "poem_lines.csv")
    by_id, by_title_author = load_records(snapshot_root, legacy_root)
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    mapping_rows = []
    selected = {}
    for poem in poems:
        record_item, score = choose_record(poem, poets[poem["poet_id"]], by_id, by_title_author)
        path, index, record = record_item
        locator = canonical_locator(path, index, record)
        local_text = normalize_text("\n".join(record.get("paragraphs") or []))
        current_text = normalize_text(poem["full_text"])
        status = "same_after_simplified_whitespace_normalization" if local_text == current_text else "selected_display_variant_retained"
        poem["source_id"] = PRIMARY_SOURCE_ID
        poem["source_locator"] = locator
        poem["variant_notes"] = update_variant_notes(poem.get("variant_notes", ""), status, locator)
        poem["updated_at"] = updated_timestamp(poem.get("created_at", ""), now)
        selected[poem["poem_id"]] = locator
        mapping_rows.append(
            {
                "poem_id": poem["poem_id"],
                "title": poem["title"],
                "author": poets[poem["poet_id"]],
                "source_id": PRIMARY_SOURCE_ID,
                "source_locator": locator,
                "snapshot_file": f"全唐诗/{path.name}",
                "record_index": str(index),
                "record_id": record["id"],
                "text_match_status": status,
                "match_score": f"{score:.6f}",
                "license": "MIT",
                "license_url": LICENSE_URL,
                "attribution": "Chinese Poetry contributors; repository copyright JackeyGao",
                "notes": "当前 full_text 保留项目已选定的简体展示版本；未复制现代注释、译文或网页排版。",
            }
        )
    for line in lines:
        line["source_id"] = PRIMARY_SOURCE_ID
        poem_locator = selected[line["poem_id"]]
        line["source_locator"] = f"{poem_locator}; line_no={line['line_no']}"
        line["updated_at"] = updated_timestamp(line.get("created_at", ""), now)
    poem_fields = list(poems[0])
    line_fields = list(lines[0])
    write_csv(data / "poems.csv", poems, poem_fields)
    write_csv(data / "poem_lines.csv", lines, line_fields)
    report_fields = list(mapping_rows[0])
    write_csv(reports / "tang_poem_chinese_poetry_primary_v1.csv", mapping_rows, report_fields)
    same = sum(row["text_match_status"] == "same_after_simplified_whitespace_normalization" for row in mapping_rows)
    variant = len(mapping_rows) - same
    (reports / "tang_poem_chinese_poetry_primary_summary_v1.md").write_text(
        "\n".join(
            [
                "# Chinese Poetry 主来源迁移摘要",
                "",
                f"- 诗歌数量：{len(mapping_rows)}",
                f"- 统一主来源：Chinese Poetry 本地快照（{PRIMARY_SOURCE_ID}）",
                f"- 简繁与空白规范化后文本一致：{same}",
                f"- 保留项目选定展示异文：{variant}",
                "- 所有诗歌仍只保留一个 `full_text`；异文不进入第二份正文，而写入 `variant_notes` 和本报告。",
                "- 公开许可：随发布包保留 Chinese Poetry MIT License 与归属；不复制现代注释、译文、图片或网页排版。",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"poems={len(poems)}; source_id={PRIMARY_SOURCE_ID}; text_same={same}; display_variants_retained={variant}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--snapshot-root",
        type=Path,
        default=None,
        help="Chinese Poetry 全唐诗目录；默认查找项目同级 database/data/chinese-poetry-upstream/全唐诗",
    )
    args = parser.parse_args()
    root = args.root.resolve()
    base = root.parent / "database" / "data"
    snapshot_root = (args.snapshot_root or (base / "chinese-poetry-upstream" / "全唐诗")).resolve()
    build(root, snapshot_root, base)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

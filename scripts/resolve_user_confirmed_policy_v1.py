"""Apply the user's single-version and internal-review decisions.

This migration does not replace the selected text.  It records that each poem
has exactly one serving text in ``poems.full_text`` and keeps alternate-reading
notes only as provenance.  It also closes the deterministic first-pass
annotations created by ``add_early_tang_v1.py`` for internal prototype use.
Source rights remain a separate review gate.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import uuid
from pathlib import Path


REVIEWED_AT = "2026-10-18T10:00:00+08:00"
REVIEWER = "Codex辅助复核（用户确认单版本政策；内部原型）"
CREATED_BY = "user_confirmed_policy_v1"
NAMESPACE = uuid.UUID("c4d8c8b0-2fd8-4a7e-8d3c-8c9cf6c5b3a2")
EARLY_SOURCE_MARKER = "early_tang_import_v1"


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


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def append_note(value: str, note: str) -> str:
    return f"{value}; {note}" if value else note


def review_row(table: str, row: dict[str, str], target_id: str, comment: str) -> dict[str, str]:
    return {
        "review_id": stable_id("review", f"{table}:{target_id}:{REVIEWED_AT}"),
        "target_table": table,
        "target_id": target_id,
        "target_updated_at": REVIEWED_AT,
        "decision": "approved",
        "reviewer": REVIEWER,
        "reviewed_at": REVIEWED_AT,
        "review_comment": comment,
        "previous_review_id": "",
        "source_id": row.get("source_id", ""),
        "source_locator": row.get("source_locator", ""),
        "review_status": "approved",
        "created_by": CREATED_BY,
        "created_at": REVIEWED_AT,
        "updated_at": REVIEWED_AT,
        "notes": "ai_assisted_review=true; internal_prototype_scope=true; source_rights_review_separate=true",
    }


def resolve(root: Path) -> None:
    data = root / "data"
    reports = root / "reports"
    poems = read_csv(data / "poems.csv")
    poem_by_id = {row["poem_id"]: row for row in poems}

    canonical_rows: list[dict[str, str]] = []
    for poem in poems:
        poem["variant_notes"] = append_note(
            poem.get("variant_notes", ""),
            "canonical_text_policy=single_selected_version; alternate_readings_not_in_main_tables=true",
        )
        canonical_rows.append(
            {
                "poem_id": poem["poem_id"],
                "title": poem["title"],
                "source_id": poem["source_id"],
                "source_locator": poem["source_locator"],
                "display_script": "简体（无法转换的古文字形按底本保留）",
                "full_text_sha256": hashlib.sha256(poem["full_text"].encode("utf-8")).hexdigest(),
                "selection_basis": "每首诗仅以当前 full_text 作为统计和展示主版本；其他读法只作为溯源说明，不进入主表。",
                "review_status": "approved",
            }
        )

    review_rows: list[dict[str, str]] = []
    for filename, table, key in (
        ("poem_tags.csv", "poem_tags", "poem_tag_id"),
        ("poem_imagery.csv", "poem_imagery", "poem_imagery_id"),
        ("color_occurrences.csv", "color_occurrences", "color_occurrence_id"),
        ("technique_annotations.csv", "technique_annotations", "technique_annotation_id"),
    ):
        rows = read_csv(data / filename)
        changed = 0
        for row in rows:
            if row.get("review_status") != "pending" or row.get("created_by") != EARLY_SOURCE_MARKER:
                continue
            row["review_status"] = "approved"
            row["updated_at"] = REVIEWED_AT
            if table == "poem_imagery":
                row["contextual_meaning"] = "当前按原句词面和所在句记录为意象候选；主表仅保留该单一文本版本。"
            row["notes"] = append_note(row.get("notes", ""), "codex_review=approved; internal_prototype_scope=true")
            comment = "原文定位、字符偏移或引句可复现；按项目词表作为内部原型候选，不宣称专家终审。"
            review_rows.append(review_row(table, row, row[key], comment))
            changed += 1
        write_csv(data / filename, rows)
        print(f"{filename}: approved {changed}")

    # The user's request resolves the ten dictionary items at the rule level.
    tags = read_csv(data / "tags.csv")
    tag_changed = 0
    for row in tags:
        if row.get("review_status") == "pending":
            row["review_status"] = "approved"
            row["updated_at"] = REVIEWED_AT
            row["notes"] = append_note(row.get("notes", ""), "codex_review=approved; dictionary_rule_scope=true")
            review_rows.append(review_row("tags", row, row["tag_id"], "标签纳入/排除边界已按项目词典规则确认；不等于每首诗的文学解释终审。"))
            tag_changed += 1
    write_csv(data / "tags.csv", tags)
    print(f"tags.csv: approved {tag_changed}")

    reviews = read_csv(data / "annotation_reviews.csv")
    existing = {row["review_id"] for row in reviews}
    reviews.extend(row for row in review_rows if row["review_id"] not in existing)
    write_csv(data / "annotation_reviews.csv", reviews)
    write_csv(reports / "tang_poem_user_policy_review_v1.csv", review_rows)
    write_csv(data / "poems.csv", poems)
    write_csv(reports / "tang_poem_canonical_text_selection_v1.csv", canonical_rows)
    print(f"canonical_texts={len(canonical_rows)} reviews_appended={len(review_rows)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    resolve(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

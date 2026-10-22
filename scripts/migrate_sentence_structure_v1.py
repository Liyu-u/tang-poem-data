"""Migrate the pilot corpus from couplet-like rows to punctuation-delimited sentences.

The old ``poem_lines`` rows were imported from the legacy database's line breaks.
They are retained in the migration report, while the canonical CSV tables receive
one row per sentence ending in Chinese punctuation.  Source text is not changed;
only the display-layer structure and derived annotation coordinates are rebuilt.
"""

import argparse
import csv
import hashlib
import json
import re
import uuid
from pathlib import Path


MIGRATION_AT = "2026-10-16T18:30:00+08:00"
CREATED_BY = "sentence_migration_v1"
NAMESPACE = uuid.UUID("e7b8308a-4e10-4eb0-a890-83a504a8da7b")
SENTENCE_END = re.compile(r"(?<=[，。！？；])")

TABLE_FIELDS = {
    "poem_lines": [
        "line_id", "poem_id", "line_no", "couplet_no", "line_text", "source_id",
        "source_locator", "review_status", "created_by", "created_at", "updated_at",
        "notes",
    ],
    "annotation_reviews": [
        "review_id", "target_table", "target_id", "target_updated_at", "decision",
        "reviewer", "reviewed_at", "review_comment", "previous_review_id", "source_id",
        "source_locator", "review_status", "created_by", "created_at", "updated_at",
        "notes",
    ],
}


def stable_id(prefix, key):
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def append_note(value, note):
    return f"{value}; {note}" if value else note


def split_sentences(text):
    if "\n" in text or "\r" in text:
        raise ValueError("a legacy poem_lines row must not contain a line break")
    pieces = [piece for piece in SENTENCE_END.split(text) if piece]
    if not pieces or "".join(pieces) != text:
        raise ValueError(f"sentence split did not preserve text: {text!r}")
    if any(piece[-1] not in "，。！？；" for piece in pieces):
        raise ValueError(f"sentence has no supported terminal punctuation: {text!r}")
    return pieces


def build_sentence_rows(old_lines):
    new_rows = []
    mapping_rows = []
    segments_by_old_id = {}
    new_by_id = {}
    sentence_no = 0
    for old in old_lines:
        segments = []
        cursor = 0
        for segment_no, text in enumerate(split_sentences(old["line_text"]), start=1):
            sentence_no += 1
            start = cursor
            end = start + len(text)
            cursor = end
            new_id = stable_id("line", f"sentence:{old['line_id']}:{segment_no}")
            row = {
                "line_id": new_id,
                "poem_id": old["poem_id"],
                "line_no": str(sentence_no),
                "couplet_no": str((sentence_no + 1) // 2),
                "line_text": text,
                "source_id": old["source_id"],
                "source_locator": append_note(
                    old["source_locator"],
                    f"legacy_line_id={old['line_id']}; legacy_line_no={old['line_no']}; "
                    f"sentence_no={sentence_no}; sentence_segment={segment_no}",
                ),
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": old["created_at"],
                "updated_at": MIGRATION_AT,
                "notes": append_note(
                    old.get("notes", ""),
                    "由旧对句记录按，。！？；切分为单句；旧句坐标已迁移；待人工逐句核对",
                ),
            }
            new_rows.append(row)
            new_by_id[new_id] = row
            segment = {
                "old_line_id": old["line_id"],
                "old_line_no": int(old["line_no"]),
                "segment_no": segment_no,
                "old_start": start,
                "old_end": end,
                "new_line_id": new_id,
                "new_line_no": sentence_no,
                "new_text": text,
            }
            segments.append(segment)
            mapping_rows.append({
                "old_line_id": old["line_id"],
                "poem_id": old["poem_id"],
                "old_line_no": old["line_no"],
                "old_couplet_no": old["couplet_no"],
                "old_line_text": old["line_text"],
                "segment_no": str(segment_no),
                "new_line_id": new_id,
                "new_line_no": str(sentence_no),
                "new_couplet_no": str((sentence_no + 1) // 2),
                "new_line_text": text,
                "old_start_offset": str(start),
                "old_end_offset": str(end),
                "source_id": old["source_id"],
                "notes": "一条旧对句可映射到多条新单句；原始来源未改写",
            })
        segments_by_old_id[old["line_id"]] = segments
    return new_rows, mapping_rows, segments_by_old_id, new_by_id


def segment_for_start(segments, offset):
    for segment in segments:
        if segment["old_start"] <= offset < segment["old_end"]:
            return segment
    raise ValueError(f"start offset outside old line: {offset}")


def segment_for_end(segments, offset):
    for index, segment in enumerate(segments):
        if segment["old_start"] < offset <= segment["old_end"]:
            return segment
        if offset == segment["old_start"]:
            if index == 0:
                return segment
            return segments[index - 1]
    raise ValueError(f"end offset outside old line: {offset}")


def migrated_range(row, segments_by_old_id, new_by_id, old_by_id, lines_by_poem):
    if row["scope"] == "poem":
        return row
    old_start = old_by_id[row["start_line_id"]]
    old_end = old_by_id[row["end_line_id"]]
    start_offset = int(row["start_offset"] or 0)
    end_offset = int(row["end_offset"] or len(old_end["line_text"]))
    start_segment = segment_for_start(segments_by_old_id[old_start["line_id"]], start_offset)
    end_segment = segment_for_end(segments_by_old_id[old_end["line_id"]], end_offset)
    start_new = new_by_id[start_segment["new_line_id"]]
    end_new = new_by_id[end_segment["new_line_id"]]
    new_start_offset = start_offset - start_segment["old_start"]
    new_end_offset = end_offset - end_segment["old_start"]
    poem_lines = sorted(lines_by_poem[row["poem_id"]], key=lambda item: int(item["line_no"]))
    start_no = int(start_new["line_no"])
    end_no = int(end_new["line_no"])
    selected = [item for item in poem_lines if start_no <= int(item["line_no"]) <= end_no]
    if start_new["line_id"] == end_new["line_id"]:
        quote = start_new["line_text"][new_start_offset:new_end_offset]
    else:
        quote = "\n".join(
            [selected[0]["line_text"][new_start_offset:]]
            + [item["line_text"] for item in selected[1:-1]]
            + [selected[-1]["line_text"][:new_end_offset]]
        )
    row["scope"] = "span"
    row["start_line_id"] = start_new["line_id"]
    row["end_line_id"] = end_new["line_id"]
    row["start_offset"] = str(new_start_offset)
    row["end_offset"] = str(new_end_offset)
    row["quote"] = quote
    row["source_locator"] = append_note(
        row["source_locator"],
        f"sentence_structure_migration_v1; legacy_start_line_id={old_start['line_id']}; "
        f"legacy_end_line_id={old_end['line_id']}; new_start_line_no={start_new['line_no']}; "
        f"new_end_line_no={end_new['line_no']}",
    )
    row["updated_at"] = MIGRATION_AT
    row["review_status"] = "needs_revision"
    row["notes"] = append_note(
        row.get("notes", ""),
        "句结构迁移后已重算行号、偏移与引文；旧审核失效；需人工重新复核",
    )
    return row


def update_normalization_report(reports_dir, poems):
    source = reports_dir / "tang_poem_text_normalization_v1.csv"
    target = reports_dir / "tang_poem_text_normalization_v2.csv"
    if not source.exists():
        raise FileNotFoundError(source)
    old_rows = read_csv(source)
    by_id = {row["poem_id"]: row for row in old_rows}
    rows = []
    for poem in poems:
        old = by_id[poem["poem_id"]]
        row = dict(old)
        normalized = poem["full_text"]
        original = row["original_text"]
        row["normalized_sha256"] = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        row["changed_char_count"] = str(
            sum(a != b for a, b in zip(original, normalized))
            + abs(len(original) - len(normalized))
        )
        row["line_count_after"] = str(normalized.count("\n") + 1)
        row["normalizer"] = f"{old['normalizer']}+sentence_split_punctuation_v1"
        row["status"] = "display_only_sentence_structure_pending_review"
        row["normalized_text"] = normalized
        rows.append(row)
    write_csv(target, list(rows[0]), rows)
    return target


def update_candidate_report(reports_dir, migrated_targets, new_by_id):
    source = reports_dir / "tang_poem_annotation_candidates_v1.csv"
    target = reports_dir / "tang_poem_annotation_candidates_v2.csv"
    if not source.exists():
        raise FileNotFoundError(source)
    old_rows = read_csv(source)
    by_id = {row["poem_imagery_id"]: row for row in migrated_targets["poem_imagery"]}
    by_id.update({row["color_occurrence_id"]: row for row in migrated_targets["color_occurrences"]})
    rows = []
    for row in old_rows:
        updated = dict(row)
        target_row = by_id.get(row["candidate_id"])
        if target_row:
            updated["line_no"] = ""
            if target_row["start_line_id"]:
                updated["line_no"] = new_by_id[target_row["start_line_id"]]["line_no"]
            updated["start_offset"] = target_row["start_offset"]
            updated["end_offset"] = target_row["end_offset"]
            updated["quote"] = target_row["quote"]
            updated["status"] = "needs_revision_after_sentence_migration"
            updated["source_locator"] = target_row["source_locator"]
            updated["notes"] = append_note(
                updated.get("notes", ""),
                "由 sentence_structure_migration_v1 重算坐标；旧审核失效",
            )
        rows.append(updated)
    write_csv(target, list(rows[0]), rows)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"

    poems = read_csv(data_dir / "poems.csv")
    old_lines = read_csv(data_dir / "poem_lines.csv")
    if len({row["line_id"] for row in old_lines}) != len(old_lines):
        raise ValueError("duplicate old line_id")
    if any("sentence_structure_migration_v1" in row.get("notes", "") for row in old_lines):
        raise RuntimeError("sentence migration already applied to poem_lines.csv")
    old_by_id = {row["line_id"]: row for row in old_lines}
    lines_by_poem = {}
    for row in old_lines:
        lines_by_poem.setdefault(row["poem_id"], []).append(row)

    new_lines_by_poem = {}
    all_new_lines = []
    all_mapping = []
    segments_by_old_id = {}
    new_by_id = {}
    for poem in poems:
        old_rows = sorted(lines_by_poem[poem["poem_id"]], key=lambda row: int(row["line_no"]))
        new_rows, mappings, segments, new_index = build_sentence_rows(old_rows)
        new_lines_by_poem[poem["poem_id"]] = new_rows
        all_new_lines.extend(new_rows)
        all_mapping.extend(mappings)
        segments_by_old_id.update(segments)
        new_by_id.update(new_index)
        expected_text = "\n".join(row["line_text"] for row in new_rows)
        if poem["full_text"] != "\n".join(row["line_text"] for row in old_rows):
            raise ValueError(f"poem full_text does not match old lines: {poem['poem_id']}")
        poem["full_text"] = expected_text
        poem["updated_at"] = MIGRATION_AT
        poem["variant_notes"] = append_note(poem["variant_notes"], "sentence_structure=punctuation_split_v1")
        poem["notes"] = append_note(
            poem.get("notes", ""),
            "展示文本按，。！？；切分为单句；旧对句结构保留在 sentence migration report",
        )

    migrated_targets = {}
    for table, filename, primary_key in [
        ("poem_imagery", "poem_imagery.csv", "poem_imagery_id"),
        ("color_occurrences", "color_occurrences.csv", "color_occurrence_id"),
    ]:
        rows = read_csv(data_dir / filename)
        for row in rows:
            migrated_range(row, segments_by_old_id, new_by_id, old_by_id, new_lines_by_poem)
        migrated_targets[table] = rows

    reviews = read_csv(data_dir / "annotation_reviews.csv")
    latest_review = {}
    for review in reviews:
        key = (review["target_table"], review["target_id"])
        if key not in latest_review or review["reviewed_at"] > latest_review[key]["reviewed_at"]:
            latest_review[key] = review
    migration_reviews = []
    for table, rows in migrated_targets.items():
        primary_key = "poem_imagery_id" if table == "poem_imagery" else "color_occurrence_id"
        for row in rows:
            target_id = row[primary_key]
            previous = latest_review.get((table, target_id))
            migration_reviews.append({
                "review_id": stable_id("review", f"sentence-migration:{table}:{target_id}:{MIGRATION_AT}"),
                "target_table": table,
                "target_id": target_id,
                "target_updated_at": MIGRATION_AT,
                "decision": "needs_revision",
                "reviewer": "sentence_migration_v1",
                "reviewed_at": MIGRATION_AT,
                "review_comment": "句结构迁移后坐标、偏移和引文已重算；旧审核不再适用于当前版本，需人工重新复核。",
                "previous_review_id": previous["review_id"] if previous else "",
                "source_id": row["source_id"],
                "source_locator": row["source_locator"],
                "review_status": "needs_revision",
                "created_by": CREATED_BY,
                "created_at": MIGRATION_AT,
                "updated_at": MIGRATION_AT,
                "notes": "sentence_structure_migration=true; previous_review_invalidated=true; human_double_review_required=true",
            })
    reviews.extend(migration_reviews)

    write_csv(data_dir / "poems.csv", list(poems[0]), poems)
    write_csv(data_dir / "poem_lines.csv", TABLE_FIELDS["poem_lines"], all_new_lines)
    write_csv(data_dir / "poem_imagery.csv", list(migrated_targets["poem_imagery"][0]), migrated_targets["poem_imagery"])
    write_csv(data_dir / "color_occurrences.csv", list(migrated_targets["color_occurrences"][0]), migrated_targets["color_occurrences"])
    write_csv(data_dir / "annotation_reviews.csv", TABLE_FIELDS["annotation_reviews"], reviews)

    mapping_path = reports_dir / "tang_poem_sentence_migration_v1.csv"
    write_csv(mapping_path, list(all_mapping[0]), all_mapping)
    normalization_path = update_normalization_report(reports_dir, poems)
    candidate_path = update_candidate_report(reports_dir, migrated_targets, new_by_id)

    summary = {
        "migration": "sentence_structure_migration_v1",
        "migration_at": MIGRATION_AT,
        "poem_count": len(poems),
        "old_line_count": len(old_lines),
        "new_sentence_count": len(all_new_lines),
        "mapping_row_count": len(all_mapping),
        "migrated_annotation_counts": {
            table: len(rows) for table, rows in migrated_targets.items()
        },
        "appended_review_count": len(migration_reviews),
        "review_policy": "受句结构影响的意象和颜色坐标全部标记 needs_revision；旧审核通过记录保留为历史链路",
        "source_text_policy": "未覆盖原始来源；原始文本仍在 normalization v1 report，最终展示文本在 normalization v2 report",
        "outputs": {
            "mapping": str(mapping_path.relative_to(root)),
            "normalization": str(normalization_path.relative_to(root)),
            "candidates": str(candidate_path.relative_to(root)),
        },
    }
    summary_path = reports_dir / "tang_poem_sentence_migration_v1.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

"""Replace one expansion candidate after a duplicate-title review."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import uuid
from pathlib import Path

from opencc import OpenCC


NAMESPACE = uuid.UUID("7dfb0a13-2f1d-4f7f-a8be-93fa36fd3e9a")
OLD_RECORD = "a68013c8-4630-41c6-a5ee-a658b57f58fe"
NEW_RECORD = "5b3a5651-2a80-4fb1-b1bf-c9fb5ec38905"


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


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


def split_sentences(value: str) -> list[str]:
    lines: list[str] = []
    for source_line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        source_line = source_line.strip()
        if not source_line:
            continue
        current: list[str] = []
        for char in source_line:
            current.append(char)
            if char in "，。！？；":
                lines.append("".join(current))
                current = []
        if current:
            lines.append("".join(current))
    return lines


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--tang300", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    converter = OpenCC("t2s")
    records = json.loads(args.tang300.read_text(encoding="utf-8"))
    record = next(row for row in records if row["id"] == NEW_RECORD)
    raw_text = "\n".join(record["paragraphs"])
    title = simplify(converter, record["title"])
    display_text = simplify(converter, raw_text)
    sentences = split_sentences(display_text)
    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    manifest = read_csv(reports_dir / "tang_poem_expansion_manifest_v1.csv")
    audit = read_csv(reports_dir / "tang_poem_expansion_text_audit_v1.csv")
    id_map = read_csv(reports_dir / "tang_poem_expansion_id_map_v1.csv")
    old_poems = [row for row in poems if f"source_record_id={OLD_RECORD};" in row["variant_notes"]]
    if len(old_poems) != 1:
        raise ValueError(f"expected exactly one old expansion record, got {len(old_poems)}")
    old_poem = old_poems[0]
    old_id = old_poem["poem_id"]
    new_id = stable_id("poem", f"tang300:{NEW_RECORD}")
    if any(row["poem_id"] == new_id for row in poems):
        raise ValueError(f"replacement poem already exists: {new_id}")
    new_lines = []
    for line_no, sentence in enumerate(sentences, 1):
        line_id = stable_id("line", f"tang300:{NEW_RECORD}:line:{line_no}")
        new_lines.append({
            "line_id": line_id,
            "poem_id": new_id,
            "line_no": str(line_no),
            "couplet_no": str((line_no + 1) // 2),
            "line_text": sentence,
            "source_id": old_poem["source_id"],
            "source_locator": f"file={args.tang300.resolve()}; record_index=333; id={NEW_RECORD}; display_line_no={line_no}",
            "review_status": "pending",
            "created_by": "corpus_expansion_v1",
            "created_at": old_poem["created_at"],
            "updated_at": old_poem["updated_at"],
            "notes": "按，。！？；切分为单句；待人工逐句核对",
        })
    new_poem = dict(old_poem)
    new_poem.update({
        "poem_id": new_id,
        "title": title,
        "full_text": "\n".join(sentences),
        "source_locator": f"file={args.tang300.resolve()}; record_index=333; id={NEW_RECORD}",
        "variant_notes": "; ".join([
            "corpus_source=tang300",
            f"source_record_id={NEW_RECORD}",
            "source_script=繁体",
            "text_normalization=opencc_t2s_v1",
            "display_script=简体",
            "text_review_status=待人工复核",
            "canonical_review_status=待双人复核",
            "original_text_retained_in=reports/tang_poem_expansion_text_audit_v1.csv",
            "sentence_structure=punctuation_split_v1",
        ]),
    })
    poems = [row for row in poems if row["poem_id"] != old_id] + [new_poem]
    lines = [row for row in lines if row["poem_id"] != old_id] + new_lines
    selection_order = next(row["selection_order"] for row in manifest if row["source_record_id"] == OLD_RECORD)
    manifest = [row for row in manifest if row["source_record_id"] != OLD_RECORD]
    manifest.append({
        "selection_order": selection_order,
        "corpus_source": "tang300",
        "source_record_id": NEW_RECORD,
        "poem_id": new_id,
        "poet_id": old_poem["poet_id"],
        "title": title,
        "title_before": record["title"],
        "source_id": old_poem["source_id"],
        "source_locator": new_poem["source_locator"],
        "selection_reason": "替换与旧库同题重复的候选；保留唐诗三百首快照来源",
        "display_normalizer": "opencc_t2s_v1",
        "review_status": "pending_text_review",
        "feature_annotation_status": "not_imported",
    })
    audit = [row for row in audit if row["source_record_id"] != OLD_RECORD]
    audit.append({
        "poem_id": new_id,
        "corpus_source": "tang300",
        "source_record_id": NEW_RECORD,
        "title_before": record["title"],
        "title_after": title,
        "original_sha256": sha256(raw_text),
        "normalized_sha256": sha256("\n".join(sentences)),
        "changed_char_count": str(sum(a != b for a, b in zip(raw_text, "\n".join(sentences))) + abs(len(raw_text) - len("\n".join(sentences)))),
        "source_text": raw_text,
        "normalized_text": "\n".join(sentences),
        "normalizer": "opencc_t2s_v1",
        "sentence_count": str(len(sentences)),
        "status": "display_only_pending_review",
    })
    id_map = [row for row in id_map if not row["source_record_id"] == OLD_RECORD and not row["source_record_id"].startswith(f"{OLD_RECORD}:")]
    id_map.append({"entity_type": "poem", "source_record_id": NEW_RECORD, "new_id": new_id, "corpus_source": "tang300", "notes": "stable UUID5 mapping"})
    for line_no, line in enumerate(new_lines, 1):
        id_map.append({"entity_type": "line", "source_record_id": f"{NEW_RECORD}:{line_no}", "new_id": line["line_id"], "corpus_source": "tang300", "notes": "stable UUID5 mapping"})
    write_csv(data_dir / "poems.csv", poems)
    write_csv(data_dir / "poem_lines.csv", lines)
    write_csv(reports_dir / "tang_poem_expansion_manifest_v1.csv", manifest)
    write_csv(reports_dir / "tang_poem_expansion_text_audit_v1.csv", audit)
    write_csv(reports_dir / "tang_poem_expansion_id_map_v1.csv", id_map)
    print(f"replaced={OLD_RECORD} with={NEW_RECORD} poem_id={new_id} lines={len(new_lines)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

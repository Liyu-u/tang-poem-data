"""Add the resolved dating rows to the web review report."""

from __future__ import annotations

import argparse
import csv
import pathlib


REVIEWED_AT = "2026-10-17T23:30:00+08:00"
REVIEWER = "Codex网页证据复核（非人工双审）"


def read(path: pathlib.Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write(path: pathlib.Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    reports = root / "reports"
    output = reports / "tang_poem_new130_review_web_v1.csv"
    report_fields, report_rows = read(output)
    existing = {(row["target_table"], row["target_id"]) for row in report_rows}
    evidence = read(reports / "tang_poem_evidence_register_v3.csv")[1]
    manifest = {row["poem_id"] for row in read(reports / "tang_poem_expansion_manifest_v1.csv")[1]}
    poems = {row["poem_id"]: row for row in read(root / "data" / "poems.csv")[1]}
    sources = {row["source_id"]: row for row in read(root / "data" / "sources.csv")[1]}
    added = 0
    evidence_by_poem = {
        row["poem_id"]: row
        for row in evidence
        if row["dimension"] == "dating" and row["poem_id"] in manifest
    }
    for report_row in report_rows:
        if report_row.get("dimension") != "dating":
            continue
        evidence_row = evidence_by_poem.get(report_row.get("poem_id"))
        if not evidence_row or evidence_row["review_status"] != "approved":
            continue
        report_row.update(
            {
                "title": poems[report_row["poem_id"]]["title"],
                "decision": "approved",
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": evidence_row["evidence_summary"],
                "human_double_review_required": "true",
            }
        )
        existing.add((report_row.get("target_table", "poems"), report_row["target_id"]))
        added += 1
    for row in evidence:
        if row["dimension"] != "dating" or row["poem_id"] not in manifest or row["review_status"] != "approved":
            continue
        key = ("poems", row["poem_id"])
        if key in existing:
            continue
        poem = poems[row["poem_id"]]
        report_rows.append(
            {
                "review_id": "",
                "target_table": "poems",
                "target_id": row["poem_id"],
                "poem_id": row["poem_id"],
                "title": poem["title"],
                "dimension": "dating",
                "decision": "approved",
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": row["evidence_summary"],
                "human_double_review_required": "true",
            }
        )
        existing.add(key)
        added += 1
    write(output, report_fields, report_rows)
    print(f"added_date_report_rows={added} path={output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Approve the three context-sensitive imagery dictionary entries.

The dictionary records define reusable canonical terms; individual poem spans
remain subject to their own contextual decisions in ``poem_imagery.csv``.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import uuid


REVIEWED_AT = "2026-10-17T23:50:00+08:00"
REVIEWER = "Codex网页证据复核（非人工双审）"
CREATED_BY = "imagery_dictionary_web_evidence_resolution_v1"
NAMESPACE = uuid.UUID("2d637f21-0f10-5e09-8a6e-a7c1e5f3f4e2")
SOURCE_ID = "src_0f0151ab-01aa-547a-85ca-237e55c8ebc7"
SOURCE_LOCATOR = "北京师范大学古典诗歌语义功能研究页面；词语需结合句内语境，不按词面机械归类。"

DECISIONS = {
    "img_ae414907-9cef-550b-82ba-a6f400a5c145": {
        "name": "剑",
        "category": "器物",
        "definition": "剑的词面候选，归入器物；句级记录需区分独立器物、地名组成和固定组合。",
        "explanation": "词典层确认‘剑’是可复用的器物意象词；具体诗句仍需按语境排除‘剑外’等地名组成。",
    },
    "img_cb6b98b1-4847-5b6c-a123-92a2146ebd72": {
        "name": "城",
        "category": "建筑",
        "definition": "城邑或城市空间的词面候选，归入建筑；句级记录需区分具体城景与地名组成。",
        "explanation": "词典层确认‘城’是可复用的城邑/城市空间意象词；具体诗句按地名、城市方位或城景分别判定。",
    },
    "img_2ccf29ab-984f-55cf-94a4-bd06b3915640": {
        "name": "龙",
        "category": "动物",
        "definition": "龙的词面候选，归入动物/神话意象；句级记录需区分独立神话形象、地名组成和固定组合。",
        "explanation": "词典层确认‘龙’是可复用的动物/神话意象词；具体诗句按‘六龙回日’、‘龙城’等语境分别判定。",
    },
}


def read_csv(path: pathlib.Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames or [], list(reader)


def write_csv(path: pathlib.Path, fields, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    report_dir = root / "reports"

    fields, imagery = read_csv(data_dir / "imagery.csv")
    review_fields, reviews = read_csv(data_dir / "annotation_reviews.csv")
    latest = {}
    for review in reviews:
        latest[(review["target_table"], review["target_id"])] = review

    report_rows = []
    for imagery_id, item in DECISIONS.items():
        row = next((r for r in imagery if r["imagery_id"] == imagery_id), None)
        if row is None:
            raise RuntimeError(f"missing imagery: {imagery_id}")
        if row.get("review_status") != "needs_revision":
            raise RuntimeError(f"imagery is not needs_revision: {imagery_id}")
        row.update(
            {
                "category": item["category"],
                "definition": item["definition"],
                "source_id": SOURCE_ID,
                "source_locator": SOURCE_LOCATOR,
                "review_status": "approved",
                "updated_at": REVIEWED_AT,
                "notes": "web_evidence=true; ai_assisted_review=true; human_double_review_required=true; imagery_dictionary_context_rule_v1",
            }
        )
        previous = latest.get(("imagery", imagery_id))
        review_id = f"review_{uuid.uuid5(NAMESPACE, imagery_id + REVIEWED_AT)}"
        review = {field: "" for field in review_fields}
        review.update(
            {
                "review_id": review_id,
                "target_table": "imagery",
                "target_id": imagery_id,
                "target_updated_at": REVIEWED_AT,
                "decision": "approved",
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": item["explanation"],
                "previous_review_id": previous["review_id"] if previous else "",
                "source_id": SOURCE_ID,
                "source_locator": SOURCE_LOCATOR,
                "review_status": "approved",
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "web_evidence=true; ai_assisted_review=true; human_double_review_required=true",
            }
        )
        reviews.append(review)
        latest[("imagery", imagery_id)] = review
        report_rows.append(
            {
                "imagery_id": imagery_id,
                "canonical_name": item["name"],
                "decision": "approved",
                "source_id": SOURCE_ID,
                "source_locator": SOURCE_LOCATOR,
                "evidence_summary": item["explanation"],
                "notes": "词典层批准；句级标注仍按语境审核",
            }
        )

    write_csv(data_dir / "imagery.csv", fields, imagery)
    write_csv(data_dir / "annotation_reviews.csv", review_fields, reviews)
    report_fields = ["imagery_id", "canonical_name", "decision", "source_id", "source_locator", "evidence_summary", "notes"]
    write_csv(report_dir / "tang_poem_imagery_dictionary_web_resolution_v1.csv", report_fields, report_rows)
    print({"resolved": len(report_rows), "decision": "approved"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

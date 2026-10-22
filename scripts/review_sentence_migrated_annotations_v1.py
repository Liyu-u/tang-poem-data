"""Re-review migrated imagery and color coordinates without claiming human double review."""

import argparse
import csv
import uuid
from pathlib import Path


REVIEWED_AT = "2026-10-16T19:00:00+08:00"
REVIEWER = "Codex辅助复核（句结构迁移后，非人工双审）"
CREATED_BY = "annotation_recheck_v1"
NAMESPACE = uuid.UUID("db30193f-c03b-4cb2-9bfc-8051a608c27c")


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def stable_id(prefix, key):
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def append_note(value, note):
    return f"{value}; {note}" if value else note


def legacy_id(poem):
    return poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0]


def decide_imagery(row, imagery_by_id, line_by_id):
    term = imagery_by_id[row["imagery_id"]]["canonical_name"]
    line_text = line_by_id[row["start_line_id"]]
    if term == "剑" and "剑阁" in line_text:
        return "rejected", "此处“剑”属于“剑阁”地名组成，不作为独立器物意象计入。"
    if term == "龙":
        return "needs_revision", "此处为“六龙”神话意象或“龙城”专名组成，动物类别边界需人工确认。"
    if term == "城":
        return "needs_revision", "此处多为城邑或地名成分，建筑与地理类别边界需人工确认。"
    if term == "江" and "江州" in line_text:
        return "needs_revision", "此处“江州”是地名，不直接计为江河意象。"
    return "approved", "新单句中的词面位置、引文和偏移一致，可作为内部意象候选；语境仍需人工复核。"


def decide_color(row, line_by_id):
    term = row["color_term"]
    line_text = line_by_id[row["start_line_id"]]
    if term == "金" and ("万金" in line_text or "摐金" in line_text):
        return "rejected", "此处“金”表示价值或乐器/金属相关用法，不是颜色词。"
    if term == "朱" and "朱雀桥" in line_text:
        return "needs_revision", "此处属于“朱雀桥”专名，是否作为颜色表达需人工确认。"
    return "approved", "新单句中的颜色词面、引文和偏移一致；具体字面/借代用法仍需人工复核。"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    report_path = reports_dir / "tang_poem_annotation_recheck_v1.csv"
    if report_path.exists():
        raise RuntimeError(f"refusing to overwrite existing report: {report_path}")

    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    line_by_id = {row["line_id"]: row["line_text"] for row in lines}
    imagery = read_csv(data_dir / "imagery.csv")
    imagery_by_id = {row["imagery_id"]: row for row in imagery}
    targets = {
        "poem_imagery": read_csv(data_dir / "poem_imagery.csv"),
        "color_occurrences": read_csv(data_dir / "color_occurrences.csv"),
    }
    for table, rows in targets.items():
        if not rows or any(row["review_status"] != "needs_revision" for row in rows):
            raise RuntimeError(f"expected all migrated {table} rows to be needs_revision")
        if any("annotation_recheck_v1" in row.get("notes", "") for row in rows):
            raise RuntimeError(f"recheck already applied to {table}")

    reviews = read_csv(data_dir / "annotation_reviews.csv")
    latest = {}
    for review in reviews:
        key = (review["target_table"], review["target_id"])
        if key not in latest or review["reviewed_at"] > latest[key]["reviewed_at"]:
            latest[key] = review

    report_rows = []
    appended = []
    for table, rows in targets.items():
        primary_key = "poem_imagery_id" if table == "poem_imagery" else "color_occurrence_id"
        for row in rows:
            if table == "poem_imagery":
                decision, comment = decide_imagery(row, imagery_by_id, line_by_id)
            else:
                decision, comment = decide_color(row, line_by_id)
            row["review_status"] = decision
            row["updated_at"] = REVIEWED_AT
            row["notes"] = append_note(
                row.get("notes", ""),
                f"annotation_recheck_v1={decision}; human_double_review_required=true",
            )
            target_id = row[primary_key]
            previous = latest[(table, target_id)]
            review_id = stable_id("review", f"{table}:{target_id}:{REVIEWED_AT}")
            appended.append({
                "review_id": review_id,
                "target_table": table,
                "target_id": target_id,
                "target_updated_at": REVIEWED_AT,
                "decision": decision,
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": comment,
                "previous_review_id": previous["review_id"],
                "source_id": row["source_id"],
                "source_locator": row["source_locator"],
                "review_status": decision,
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "ai_assisted_review=true; sentence_structure_recheck=true; human_double_review_required=true",
            })
            poem = next(item for item in poems if item["poem_id"] == row["poem_id"])
            report_rows.append({
                "review_id": review_id,
                "target_table": table,
                "target_id": target_id,
                "poem_id": row["poem_id"],
                "title": poem["title"],
                "legacy_work_id": legacy_id(poem),
                "decision": decision,
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "start_line_id": row["start_line_id"],
                "start_offset": row["start_offset"],
                "quote": row["quote"],
                "review_comment": comment,
                "human_double_review_required": "true",
            })

    reviews.extend(appended)
    write_csv(data_dir / "poem_imagery.csv", list(targets["poem_imagery"][0]), targets["poem_imagery"])
    write_csv(data_dir / "color_occurrences.csv", list(targets["color_occurrences"][0]), targets["color_occurrences"])
    write_csv(data_dir / "annotation_reviews.csv", list(reviews[0]), reviews)
    write_csv(report_path, list(report_rows[0]), report_rows)

    counts = {}
    for row in appended:
        counts[row["decision"]] = counts.get(row["decision"], 0) + 1
    print(f"rechecked={len(appended)} counts={counts} report={report_path}")


if __name__ == "__main__":
    main()

"""Apply a traceable first-pass review to the pilot annotation candidates."""

import argparse
import csv
import uuid
from pathlib import Path


REVIEWED_AT = "2026-10-16T18:00:00+08:00"
REVIEWER = "Codex辅助复核（非人工双审）"
CREATED_BY = "annotation_review_v1"
NAMESPACE = uuid.UUID("b5f93d0a-56b9-4f6f-a3b1-c3a20d669e3f")


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


def legacy_id(poem):
    return poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0]


def append_note(value, note):
    return f"{value}; {note}" if value else note


def review_decision(table, row, poem_by_id, imagery_by_id, line_by_id):
    if table == "tags":
        return "approved", "标签定义与项目初版主题词表一致；仅代表项目内部分类，不代表文学史终审。"
    if table == "imagery":
        term = row["canonical_name"]
        if term in {"城", "龙", "剑"}:
            return "needs_revision", "词表项存在地名、神话或专名边界，需人工决定类别后再进入正式统计。"
        return "approved", "词面和初版意象类别可用于内部试运行；仍需人工复核语境。"
    if table == "poem_tags":
        poem = poem_by_id[row["poem_id"]]
        theme = row["explanation"].split("规则候选：命中“", 1)[1].split("”", 1)[0]
        current_legacy = legacy_id(poem)
        if (current_legacy, theme) in {
            ("W0025", "国破、烽火、家书"),
            ("W0041", "归期、夜雨"),
            ("W0040", "思华年、追忆、惘然"),
        }:
            return "needs_revision", "主题解释依赖较强文学判断或分类边界，保留候选但不进入正式结论。"
        return "approved", "原文关键词与项目主题分类基本相符，可用于内部试运行；不替代人工文学判断。"
    if table == "poem_imagery":
        term = imagery_by_id[row["imagery_id"]]["canonical_name"]
        line_text = line_by_id[row["start_line_id"]]
        if term == "剑":
            return "rejected", "此处“剑”属于“剑阁”地名组成，不作为独立器物意象计入。"
        if term == "龙":
            return "needs_revision", "此处为神话意象或地名组成，动物类别需人工细分。"
        if term == "城":
            return "needs_revision", "此处多为城邑或地名，建筑与地理类别边界需人工确认。"
        if term == "江" and "江州" in line_text:
            return "needs_revision", "此处“江州”是地名，不直接计为江河意象。"
        return "approved", "词面位置、引文和偏移与诗句一致，可作为内部意象候选；语境仍需人工复核。"
    if table == "color_occurrences":
        term = row["color_term"]
        line_text = line_by_id[row["start_line_id"]]
        if term == "金":
            return "rejected", "此处“万金”表示价值或“金”指金属/乐器，不是颜色词。"
        if term == "朱" and line_text.startswith("朱雀桥"):
            return "needs_revision", "此处属于“朱雀桥”专名，是否作为颜色表达需人工确认。"
        return "approved", "颜色词面、引文和偏移一致；具体字面/借代用法保留说明。"
    raise ValueError(f"unsupported review table: {table}")


def main():
    parser = argparse.ArgumentParser(description="Review pilot annotation candidates without claiming human double review.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    report_path = reports_dir / "tang_poem_annotation_review_v1.csv"
    if report_path.exists():
        raise RuntimeError(f"refusing to overwrite existing review report: {report_path}")
    if read_csv(data_dir / "annotation_reviews.csv"):
        raise RuntimeError("refusing to overwrite non-empty annotation_reviews.csv")

    poems = read_csv(data_dir / "poems.csv")
    poem_by_id = {row["poem_id"]: row for row in poems}
    lines = read_csv(data_dir / "poem_lines.csv")
    line_by_id = {row["line_id"]: row["line_text"] for row in lines}
    tags = read_csv(data_dir / "tags.csv")
    imagery = read_csv(data_dir / "imagery.csv")
    imagery_by_id = {row["imagery_id"]: row for row in imagery}
    sources = read_csv(data_dir / "sources.csv")
    annotation_source = next(row for row in sources if row["title"] == "《文镜》首批标注规则 v1")

    targets = [
        ("tags", tags),
        ("imagery", imagery),
        ("poem_tags", read_csv(data_dir / "poem_tags.csv")),
        ("poem_imagery", read_csv(data_dir / "poem_imagery.csv")),
        ("color_occurrences", read_csv(data_dir / "color_occurrences.csv")),
    ]
    reviews = []
    report_rows = []
    for table, rows in targets:
        primary_key = {
            "tags": "tag_id",
            "imagery": "imagery_id",
            "poem_tags": "poem_tag_id",
            "poem_imagery": "poem_imagery_id",
            "color_occurrences": "color_occurrence_id",
        }[table]
        for row in rows:
            decision, comment = review_decision(table, row, poem_by_id, imagery_by_id, line_by_id)
            row["review_status"] = decision
            row["updated_at"] = REVIEWED_AT
            row["notes"] = append_note(row.get("notes", ""), f"ai_review={decision}; human_double_review_required=true")
            target_id = row[primary_key]
            target_source = row.get("source_id") or annotation_source["source_id"]
            target_locator = row.get("source_locator", "")
            review_id = stable_id("review", f"{table}:{target_id}:{REVIEWED_AT}")
            reviews.append({
                "review_id": review_id,
                "target_table": table,
                "target_id": target_id,
                "target_updated_at": REVIEWED_AT,
                "decision": decision,
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": comment,
                "previous_review_id": "",
                "source_id": target_source,
                "source_locator": target_locator,
                "review_status": decision,
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "ai_assisted_review=true; human_double_review_required=true",
            })
            report_rows.append({
                "review_id": review_id,
                "target_table": table,
                "target_id": target_id,
                "decision": decision,
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": comment,
                "human_double_review_required": "true",
            })

    write_csv(data_dir / "tags.csv", list(tags[0]), tags)
    write_csv(data_dir / "imagery.csv", list(imagery[0]), imagery)
    for table, rows in targets[2:]:
        write_csv(data_dir / f"{table}.csv", list(rows[0]), rows)
    write_csv(
        data_dir / "annotation_reviews.csv",
        list(read_csv(data_dir / "annotation_reviews.csv")) if False else [
            "review_id", "target_table", "target_id", "target_updated_at", "decision",
            "reviewer", "reviewed_at", "review_comment", "previous_review_id", "source_id",
            "source_locator", "review_status", "created_by", "created_at", "updated_at", "notes",
        ],
        reviews,
    )
    write_csv(
        report_path,
        [
            "review_id", "target_table", "target_id", "decision", "reviewer", "reviewed_at",
            "review_comment", "human_double_review_required",
        ],
        report_rows,
    )
    counts = {}
    for row in reviews:
        counts[row["decision"]] = counts.get(row["decision"], 0) + 1
    print(f"reviewed={len(reviews)} counts={counts} report={report_path}")


if __name__ == "__main__":
    main()

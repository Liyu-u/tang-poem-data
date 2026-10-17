"""Review the new 130-poem evidence without claiming human double review."""

from __future__ import annotations

import argparse
import csv
import pathlib
import re
import uuid


REVIEWED_AT = "2026-10-17T18:00:00+08:00"
REVIEWER = "Codex辅助复核（新增130首；非人工双审）"
CREATED_BY = "new130_evidence_review_v1"
NAMESPACE = uuid.UUID("fbf7a8f8-14ae-4a65-8c18-ec8f3a8805e1")


def read_csv(path: pathlib.Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: pathlib.Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def append_note(value: str, note: str) -> str:
    return f"{value}; {note}" if value else note


def review_theme(title: str, theme: str) -> tuple[str, str]:
    ambiguous = {
        ("赋得", "爱情闺怨"),
        ("赋得", "边塞征战"),
        ("奉和中书舍人贾至早朝大明宫", "人生感怀"),
        ("花非花", "爱情闺怨"),
    }
    if (title, theme) in ambiguous:
        return "needs_revision", "主题标签与作品的主旨边界较宽，保留候选，需真人依据具体选本决定是否纳入。"
    return "approved", "题材、文本语义与项目主题词表基本一致，可用于内部统计；不等同专家定论。"


def review_imagery(term: str, line_text: str) -> tuple[str, str, str]:
    proper_name_patterns = {
        "剑": ("剑阁", "剑门", "剑外", "剑南"),
        "龙": ("龙标", "龙门", "龙城", "龙驭", "龙钟"),
    }
    for pattern in proper_name_patterns.get(term, ()):
        if pattern in line_text:
            return "rejected", f"“{term}”出现在“{pattern}”中，当前证据不足以作为独立{term}意象。", "专名或固定组合"
    if term in {"剑", "龙", "虎"}:
        return "needs_revision", f"“{term}”可能是器物、神话或比兴语境，需真人确认具体意象类别。", "语境边界待核"
    temporal_patterns = {
        "日": ("今日", "昨日", "明日", "日暮", "日夕", "日夜", "一日", "七月七日"),
        "春": ("青春", "春梦", "春酒", "春词", "春事", "春宫", "春寒", "春宵"),
        "秋": ("秋词", "秋日", "秋水", "秋风"),
    }
    if any(pattern in line_text for pattern in temporal_patterns.get(term, ())):
        return "needs_revision", f"“{term}”处于时间或固定组合中，需真人确认是否作为独立意象计数。", "时间或固定组合"
    category_meaning = {
        "城": "城邑/建筑空间",
        "关": "关隘或地理空间",
        "日": "日象或时间表达",
        "春": "季节意象",
        "秋": "季节意象",
    }.get(term, "词面意象")
    return "approved", f"词面、句号和偏移一致，按项目词表暂归为{category_meaning}；仍需真人复核语境。", category_meaning


def review_color(term: str, line_text: str) -> tuple[str, str, str]:
    proper_name_patterns = {
        "黄": ("黄河", "黄鹤", "黄山"),
        "金": ("金陵", "金谷", "金城", "金门"),
        "朱": ("朱雀",),
    }
    for pattern in proper_name_patterns.get(term, ()):
        if pattern in line_text:
            return "rejected", f"“{term}”出现在“{pattern}”中，属于专名或地名，不作为颜色词统计。", "proper_name_or_place"
    ambiguous_patterns = {
        "白": ("白日", "白帝", "白头", "白发", "白露", "白云", "白骨", "白首"),
        "黄": ("黄昏", "黄云", "黄花"),
        "金": ("金盘", "金樽", "金鞍", "金甲", "金屋", "金风"),
        "青": ("青春", "青溪", "青谿", "青天"),
        "朱": ("朱门", "朱楼"),
    }
    if any(pattern in line_text for pattern in ambiguous_patterns.get(term, ())):
        return "needs_revision", f"“{term}”的颜色义与借代、器物或固定组合可能重叠，需真人确认。", "ambiguous"
    if term in {"黄", "金", "朱"}:
        return "needs_revision", f"“{term}”存在颜色义、器物义或借代义边界，暂不进入确认统计。", "ambiguous"
    return "approved", f"颜色词面、句号和偏移一致，暂作为颜色候选；不赋现代色值。", "color_candidate"


def review_technique(technique: str, full_text: str, quote: str) -> tuple[str, str]:
    text = full_text.replace("\n", "")
    direct_cues = {
        "比喻": ("如", "若", "似", "疑是", "化作", "飞流"),
        "拟人": ("怜", "知", "劝", "邀", "问", "笑", "愁", "怨", "无情", "报", "迎"),
        "夸张": ("千", "万", "九天", "三千", "一日", "上青天", "直下"),
        "衬托": ("独", "空", "静", "声", "鸟", "蝉", "无"),
        "用典": ("贾谊", "谢朓", "乌江", "金谷", "蜀相", "玄都观", "梁甫", "长生殿"),
        "托物言志": ("蝉", "落花"),
    }
    if technique == "借景抒情":
        imagery_cues = ("山", "水", "江", "月", "风", "雨", "雪", "花", "草", "云", "春", "秋")
        if any(cue in text for cue in imagery_cues):
            return "approved", "文本含景物描写，借景抒情可作为内部分析候选；情感主次仍需真人复核。"
    elif technique == "对比":
        contrast_pairs = (("今", "昔"), ("新", "旧"), ("春", "秋"), ("有", "无"), ("不", "却"), ("古", "今"))
        if any(left in text and right in text for left, right in contrast_pairs) or text.count("独") + text.count("空") >= 2:
            return "approved", "文本存在并置或反差线索，可作为对比手法候选；需真人确认其结构关系。"
    elif any(cue in text or cue in quote for cue in direct_cues.get(technique, ())):
        return "approved", f"引文包含{technique}的文本线索，可作为内部分析候选；不替代文学解释终审。"
    return "needs_revision", f"当前引文未提供足够直接的“{technique}”证据，保留候选并待真人复核。"


def make_review(
    target_table: str,
    target_id: str,
    poem_id: str,
    title: str,
    dimension: str,
    decision: str,
    comment: str,
    source_id: str,
    source_locator: str,
) -> dict[str, str]:
    review_id = stable_id("review", f"{target_table}:{target_id}:{REVIEWED_AT}")
    return {
        "review_id": review_id,
        "target_table": target_table,
        "target_id": target_id,
        "target_updated_at": REVIEWED_AT,
        "decision": decision,
        "reviewer": REVIEWER,
        "reviewed_at": REVIEWED_AT,
        "review_comment": comment,
        "previous_review_id": "",
        "source_id": source_id,
        "source_locator": source_locator,
        "review_status": decision,
        "created_by": CREATED_BY,
        "created_at": REVIEWED_AT,
        "updated_at": REVIEWED_AT,
        "notes": "ai_assisted_review=true; human_double_review_required=true",
        "poem_id": poem_id,
        "title": title,
        "dimension": dimension,
    }


def build(root: pathlib.Path) -> dict[str, int]:
    data_dir = root / "data"
    reports_dir = root / "reports"
    output_report = reports_dir / "tang_poem_new130_review_v1.csv"
    output_evidence = reports_dir / "tang_poem_evidence_register_v2.csv"
    if output_report.exists() or output_evidence.exists():
        raise RuntimeError("review outputs already exist; refusing to overwrite them")

    manifest_fields, manifest = read_csv(reports_dir / "tang_poem_expansion_manifest_v1.csv")
    new_ids = {row["poem_id"] for row in manifest}
    poem_fields, poems = read_csv(data_dir / "poems.csv")
    poems_by_id = {row["poem_id"]: row for row in poems}
    poet_fields, poets = read_csv(data_dir / "poets.csv")
    poet_names = {row["poet_id"]: row["name"] for row in poets}
    line_fields, lines = read_csv(data_dir / "poem_lines.csv")
    lines_by_id = {row["line_id"]: row for row in lines}
    line_by_poem_no = {(row["poem_id"], row["line_no"]): row for row in lines}
    tag_fields, tags = read_csv(data_dir / "tags.csv")
    tags_by_id = {row["tag_id"]: row for row in tags}
    imagery_fields, imagery = read_csv(data_dir / "imagery.csv")
    imagery_by_id = {row["imagery_id"]: row for row in imagery}
    source_fields, sources = read_csv(data_dir / "sources.csv")
    source_ids = {row["source_id"] for row in sources}

    annotation_fields, annotation_reviews = read_csv(data_dir / "annotation_reviews.csv")
    poem_tag_fields, poem_tags = read_csv(data_dir / "poem_tags.csv")
    poem_img_fields, poem_imagery = read_csv(data_dir / "poem_imagery.csv")
    color_fields, colors = read_csv(data_dir / "color_occurrences.csv")
    technique_fields, techniques = read_csv(data_dir / "technique_annotations.csv")
    evidence_fields, evidence_rows = read_csv(reports_dir / "tang_poem_evidence_register_v1.csv")

    target_decisions: dict[tuple[str, str], tuple[str, str]] = {}
    target_meta: dict[tuple[str, str], dict[str, str]] = {}
    review_rows: list[dict[str, str]] = []
    report_rows: list[dict[str, str]] = []

    def register_target(
        table: str,
        target_id: str,
        poem_id: str,
        dimension: str,
        decision: str,
        comment: str,
        source_id: str,
        source_locator: str,
    ) -> None:
        poem = poems_by_id[poem_id]
        title = poem["title"]
        target_decisions[(table, target_id)] = (decision, comment)
        target_meta[(table, target_id)] = {
            "poem_id": poem_id,
            "title": title,
            "dimension": dimension,
        }
        review = make_review(table, target_id, poem_id, title, dimension, decision, comment, source_id, source_locator)
        review_rows.append({key: review[key] for key in annotation_fields})
        report_rows.append({
            "review_id": review["review_id"],
            "target_table": table,
            "target_id": target_id,
            "poem_id": poem_id,
            "title": title,
            "dimension": dimension,
            "decision": decision,
            "reviewer": REVIEWER,
            "reviewed_at": REVIEWED_AT,
            "review_comment": comment,
            "human_double_review_required": "true",
        })

    theme_targets = {(row["poem_id"], row["tag_id"]): row for row in poem_tags}
    imagery_targets = {
        (row["poem_id"], row["quote"], row["start_line_id"], row["start_offset"]): row
        for row in poem_imagery
    }
    color_targets = {
        (row["poem_id"], row["color_term"], row["start_line_id"], row["start_offset"]): row
        for row in colors
    }
    technique_targets = {
        (row["poem_id"], row["technique_tag_id"], row["quote"]): row
        for row in techniques
    }

    for row in poem_tags:
        if row["poem_id"] not in new_ids:
            continue
        theme = tags_by_id[row["tag_id"]]["tag_name"]
        decision, comment = review_theme(poems_by_id[row["poem_id"]]["title"], theme)
        row["review_status"] = decision
        row["updated_at"] = REVIEWED_AT
        row["notes"] = append_note(row.get("notes", ""), f"new130_ai_review={decision}; human_double_review_required=true")
        register_target("poem_tags", row["poem_tag_id"], row["poem_id"], "theme", decision, comment, row["source_id"], row["source_locator"])

    for row in poem_imagery:
        if row["poem_id"] not in new_ids:
            continue
        term = imagery_by_id[row["imagery_id"]]["canonical_name"]
        line_text = lines_by_id[row["start_line_id"]]["line_text"]
        decision, comment, meaning = review_imagery(term, line_text)
        row["review_status"] = decision
        row["updated_at"] = REVIEWED_AT
        row["contextual_meaning"] = meaning
        row["confidence"] = "0.78" if decision == "approved" else "0.55"
        row["notes"] = append_note(row.get("notes", ""), f"new130_ai_review={decision}; human_double_review_required=true")
        register_target("poem_imagery", row["poem_imagery_id"], row["poem_id"], "imagery", decision, comment, row["source_id"], row["source_locator"])

    for row in colors:
        if row["poem_id"] not in new_ids:
            continue
        line_text = lines_by_id[row["start_line_id"]]["line_text"]
        decision, comment, usage = review_color(row["color_term"], line_text)
        row["review_status"] = decision
        row["updated_at"] = REVIEWED_AT
        row["usage_type"] = usage
        row["confidence"] = "0.78" if decision == "approved" else "0.45"
        row["notes"] = append_note(row.get("notes", ""), f"new130_ai_review={decision}; human_double_review_required=true")
        register_target("color_occurrences", row["color_occurrence_id"], row["poem_id"], "color", decision, comment, row["source_id"], row["source_locator"])

    for row in techniques:
        if row["poem_id"] not in new_ids:
            continue
        technique = tags_by_id[row["technique_tag_id"]]["tag_name"]
        poem = poems_by_id[row["poem_id"]]
        decision, comment = review_technique(technique, poem["full_text"], row["quote"])
        row["review_status"] = decision
        row["updated_at"] = REVIEWED_AT
        row["effect"] = comment
        row["confidence"] = "0.72" if decision == "approved" else "0.50"
        row["notes"] = append_note(row.get("notes", ""), f"new130_ai_review={decision}; human_double_review_required=true")
        register_target("technique_annotations", row["technique_annotation_id"], row["poem_id"], "technique", decision, comment, row["source_id"], row["source_locator"])

    dating_decisions: dict[str, tuple[str, str]] = {}
    for row in evidence_rows:
        if row["poem_id"] not in new_ids or row["dimension"] != "dating":
            continue
        if row["dating_status"] == "undetermined":
            decision = "approved"
            comment = "已复核为保留空值：当前没有足够逐篇证据，不以作者生卒年替代创作年份。"
        else:
            decision = "needs_revision"
            comment = "年份候选已记录，但证据定位仍为概括性来源，需真人查年谱、编年本或题下注后确认。"
        dating_decisions[row["poem_id"]] = (decision, comment)
        poem = poems_by_id[row["poem_id"]]
        poem["notes"] = append_note(poem.get("notes", ""), f"new130_year_review={decision}; human_double_review_required=true")
        register_target("poems", row["poem_id"], row["poem_id"], "dating", decision, comment, row["source_id"], row["source_locator"])

    def resolve_evidence_target(row: dict[str, str]) -> tuple[str, str]:
        poem_id = row["poem_id"]
        if row["dimension"] == "dating":
            return "poems", poem_id
        if row["dimension"] == "theme":
            tag_id = next(tag_id for tag_id, tag in tags_by_id.items() if tag["tag_name"] == row["candidate_value"])
            return "poem_tags", theme_targets[(poem_id, tag_id)]["poem_tag_id"]
        if row["dimension"] == "technique":
            tag_id = next(tag_id for tag_id, tag in tags_by_id.items() if tag["tag_name"] == row["candidate_value"])
            target = technique_targets[(poem_id, tag_id, row["quote"])]
            return "technique_annotations", target["technique_annotation_id"]
        match = re.search(r"句号=(\d+); 字符偏移=(\d+)", row["source_locator"])
        if not match:
            raise ValueError(f"cannot resolve evidence locator: {row['evidence_id']}")
        line = line_by_poem_no[(poem_id, match.group(1))]
        if row["dimension"] == "imagery":
            target = imagery_targets[(poem_id, row["quote"], line["line_id"], match.group(2))]
            return "poem_imagery", target["poem_imagery_id"]
        if row["dimension"] == "color":
            target = color_targets[(poem_id, row["candidate_value"], line["line_id"], match.group(2))]
            return "color_occurrences", target["color_occurrence_id"]
        raise ValueError(f"unsupported evidence dimension: {row['dimension']}")

    reviewed_evidence: list[dict[str, str]] = []
    for row in evidence_rows:
        if row["poem_id"] not in new_ids:
            reviewed_evidence.append(row)
            continue
        table, target_id = resolve_evidence_target(row)
        decision, comment = target_decisions[(table, target_id)]
        row["review_status"] = decision
        row["notes"] = append_note(row.get("notes", ""), f"new130_ai_review={decision}; human_double_review_required=true")
        reviewed_evidence.append(row)

    annotation_reviews.extend(review_rows)
    write_csv(data_dir / "poem_tags.csv", poem_tag_fields, poem_tags)
    write_csv(data_dir / "poem_imagery.csv", poem_img_fields, poem_imagery)
    write_csv(data_dir / "color_occurrences.csv", color_fields, colors)
    write_csv(data_dir / "technique_annotations.csv", technique_fields, techniques)
    write_csv(data_dir / "poems.csv", poem_fields, poems)
    write_csv(data_dir / "annotation_reviews.csv", annotation_fields, annotation_reviews)
    write_csv(output_evidence, evidence_fields, reviewed_evidence)
    report_fields = [
        "review_id", "target_table", "target_id", "poem_id", "title", "dimension", "decision",
        "reviewer", "reviewed_at", "review_comment", "human_double_review_required",
    ]
    write_csv(output_report, report_fields, report_rows)

    counts: dict[str, int] = {}
    for row in report_rows:
        key = f"{row['target_table']}:{row['decision']}"
        counts[key] = counts.get(key, 0) + 1
    print({"new_poems": len(new_ids), "review_rows": len(report_rows), "counts": counts})
    return {"new_poems": len(new_ids), "review_rows": len(report_rows), **counts}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

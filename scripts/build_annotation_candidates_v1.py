"""Build traceable, rule-assisted annotation candidates for the 20-poem pilot."""

import argparse
import csv
import uuid
from pathlib import Path


SNAPSHOT_AT = "2026-10-16T00:00:00+08:00"
CREATED_BY = "annotation_candidate_v1"
NAMESPACE = uuid.UUID("c6799d34-d7c7-46fb-9c4b-b0dfde9d28fe")
ANNOTATION_SOURCE_KEY = "annotation-vocabulary:wenjing:v1"

IMAGERY_TERMS = {
    "月": ("天象", "月亮等天体意象的词面候选"),
    "霜": ("气象", "霜的气象意象词面候选"),
    "山": ("山川", "山岳意象词面候选"),
    "水": ("山川", "水体意象词面候选"),
    "江": ("山川", "江河意象词面候选"),
    "川": ("山川", "川流意象词面候选"),
    "河": ("山川", "河流意象词面候选"),
    "城": ("建筑", "城邑意象词面候选"),
    "关": ("建筑", "关隘意象词面候选"),
    "花": ("草木", "花卉意象词面候选"),
    "柳": ("草木", "柳树意象词面候选"),
    "草": ("草木", "草木意象词面候选"),
    "松": ("草木", "松树意象词面候选"),
    "竹": ("草木", "竹林意象词面候选"),
    "风": ("气象", "风的气象意象词面候选"),
    "雨": ("气象", "雨的气象意象词面候选"),
    "雪": ("气象", "雪的气象意象词面候选"),
    "云": ("气象", "云的气象意象词面候选"),
    "秋": ("季节", "秋季意象词面候选"),
    "春": ("季节", "春季意象词面候选"),
    "日": ("天象", "日的天象意象词面候选"),
    "鸟": ("动物", "鸟类意象词面候选"),
    "鹤": ("动物", "鹤意象词面候选"),
    "燕": ("动物", "燕意象词面候选"),
    "猿": ("动物", "猿意象词面候选"),
    "虎": ("动物", "虎意象词面候选"),
    "龙": ("动物", "龙意象词面候选"),
    "马": ("动物", "马意象词面候选"),
    "舟": ("器物", "舟船意象词面候选"),
    "酒": ("器物", "酒意象词面候选"),
    "剑": ("器物", "剑意象词面候选"),
}

COLOR_TERMS = {
    "青": "青色",
    "白": "白色",
    "黄": "黄色",
    "红": "红色",
    "朱": "朱红色",
    "金": "金色",
}

THEMES = {
    "W0001": {"思乡怀人": ["明月", "故乡"]},
    "W0025": {"政治讽喻": ["国破", "烽火", "家书"], "人生感怀": ["白头", "恨别"]},
    "W0026": {"山水田园": ["岱宗", "青", "众山"]},
    "W0027": {"羁旅": ["作客", "独登台"], "人生感怀": ["悲秋", "多病"]},
    "W0030": {"山水田园": ["空山", "清泉", "竹", "渔舟"]},
    "W0036": {"人生感怀": ["不得意", "天涯沦落人", "独倾"]},
    "W0037": {"送别": ["送", "王孙", "别情"]},
    "W0040": {"人生感怀": ["思华年", "追忆", "惘然"]},
    "W0041": {"思乡怀人": ["归期", "西窗烛", "巴山夜雨"], "羁旅": ["归期", "夜雨"]},
    "W0046": {"咏史怀古": ["亡国", "后庭花"], "政治讽喻": ["亡国恨"]},
    "W0050": {"山水田园": ["春眠", "花", "风雨"]},
    "W0055": {"边塞征战": ["长征", "胡马", "阴山"]},
    "W0056": {"送别": ["送客", "亲友"]},
    "W0060": {"边塞征战": ["胡天", "将军", "天山路"], "送别": ["送君", "归客"]},
    "W0065": {"山水田园": ["幽草", "春潮", "野渡"]},
    "W0070": {"边塞征战": ["战士", "边庭", "沙场"]},
    "W0074": {"咏史怀古": ["旧时王谢", "百姓家"]},
    "W0078": {"送别": ["送灵澈", "归远"]},
    "W0250": {},
    "W0262": {"送别": ["劝君", "故人", "西出"]},
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


def occurrences(text, term):
    start = 0
    while True:
        index = text.find(term, start)
        if index < 0:
            return
        yield index
        start = index + 1


def main():
    parser = argparse.ArgumentParser(description="Build pending annotation candidates for the pilot corpus.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    report_path = reports_dir / "tang_poem_annotation_candidates_v1.csv"
    if report_path.exists():
        raise RuntimeError(f"refusing to overwrite existing candidate report: {report_path}")

    target_files = ["tags.csv", "poem_tags.csv", "imagery.csv", "poem_imagery.csv", "color_occurrences.csv"]
    for filename in target_files:
        if read_csv(data_dir / filename):
            raise RuntimeError(f"refusing to overwrite non-empty target: {data_dir / filename}")

    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    sources = read_csv(data_dir / "sources.csv")
    if not poems or len(poems) != 20:
        raise ValueError(f"expected 20 poems, got {len(poems)}")
    source_id = stable_id("src", ANNOTATION_SOURCE_KEY)
    if any(row["source_id"] == source_id for row in sources):
        raise RuntimeError(f"annotation source already exists: {source_id}")

    sources.append({
        "source_id": source_id,
        "source_type": "other",
        "title": "《文镜》首批标注规则 v1",
        "creator": "文镜数据组",
        "publisher": "文镜项目",
        "edition": "v1",
        "publication_date": "2026-10-16",
        "url": "",
        "accessed_on": "",
        "rights": "项目内部方法文档",
        "bibliographic_note": "依据项目初版主题、意象、色彩词表；规则匹配结果只作候选，不等同人工文学判断。",
        "review_status": "pending",
        "created_by": CREATED_BY,
        "created_at": SNAPSHOT_AT,
        "updated_at": SNAPSHOT_AT,
        "notes": "annotation_vocabulary_version=v1; generated_candidates_pending_human_review",
    })

    poem_lines = {}
    for line in lines:
        poem_lines.setdefault(line["poem_id"], []).append(line)
    poem_by_legacy = {}
    for poem in poems:
        legacy_id = poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0]
        poem_by_legacy[legacy_id] = poem

    tags = []
    tag_ids = {}
    for theme in sorted({theme for themes in THEMES.values() for theme in themes}):
        tag_id = stable_id("tag", f"theme:{theme}")
        tag_ids[theme] = tag_id
        tags.append({
            "tag_id": tag_id,
            "tag_name": theme,
            "category": "theme",
            "parent_tag_id": "",
            "definition": "项目初版主题分类；本标签用于规则候选统计，不等同文学史定论。",
            "source_id": source_id,
            "source_locator": "PROJECT_DIRECTION_TANG_POETRY.md; 初版主题词表",
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": SNAPSHOT_AT,
            "updated_at": SNAPSHOT_AT,
            "notes": "machine_candidate=true; review_required=true",
        })

    imagery = []
    imagery_ids = {}
    matched_terms = sorted({term for poem in poems for term in IMAGERY_TERMS if term in poem["full_text"]})
    for term in matched_terms:
        category, definition = IMAGERY_TERMS[term]
        imagery_id = stable_id("img", f"imagery:{term}")
        imagery_ids[term] = imagery_id
        imagery.append({
            "imagery_id": imagery_id,
            "canonical_name": term,
            "category": category,
            "definition": definition + "；词面命中后仍需人工核对语境。",
            "source_id": source_id,
            "source_locator": f"PROJECT_DIRECTION_TANG_POETRY.md; 初版意象类别词表; canonical_name={term}",
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": SNAPSHOT_AT,
            "updated_at": SNAPSHOT_AT,
            "notes": "machine_candidate=true; review_required=true",
        })

    poem_tags = []
    poem_imagery = []
    colors = []
    candidate_rows = []
    for poem in poems:
        legacy_id = poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0]
        poem_lines_for_poem = sorted(poem_lines[poem["poem_id"]], key=lambda row: int(row["line_no"]))
        for theme, evidence_terms in THEMES[legacy_id].items():
            found = [term for term in evidence_terms if term in poem["title"] or term in poem["full_text"]]
            evidence = "、".join(found) or "题名/文本主题候选"
            target_id = stable_id("ptag", f"{poem['poem_id']}:{theme}")
            poem_tags.append({
                "poem_tag_id": target_id,
                "tag_id": tag_ids[theme],
                "poem_id": poem["poem_id"],
                "scope": "poem",
                "start_line_id": "",
                "end_line_id": "",
                "start_offset": "",
                "end_offset": "",
                "quote": "",
                "explanation": f"规则候选：命中“{evidence}”；主题边界和主次关系待人工复核。",
                "confidence": "0.55",
                "source_id": poem["source_id"],
                "source_locator": f"{poem['source_locator']}; legacy_work_id={legacy_id}; rule=theme_keyword_v1",
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": "machine_candidate=true; review_required=true",
            })
            candidate_rows.append({
                "candidate_id": target_id,
                "candidate_type": "theme",
                "poem_id": poem["poem_id"],
                "legacy_work_id": legacy_id,
                "value": theme,
                "surface_form": evidence,
                "scope": "poem",
                "line_no": "",
                "start_offset": "",
                "end_offset": "",
                "quote": "",
                "rule_id": "theme_keyword_v1",
                "confidence": "0.55",
                "status": "pending_human_review",
                "source_locator": f"legacy_work_id={legacy_id}; rule=theme_keyword_v1",
                "notes": "候选标签，不是人工终审结论",
            })

        for line in poem_lines_for_poem:
            line_text = line["line_text"]
            for term in matched_terms:
                if term not in line_text:
                    continue
                for start in occurrences(line_text, term):
                    end = start + len(term)
                    target_id = stable_id("pimg", f"{poem['poem_id']}:{line['line_no']}:{start}:{term}")
                    poem_imagery.append({
                        "poem_imagery_id": target_id,
                        "imagery_id": imagery_ids[term],
                        "poem_id": poem["poem_id"],
                        "scope": "span",
                        "start_line_id": line["line_id"],
                        "end_line_id": line["line_id"],
                        "start_offset": str(start),
                        "end_offset": str(end),
                        "quote": term,
                        "explanation": "规则候选：词面命中；具体语境义待人工复核。",
                        "confidence": "0.65",
                        "surface_form": term,
                        "contextual_meaning": "",
                        "source_id": poem["source_id"],
                        "source_locator": f"{line['source_locator']}; rule=imagery_lexicon_v1",
                        "review_status": "pending",
                        "created_by": CREATED_BY,
                        "created_at": SNAPSHOT_AT,
                        "updated_at": SNAPSHOT_AT,
                        "notes": "machine_candidate=true; review_required=true",
                    })
                    candidate_rows.append({
                        "candidate_id": target_id,
                        "candidate_type": "imagery",
                        "poem_id": poem["poem_id"],
                        "legacy_work_id": legacy_id,
                        "value": term,
                        "surface_form": term,
                        "scope": "span",
                        "line_no": line["line_no"],
                        "start_offset": str(start),
                        "end_offset": str(end),
                        "quote": term,
                        "rule_id": "imagery_lexicon_v1",
                        "confidence": "0.65",
                        "status": "pending_human_review",
                        "source_locator": f"legacy_work_id={legacy_id}; line_no={line['line_no']}; rule=imagery_lexicon_v1",
                        "notes": "候选意象，不是人工终审结论",
                    })

            for term, normalized_color in COLOR_TERMS.items():
                for start in occurrences(line_text, term):
                    end = start + len(term)
                    target_id = stable_id("color", f"{poem['poem_id']}:{line['line_no']}:{start}:{term}")
                    colors.append({
                        "color_occurrence_id": target_id,
                        "poem_id": poem["poem_id"],
                        "scope": "span",
                        "start_line_id": line["line_id"],
                        "end_line_id": line["line_id"],
                        "start_offset": str(start),
                        "end_offset": str(end),
                        "quote": term,
                        "explanation": "规则候选：颜色词面命中；字面、借代或专名用法待人工复核。",
                        "confidence": "0.60",
                        "color_term": term,
                        "normalized_color": normalized_color,
                        "color_hex": "",
                        "usage_type": "ambiguous",
                        "mapping_basis": "",
                        "source_id": poem["source_id"],
                        "source_locator": f"{line['source_locator']}; rule=color_lexicon_v1",
                        "review_status": "pending",
                        "created_by": CREATED_BY,
                        "created_at": SNAPSHOT_AT,
                        "updated_at": SNAPSHOT_AT,
                        "notes": "machine_candidate=true; review_required=true",
                    })
                    candidate_rows.append({
                        "candidate_id": target_id,
                        "candidate_type": "color",
                        "poem_id": poem["poem_id"],
                        "legacy_work_id": legacy_id,
                        "value": normalized_color,
                        "surface_form": term,
                        "scope": "span",
                        "line_no": line["line_no"],
                        "start_offset": str(start),
                        "end_offset": str(end),
                        "quote": term,
                        "rule_id": "color_lexicon_v1",
                        "confidence": "0.60",
                        "status": "pending_human_review",
                        "source_locator": f"legacy_work_id={legacy_id}; line_no={line['line_no']}; rule=color_lexicon_v1",
                        "notes": "候选颜色词，不是人工终审结论",
                    })

    write_csv(data_dir / "sources.csv", list(sources[0]), sources)
    write_csv(data_dir / "tags.csv", list(tags[0]), tags)
    write_csv(data_dir / "poem_tags.csv", list(poem_tags[0]), poem_tags)
    write_csv(data_dir / "imagery.csv", list(imagery[0]), imagery)
    write_csv(data_dir / "poem_imagery.csv", list(poem_imagery[0]), poem_imagery)
    write_csv(data_dir / "color_occurrences.csv", list(colors[0]), colors)
    write_csv(
        report_path,
        [
            "candidate_id", "candidate_type", "poem_id", "legacy_work_id", "value",
            "surface_form", "scope", "line_no", "start_offset", "end_offset", "quote",
            "rule_id", "confidence", "status", "source_locator", "notes",
        ],
        candidate_rows,
    )
    print(
        f"sources={len(sources)} tags={len(tags)} poem_tags={len(poem_tags)} "
        f"imagery={len(imagery)} poem_imagery={len(poem_imagery)} "
        f"colors={len(colors)} candidates={len(candidate_rows)}"
    )


if __name__ == "__main__":
    main()

"""Append ten traceable early-Tang sample poems.

The records are selected from the local Chinese Poetry upstream snapshot.  The
snapshot is used as a structured discovery/text candidate source; display text
is converted to simplified Chinese while the raw source text is written to an
audit report.  This script deliberately leaves new records in ``pending``
status so that the project does not mistake a deterministic import for expert
or rights clearance.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path

from opencc import OpenCC


NAMESPACE = uuid.UUID("beaf56ae-642d-4d8b-93d2-bf6fcfd7b7a9")
CREATED_BY = "early_tang_import_v1"
NOW = "2026-10-17T20:00:00+08:00"
SOURCE_ID = f"src_{uuid.uuid5(NAMESPACE, 'source:chinese-poetry-early-tang')}"
CONVERTER = OpenCC("t2s")


RECORDS = [
    {
        "record_id": "fe6f4b72-855c-43b9-8883-8b3fe3cd8bd4",
        "file": "poet.tang.3000.json",
        "form": "五言律诗",
        "yuefu": "非乐府",
        "themes": ["送别", "人生感怀"],
        "imagery": ["城"],
        "technique": ("对比", "海内存知己，", "以空间对举强化离别中的知己情谊。"),
        "technique_effect": "以海内与天涯的空间对举扩展送别诗的情感尺度。",
    },
    {
        "record_id": "b3d9312f-1c3b-4234-b66e-1163a08c82fa",
        "file": "poet.tang.3000.json",
        "form": "七言绝句",
        "yuefu": "非乐府",
        "themes": ["思乡怀人", "羁旅"],
        "imagery": ["日", "雁"],
        "technique": ("对比", "他席他乡送客杯，", "把异乡宴饮与望乡情绪并置，形成对照。"),
        "technique_effect": "通过他乡与故乡的对照表现羁旅中的思乡。",
    },
    {
        "record_id": "c989738d-cb18-4f0d-a353-56e6bc3a3ab3",
        "file": "poet.tang.3000.json",
        "form": "五言律诗",
        "yuefu": "乐府",
        "themes": ["边塞征战", "政治讽喻"],
        "imagery": ["火", "雪", "旗", "龙"],
        "technique": ("对比", "宁为百夫长，", "以百夫长与一介书生的身份选择形成对举。"),
        "technique_effect": "用身份选择的对照表达投笔从戎的价值取向。",
    },
    {
        "record_id": "cc9a6bbc-8a05-4c89-a41c-74c271b6065b",
        "file": "poet.tang.4000.json",
        "form": "五言绝句",
        "yuefu": "非乐府",
        "themes": ["送别", "咏史怀古"],
        "imagery": ["水"],
        "technique": ("用典", "此地别燕丹，", "借荆轲易水送别的历史典故写今日送行。"),
        "technique_effect": "以易水、燕丹和壮士典故压缩历史记忆，提升送别的悲壮感。",
    },
    {
        "record_id": "bf4ce5bb-7a29-4b33-b8c6-55a020394ab8",
        "file": "poet.tang.5000.json",
        "form": "七言绝句",
        "yuefu": "非乐府",
        "themes": ["咏物"],
        "imagery": ["柳", "风"],
        "technique": ("比喻", "二月春风似剪刀。", "把春风比作剪刀，解释柳叶形态的生成。"),
        "technique_effect": "以新鲜比喻把无形春风转化为可感的裁剪动作。",
    },
    {
        "record_id": "599b8a93-47ab-4426-94c0-ca16eea0ca37",
        "file": "poet.tang.5000.json",
        "form": "七言绝句",
        "yuefu": "非乐府",
        "themes": ["思乡怀人", "人生感怀"],
        "imagery": [],
        "technique": ("对比", "少小离家老大回，", "以少小与老大、离家与归来形成时间与空间对照。"),
        "technique_effect": "用人生阶段的对照浓缩久别还乡的身份变化。",
    },
    {
        "record_id": "587422bf-52ac-4755-97fc-1b22ad6ae626",
        "file": "poet.tang.5000.json",
        "form": "七言古诗",
        "yuefu": "乐府",
        "themes": ["山水田园", "思乡怀人"],
        "imagery": ["江", "月", "花", "云", "雁"],
        "technique": ("比喻", "月照花林皆似霰。", "以霰喻月光照花林的细密光泽。"),
        "technique_effect": "借比喻将月光、花林与霰的视觉质感连成一体。",
    },
    {
        "record_id": "b881b056-6d92-45e8-9620-4710a375776f",
        "file": "poet.tang.3000.json",
        "form": "五言律诗",
        "yuefu": "非乐府",
        "themes": ["山水田园", "思乡怀人"],
        "imagery": ["云", "春", "鸟", "江"],
        "technique": ("借景抒情", "忽闻歌古调，", "由春日景物转入闻歌后的归思。"),
        "technique_effect": "以春景和歌声触发归思，完成由景入情的转折。",
    },
    {
        "record_id": "c244a5b4-0ed0-48fe-8694-95309acac184",
        "file": "poet.tang.4000.json",
        "form": "七言古诗",
        "yuefu": "非乐府",
        "themes": ["咏史怀古", "人生感怀"],
        "imagery": ["天"],
        "technique": ("对比", "前不见古人，", "以向前与向后、古人与来者的双重缺席构成对照。"),
        "technique_effect": "用时间纵深的对照表现登临者的孤独与历史感。",
    },
    {
        "record_id": "463e1ff1-7a19-4fe0-a5c5-51908a0762a7",
        "file": "poet.tang.3000.json",
        "form": "五言绝句",
        "yuefu": "非乐府",
        "themes": ["思乡怀人", "羁旅"],
        "imagery": ["江", "风", "山"],
        "technique": ("借景抒情", "山山黄叶飞。", "以高风、黄叶和群山的秋景收束全诗，触发羁旅归思。"),
        "technique_effect": "借萧瑟秋景写身在异乡的滞留与思归。",
    },
]

POET_META = {
    "王勃": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
    "杨炯": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
    "骆宾王": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
    "贺知章": "初唐至盛唐之际诗人；本批按项目分期规则归入初唐样本。",
    "张若虚": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
    "杜审言": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
    "陈子昂": "初唐诗人；本次仅确认作者与初唐分期，未把生卒年写入作品断代。",
}


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, f'{prefix}:{key}') }"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fields = list(rows[0]) if rows else []
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def simplify(value: str) -> str:
    return CONVERTER.convert(value.replace("\r\n", "\n").replace("\r", "\n"))


def split_lines(value: str) -> list[str]:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        current: list[str] = []
        for char in paragraph.strip():
            current.append(char)
            if char in "，。！？；":
                lines.append("".join(current))
                current = []
        if current:
            lines.append("".join(current))
    return [line for line in lines if line]


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_records(root: Path) -> dict[str, dict[str, object]]:
    source_root = root.parent / "database" / "data" / "chinese-poetry-upstream" / "全唐诗"
    records: dict[str, dict[str, object]] = {}
    for item in RECORDS:
        path = source_root / item["file"]
        if not path.exists():
            raise FileNotFoundError(path)
        for record in json.loads(path.read_text(encoding="utf-8")):
            if record.get("id") == item["record_id"]:
                records[item["record_id"]] = {**item, "record": record}
                break
        else:
            raise ValueError(f"source record not found: {item['record_id']}")
    return records


def append_rows(root: Path) -> None:
    data = root / "data"
    poems = read_csv(data / "poems.csv")
    lines = read_csv(data / "poem_lines.csv")
    poets = read_csv(data / "poets.csv")
    sources = read_csv(data / "sources.csv")
    poem_tags = read_csv(data / "poem_tags.csv")
    imagery = read_csv(data / "imagery.csv")
    poem_imagery = read_csv(data / "poem_imagery.csv")
    colors = read_csv(data / "color_occurrences.csv")
    techniques = read_csv(data / "technique_annotations.csv")
    prosody = read_csv(data / "prosody_annotations.csv")

    if len(poems) < 150 or len(poems) > 160:
        raise RuntimeError(f"expected a 150-160-poem early-Tang import window, got {len(poems)}")

    source_locator_base = "Chinese Poetry upstream snapshot; 全唐诗/{file}; record_id={record_id}"
    if not any(row["source_id"] == SOURCE_ID for row in sources):
        sources.append({
            "source_id": SOURCE_ID,
            "source_type": "database",
            "title": "Chinese Poetry《全唐诗》初唐候选记录",
            "creator": "Chinese Poetry contributors",
            "publisher": "Chinese Poetry GitHub",
            "edition": "local upstream snapshot",
            "publication_date": "",
            "url": "https://github.com/chinese-poetry/chinese-poetry/tree/master/全唐诗",
            "accessed_on": "2026-10-17",
            "rights": "仓库 LICENSE 标注 MIT；仅确认仓库许可，不替代底本文本/整理层逐条权利核验",
            "bibliographic_note": "本批只导入原始诗句候选，不复制现代注释、译文或网站赏析；公开发布前须保留归属并完成权利复核。",
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": NOW,
            "updated_at": NOW,
            "notes": "license_scope=repository; text_rights_status=needs_per_record_review; display_script=simplified; period_policy=初唐",
        })

    records = load_records(root)
    existing_poets = {row["name"]: row["poet_id"] for row in poets}
    tag_ids = {row["tag_name"]: row["tag_id"] for row in read_csv(data / "tags.csv")}
    imagery_ids = {row["canonical_name"]: row["imagery_id"] for row in imagery}

    for item in RECORDS:
        record = records[item["record_id"]]
        raw_text = "\n".join(str(p) for p in record["record"]["paragraphs"])
        title = simplify(str(record["record"]["title"]))
        author = simplify(str(record["record"]["author"]))
        display_text = simplify(raw_text)
        poem_id = stable_id("poem", item["record_id"])
        poet_id = existing_poets.get(author, stable_id("poet", author))
        locator = source_locator_base.format(file=item["file"], record_id=item["record_id"])
        if any(row["poem_id"] == poem_id for row in poems):
            continue

        if author not in existing_poets:
            poets.append({
                "poet_id": poet_id,
                "name": author,
                "courtesy_name": "",
                "art_name": "",
                "birth_year": "",
                "death_year": "",
                "birthplace_id": "",
                "biography": POET_META[author],
                "attribution_notes": "本批只补作者归属和分期；生卒年、籍贯与完整生平另行核考。",
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "early_tang_sample=true; biography_dates_not_used_for_poem_dating=true",
            })
            existing_poets[author] = poet_id

        display_lines = split_lines(display_text)
        poems.append({
            "poem_id": poem_id,
            "title": title,
            "poet_id": poet_id,
            "poetic_form": item["form"],
            "yuefu_type": item["yuefu"],
            "period": "初唐",
            "year_start": "",
            "year_end": "",
            "dating_basis": "项目统一四期口径；按作者与文学史常用分期归入初唐；不主张作品专属年份。",
            "full_text": "\n".join(display_lines),
            "variant_notes": "底本为 Chinese Poetry 结构化记录；source_script=繁体；display_script=简体；normalization=opencc_t2s_v1；原始文本与哈希见 reports/tang_poem_early_tang_text_audit_v1.csv；未复制现代注释。",
            "source_id": SOURCE_ID,
            "source_locator": locator,
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": NOW,
            "updated_at": NOW,
            "notes": "early_tang_sample=true; period_only_dating=true; feature_annotations=initial_candidates",
        })

        line_map: dict[str, dict[str, str]] = {}
        for line_no, line_text in enumerate(display_lines, 1):
            line_id = stable_id("line", f"{poem_id}:{line_no}")
            line_map[line_text] = {"line_id": line_id, "line_no": str(line_no)}
            lines.append({
                "line_id": line_id,
                "poem_id": poem_id,
                "line_no": str(line_no),
                "couplet_no": str((line_no + 1) // 2),
                "line_text": line_text,
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "sentence_split=punctuation_split_v1; source_text_hash=" + sha256(raw_text),
            })

        for theme in item["themes"]:
            poem_tags.append({
                "poem_tag_id": stable_id("ptag", f"{poem_id}:theme:{theme}"),
                "tag_id": tag_ids[theme],
                "poem_id": poem_id,
                "scope": "poem",
                "start_line_id": "",
                "end_line_id": "",
                "start_offset": "",
                "end_offset": "",
                "quote": "",
                "explanation": "初唐样本首轮项目标签；依据题名、文本语义与传统题材线索，作为统计候选而非文学史定论。",
                "confidence": "0.75",
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "initial_candidate=true; human_review_not_required_for_internal_prototype=true",
            })

        for term in item["imagery"]:
            if term not in imagery_ids:
                continue
            found = next(((line, line.find(term)) for line in display_lines if term in line), None)
            if not found:
                continue
            line_text, offset = found
            line_id = line_map[line_text]["line_id"]
            poem_imagery.append({
                "poem_imagery_id": stable_id("pimg", f"{poem_id}:imagery:{term}"),
                "imagery_id": imagery_ids[term],
                "poem_id": poem_id,
                "scope": "span",
                "start_line_id": line_id,
                "end_line_id": line_id,
                "start_offset": str(offset),
                "end_offset": str(offset + len(term)),
                "quote": term,
                "explanation": "词面命中；本批先作为可定位的意象候选，语境主次关系留待后续复核。",
                "confidence": "0.75",
                "surface_form": term,
                "contextual_meaning": "",
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "initial_candidate=true; lexical_match=true",
            })

        for color_term, normalized, color_hex in (
            ("白", "白色", "#F4F1E8"),
            ("黄", "黄色", "#C99A2E"),
            ("青", "青色", "#4F7D8A"),
            ("碧", "青色", "#4F7D8A"),
            ("绿", "绿色", "#4F7D5A"),
        ):
            found = next(((line, line.find(color_term)) for line in display_lines if color_term in line), None)
            if not found:
                continue
            line_text, offset = found
            line_id = line_map[line_text]["line_id"]
            colors.append({
                "color_occurrence_id": stable_id("color", f"{poem_id}:color:{color_term}"),
                "poem_id": poem_id,
                "scope": "span",
                "start_line_id": line_id,
                "end_line_id": line_id,
                "start_offset": str(offset),
                "end_offset": str(offset + len(color_term)),
                "quote": color_term,
                "explanation": "颜色词面命中；归类和色值仅用于可视化映射，不等同唐代实测色彩。",
                "confidence": "0.75",
                "color_term": color_term,
                "normalized_color": normalized,
                "color_hex": color_hex,
                "usage_type": "literal",
                "mapping_basis": "项目展示调色板 v1；近似映射，不代表历史颜料测量。",
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "initial_candidate=true; color_mapping_is_visual_only=true",
            })

        technique_name, phrase, explanation = item["technique"]
        technique_line = next((line for line in display_lines if phrase in line), None)
        if technique_line is not None:
            line_id = line_map[technique_line]["line_id"]
            techniques.append({
                "technique_annotation_id": stable_id("tech", f"{poem_id}:technique:{technique_name}"),
                "technique_tag_id": tag_ids[technique_name],
                "poem_id": poem_id,
                "scope": "line",
                "start_line_id": line_id,
                "end_line_id": line_id,
                "start_offset": "",
                "end_offset": "",
                "quote": technique_line,
                "explanation": explanation,
                "confidence": "0.80",
                "effect": item["technique_effect"],
                "source_id": SOURCE_ID,
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "initial_candidate=true; explanation_is_project_annotation=true",
            })

        prosody.append({
            "prosody_annotation_id": stable_id("pros", poem_id),
            "poem_id": poem_id,
            "scope": "poem",
            "start_line_id": "",
            "end_line_id": "",
            "start_offset": "",
            "end_offset": "",
            "quote": "",
            "explanation": "依据分句数量与每句字数记录诗体候选；未据普通话声调推断唐代平仄。",
            "confidence": "0.85",
            "annotation_type": "meter",
            "pattern": f"{item['form']}；{len(display_lines)}句",
            "rhyme_system": "",
            "rhyme_group": "",
            "reading_note": "仅作结构候选，韵部与平仄待专门校勘。",
            "source_id": SOURCE_ID,
            "source_locator": locator,
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": NOW,
            "updated_at": NOW,
            "notes": "initial_candidate=true; no_tone_inference=true",
        })

        audit_path = root / "reports" / "tang_poem_early_tang_text_audit_v1.csv"
        if not audit_path.exists():
            audit_path.parent.mkdir(exist_ok=True)
            with audit_path.open("w", encoding="utf-8-sig", newline="") as handle:
                csv.DictWriter(handle, fieldnames=["poem_id", "title", "author", "record_id", "source_file", "source_sha256", "display_sha256", "source_text", "display_text", "normalizer", "status"]).writeheader()
        with audit_path.open("a", encoding="utf-8-sig", newline="") as handle:
            csv.DictWriter(handle, fieldnames=["poem_id", "title", "author", "record_id", "source_file", "source_sha256", "display_sha256", "source_text", "display_text", "normalizer", "status"]).writerow({
                "poem_id": poem_id,
                "title": title,
                "author": author,
                "record_id": item["record_id"],
                "source_file": item["file"],
                "source_sha256": sha256(raw_text),
                "display_sha256": sha256("\n".join(display_lines)),
                "source_text": raw_text,
                "display_text": "\n".join(display_lines),
                "normalizer": "opencc_t2s_v1+punctuation_split_v1",
                "status": "imported_pending_source_and_text_review",
            })

    for filename, rows in (
        ("poems.csv", poems), ("poem_lines.csv", lines), ("poets.csv", poets),
        ("sources.csv", sources), ("poem_tags.csv", poem_tags),
        ("poem_imagery.csv", poem_imagery), ("color_occurrences.csv", colors),
        ("technique_annotations.csv", techniques), ("prosody_annotations.csv", prosody),
    ):
        write_csv(data / filename, rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    append_rows(args.root.resolve())
    print("added 10 early-Tang poems")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Expand the Tang-poem pilot from 20 to 150 traceable base-corpus records.

The script appends 110 works from the reviewed legacy SQLite corpus and 20
selected works from the local Chinese Poetry Tang-300 snapshot. It keeps raw
source text in an audit CSV and writes simplified Chinese only to the display
layer. It intentionally does not invent tags, imagery, colours, dates, forms,
or literary interpretations for the new records.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import shutil
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from opencc import OpenCC


NAMESPACE = uuid.UUID("7dfb0a13-2f1d-4f7f-a8be-93fa36fd3e9a")
CREATED_BY = "corpus_expansion_v1"
SNAPSHOT_AT = "2026-10-16T00:00:00+08:00"
DISPLAY_CONVERTER = "opencc_t2s_v1"
TARGET_COUNT = 150

# These are deliberately explicit, so a future upstream reorder cannot silently
# change the research sample.
TANG300_IDS = [
    "e5e5f969-ddac-4491-9cfe-d77742e1416d",  # 李白 将进酒
    "3c1693fc-f4e6-43b7-a66f-6379c3a26eef",  # 李白 长相思
    "809ad73b-9a8e-436e-9874-f9295b624af0",  # 李白 金陵酒肆留别
    "59c7eaa9-3c05-4857-8cff-10376706ccb9",  # 杜甫 月夜
    "2c036362-9f1d-434c-854f-b97a2a4bb19b",  # 杜甫 天末忆李白
    "31cc87f3-da0f-421d-8674-8753530077e2",  # 王维 送别
    "a0576d39-c4ac-4608-a4e2-249b6c31fd1d",  # 王维 青溪
    "0d2c5fba-d350-4c3f-b55e-72a491a84df6",  # 李商隐 韩碑
    "fb376b71-91c6-44ee-b2e4-40f5b3f71b8f",  # 李商隐 寄令狐郎中
    "24ca9268-9cbd-423b-b423-12e1a9aa9041",  # 杜牧 将赴吴兴登乐游原一绝
    "54008cd0-f9bf-424f-bc55-f15c1e9025f3",  # 杜牧 赠别二首·其一
    "57203d7f-380c-4052-b21b-d1ea79fbe231",  # 李白 子夜吴歌·春歌
    "cc0e7ac3-bde4-4491-8ae5-027106709e72",  # 孟浩然 夜归鹿门山歌
    "0613f575-4f07-4326-8591-603fb3d1da45",  # 孟浩然 秦中感秋寄远上人
    "1b6f2389-2d09-4d51-982a-e7efb35113c5",  # 王昌龄 长信怨·其二
    "2779f710-4ab4-46cb-a2b6-1889752f26c2",  # 岑参 寄左省杜拾遗
    "8df8e94b-ffe4-4930-af4c-491d7cb04651",  # 岑参 奉和中书舍人贾至早朝大明宫
    "41d292d2-b752-4c30-8b6b-7b7380f2f9bd",  # 刘长卿 赋得
    "5b3a5651-2a80-4fb1-b1bf-c9fb5ec38905",  # 韦应物 初发扬子寄元大校书
    "a5b1f5c9-1ba7-4533-b497-55b1d4af1bbb",  # 王维 终南山
]

POEM_FIELDS = [
    "poem_id", "title", "poet_id", "poetic_form", "yuefu_type", "period",
    "year_start", "year_end", "dating_basis", "full_text", "variant_notes",
    "source_id", "source_locator", "review_status", "created_by", "created_at",
    "updated_at", "notes",
]
LINE_FIELDS = [
    "line_id", "poem_id", "line_no", "couplet_no", "line_text", "source_id",
    "source_locator", "review_status", "created_by", "created_at", "updated_at",
    "notes",
]
POET_FIELDS = [
    "poet_id", "name", "courtesy_name", "art_name", "birth_year", "death_year",
    "birthplace_id", "biography", "attribution_notes", "source_id", "source_locator",
    "review_status", "created_by", "created_at", "updated_at", "notes",
]
SOURCE_FIELDS = [
    "source_id", "source_type", "title", "creator", "publisher", "edition",
    "publication_date", "url", "accessed_on", "rights", "bibliographic_note",
    "review_status", "created_by", "created_at", "updated_at", "notes",
]


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def clean_raw_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(part.strip() for part in value.split("\n") if part.strip())


def split_display_sentences(value: str) -> list[str]:
    """Split at the project-approved punctuation while retaining punctuation."""
    sentences: list[str] = []
    for source_line in clean_raw_text(value).split("\n"):
        current: list[str] = []
        for char in source_line:
            current.append(char)
            if char in "，。！？；":
                sentences.append("".join(current))
                current = []
        if current:
            sentences.append("".join(current))
    return [sentence for sentence in sentences if sentence]


def changed_count(before: str, after: str) -> int:
    return sum(a != b for a, b in zip(before, after)) + abs(len(before) - len(after))


def simplify(converter: OpenCC, value: str) -> str:
    """Run OpenCC to a fixed point for ambiguous character contexts."""
    for _ in range(3):
        normalized = converter.convert(value)
        if normalized == value:
            return value
        value = normalized
    return value


def source_title(url: str) -> str:
    lowered = url.lower()
    if "chinese-poetry" in lowered:
        return "Chinese Poetry 结构化记录"
    if "wikisource.org" in lowered:
        return "维基文库具体作品页"
    if "pep.com.cn" in lowered:
        return "人民教育出版社公开页面"
    if "people.com.cn" in lowered:
        return "人民网公开页面"
    if "ykt.cbern.com.cn" in lowered:
        return "国家中小学智慧教育平台公开文档"
    return "旧库选定文本来源"


def source_type(url: str) -> str:
    if "github.com/chinese-poetry" in url.lower():
        return "database"
    return "web"


def ensure_schema_headers(data_dir: Path) -> None:
    expected = {
        "poems.csv": POEM_FIELDS,
        "poem_lines.csv": LINE_FIELDS,
        "poets.csv": POET_FIELDS,
        "sources.csv": SOURCE_FIELDS,
    }
    for filename, fields in expected.items():
        rows = read_csv(data_dir / filename)
        with (data_dir / filename).open("r", encoding="utf-8-sig", newline="") as handle:
            actual = csv.DictReader(handle).fieldnames
        if actual != fields:
            raise ValueError(f"unexpected header in {filename}: {actual}")
        if not rows:
            raise ValueError(f"cannot expand empty {filename}")


def backup_targets(root: Path) -> Path:
    backup = root / "reports" / "tang_poem_expansion_backup_v1"
    if backup.exists():
        raise RuntimeError(f"refusing to overwrite existing backup: {backup}")
    backup.mkdir(parents=True)
    for filename in ("poems.csv", "poem_lines.csv", "poets.csv", "sources.csv"):
        shutil.copy2(root / "data" / filename, backup / filename)
    return backup


def load_legacy(db_path: Path, existing_work_ids: set[str]) -> list[dict[str, object]]:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            "SELECT * FROM works WHERE genre='诗' ORDER BY CAST(SUBSTR(work_id, 2) AS INTEGER)"
        ).fetchall()
        selected = [dict(row) for row in rows if row["work_id"] not in existing_work_ids]
        if len(selected) != 110:
            raise ValueError(f"legacy expansion expected 110 works, got {len(selected)}")
        author_rows = {
            row["author_id"]: dict(row)
            for row in connection.execute("SELECT * FROM authors")
        }
        for row in selected:
            if row["author_id"] not in author_rows:
                raise ValueError(f"missing legacy author {row['author_id']}")
            row["legacy_author"] = author_rows[row["author_id"]]
        return selected
    finally:
        connection.close()


def load_tang300(path: Path, existing_text_keys: set[tuple[str, str]]) -> list[dict[str, object]]:
    import json

    records = json.loads(path.read_text(encoding="utf-8"))
    by_id = {record["id"]: record for record in records}
    if set(TANG300_IDS) - set(by_id):
        missing = sorted(set(TANG300_IDS) - set(by_id))
        raise ValueError(f"selected Tang-300 records missing: {missing}")
    converter = OpenCC("t2s")
    selected: list[dict[str, object]] = []
    seen_ids: set[str] = set()
    for record_id in TANG300_IDS:
        record = by_id[record_id]
        raw_text = "\n".join(record["paragraphs"])
        title = simplify(converter, record["title"])
        display_text = simplify(converter, clean_raw_text(raw_text))
        key = (title, re.sub(r"[\s\n，。！？；：、·]", "", display_text))
        if key in existing_text_keys:
            raise ValueError(f"selected Tang-300 record duplicates existing text: {record_id}")
        if record_id in seen_ids:
            raise ValueError(f"duplicate Tang-300 record: {record_id}")
        seen_ids.add(record_id)
        selected.append({
            "record": record,
            "raw_text": raw_text,
            "title": title,
            "display_text": display_text,
            "key": key,
        })
    return selected


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--legacy-db", type=Path, required=True)
    parser.add_argument("--tang300", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    ensure_schema_headers(data_dir)
    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    poets = read_csv(data_dir / "poets.csv")
    sources = read_csv(data_dir / "sources.csv")
    if len(poems) != 20:
        raise RuntimeError(f"expansion is intentionally one-shot from 20 poems; found {len(poems)}")
    if len({row["poem_id"] for row in poems}) != len(poems):
        raise ValueError("existing poems contain duplicate IDs")

    existing_work_ids = {
        part.split(";", 1)[0]
        for row in poems
        for part in row["variant_notes"].split("legacy_work_id=", 1)[1:]
    }
    existing_work_ids = {item.split(";", 1)[0] for item in existing_work_ids}
    if len(existing_work_ids) != 20:
        raise ValueError("could not recover exactly 20 legacy work IDs")

    converter = OpenCC("t2s")
    existing_text_keys = {
        (
            simplify(converter, row["title"]),
            re.sub(r"[\s\n，。！？；：、·]", "", simplify(converter, row["full_text"])),
        )
        for row in poems
    }
    legacy_rows = load_legacy(args.legacy_db.resolve(), existing_work_ids)
    for row in legacy_rows:
        key = (
            simplify(converter, row["title"]),
            re.sub(r"[\s\n，。！？；：、·]", "", simplify(converter, row["canonical_text"])),
        )
        if key in existing_text_keys:
            raise ValueError(f"legacy record duplicates existing display text: {row['work_id']}")
        existing_text_keys.add(key)
    tang_rows = load_tang300(args.tang300.resolve(), existing_text_keys)
    if len(legacy_rows) + len(tang_rows) != 130:
        raise AssertionError("expansion batch must contain 130 records")

    poet_by_legacy = {}
    poet_by_name = {row["name"]: row for row in poets}
    for row in poets:
        for part in row["attribution_notes"].split(";"):
            if part.startswith("legacy_author_id="):
                poet_by_legacy[part.split("=", 1)[1]] = row
    source_by_url = {row["url"]: row for row in sources}
    new_sources: list[dict[str, str]] = []
    new_poems: list[dict[str, str]] = []
    new_lines: list[dict[str, str]] = []
    manifest: list[dict[str, str]] = []
    audit: list[dict[str, str]] = []
    id_map: list[dict[str, str]] = []
    seen_poem_ids = {row["poem_id"] for row in poems}
    seen_line_ids = {row["line_id"] for row in lines}

    def ensure_source(url: str, accessed_on: str, source_note: str) -> str:
        if url in source_by_url:
            return source_by_url[url]["source_id"]
        source_id = stable_id("src", f"canonical-url:{url}")
        row = {
            "source_id": source_id,
            "source_type": source_type(url),
            "title": source_title(url),
            "creator": "",
            "publisher": "",
            "edition": "",
            "publication_date": "",
            "url": url,
            "accessed_on": accessed_on or "",
            "rights": "待逐篇复核；旧库 rights_status=公共领域原作",
            "bibliographic_note": "由旧库选定文本来源建立；不替代逐篇文本与权利核验",
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": SNAPSHOT_AT,
            "updated_at": SNAPSHOT_AT,
            "notes": source_note,
        }
        source_by_url[url] = row
        new_sources.append(row)
        return source_id

    tang_url = "https://github.com/chinese-poetry/chinese-poetry/blob/master/全唐诗/唐诗三百首.json"
    tang_sha = sha256(args.tang300.resolve().read_bytes().decode("utf-8"))
    tang_source_id = stable_id("src", "tang300-snapshot:全唐诗/唐诗三百首.json")
    if tang_url not in source_by_url:
        tang_source = {
            "source_id": tang_source_id,
            "source_type": "database",
            "title": "Chinese Poetry《唐诗三百首》JSON快照",
            "creator": "Chinese Poetry contributors",
            "publisher": "Chinese Poetry GitHub",
            "edition": "repository snapshot",
            "publication_date": "",
            "url": tang_url,
            "accessed_on": "2026-10-16",
            "rights": "MIT License；底层文本逐篇复核中",
            "bibliographic_note": "本地快照仅作为结构化候选来源，不能替代版本校勘",
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": SNAPSHOT_AT,
            "updated_at": SNAPSHOT_AT,
            "notes": f"local_snapshot={args.tang300.resolve()}; snapshot_sha256={tang_sha}; selected_records=20",
        }
        source_by_url[tang_url] = tang_source
        new_sources.append(tang_source)
    else:
        tang_source_id = source_by_url[tang_url]["source_id"]

    def add_record(
        *, key_prefix: str, legacy_id: str, title_before: str, title: str,
        raw_text: str, display_text: str, poet_id: str, source_id: str,
        source_locator: str, dating_basis: str, source_script: str,
        selection_reason: str,
    ) -> None:
        poem_id = stable_id("poem", f"{key_prefix}:{legacy_id}")
        if poem_id in seen_poem_ids:
            raise ValueError(f"duplicate generated poem ID: {poem_id}")
        seen_poem_ids.add(poem_id)
        sentences = split_display_sentences(display_text)
        if not sentences:
            raise ValueError(f"empty display text: {legacy_id}")
        final_text = "\n".join(sentences)
        poem_notes = (
            "扩展至150首；展示层统一使用简体；原始底本文本保留在"
            "reports/tang_poem_expansion_text_audit_v1.csv；"
            "文学特征标签待单独标注"
        )
        variant_notes = "; ".join([
            f"corpus_source={key_prefix}",
            f"source_record_id={legacy_id}",
            f"source_script={source_script or '未声明'}",
            f"text_normalization={DISPLAY_CONVERTER}",
            "display_script=简体",
            "text_review_status=待人工复核",
            "canonical_review_status=待双人复核",
            "original_text_retained_in=reports/tang_poem_expansion_text_audit_v1.csv",
            "sentence_structure=punctuation_split_v1",
        ])
        new_poems.append({
            "poem_id": poem_id,
            "title": title,
            "poet_id": poet_id,
            "poetic_form": "待考",
            "yuefu_type": "待考",
            "period": "待考",
            "year_start": "",
            "year_end": "",
            "dating_basis": dating_basis,
            "full_text": final_text,
            "variant_notes": variant_notes,
            "source_id": source_id,
            "source_locator": source_locator,
            "review_status": "pending",
            "created_by": CREATED_BY,
            "created_at": SNAPSHOT_AT,
            "updated_at": SNAPSHOT_AT,
            "notes": poem_notes,
        })
        for line_no, sentence in enumerate(sentences, 1):
            line_id = stable_id("line", f"{key_prefix}:{legacy_id}:line:{line_no}")
            if line_id in seen_line_ids:
                raise ValueError(f"duplicate generated line ID: {line_id}")
            seen_line_ids.add(line_id)
            new_lines.append({
                "line_id": line_id,
                "poem_id": poem_id,
                "line_no": str(line_no),
                "couplet_no": str((line_no + 1) // 2),
                "line_text": sentence,
                "source_id": source_id,
                "source_locator": f"{source_locator}; display_line_no={line_no}",
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": "按，。！？；切分为单句；待人工逐句核对",
            })
        manifest.append({
            "selection_order": str(len(manifest) + 1),
            "corpus_source": key_prefix,
            "source_record_id": legacy_id,
            "poem_id": poem_id,
            "poet_id": poet_id,
            "title": title,
            "title_before": title_before,
            "source_id": source_id,
            "source_locator": source_locator,
            "selection_reason": selection_reason,
            "display_normalizer": DISPLAY_CONVERTER,
            "review_status": "pending_text_review",
            "feature_annotation_status": "not_imported",
        })
        audit.append({
            "poem_id": poem_id,
            "corpus_source": key_prefix,
            "source_record_id": legacy_id,
            "title_before": title_before,
            "title_after": title,
            "original_sha256": sha256(raw_text),
            "normalized_sha256": sha256(final_text),
            "changed_char_count": str(changed_count(raw_text, final_text)),
            "source_text": raw_text,
            "normalized_text": final_text,
            "normalizer": DISPLAY_CONVERTER,
            "sentence_count": str(len(sentences)),
            "status": "display_only_pending_review",
        })
        id_map.append({
            "entity_type": "poem",
            "source_record_id": legacy_id,
            "new_id": poem_id,
            "corpus_source": key_prefix,
            "notes": "stable UUID5 mapping",
        })
        for line_no in range(1, len(sentences) + 1):
            id_map.append({
                "entity_type": "line",
                "source_record_id": f"{legacy_id}:{line_no}",
                "new_id": stable_id("line", f"{key_prefix}:{legacy_id}:line:{line_no}"),
                "corpus_source": key_prefix,
                "notes": "stable UUID5 mapping",
            })

    for row in legacy_rows:
        author = row["legacy_author"]
        poet = poet_by_legacy.get(row["author_id"])
        if poet is None:
            raise ValueError(f"legacy author not present in poets.csv: {row['author_id']}")
        source_id = ensure_source(
            row["canonical_source_url"],
            row["source_accessed_on"] or "",
            f"legacy_source_record={row['source_record_locator']}; legacy_work_id={row['work_id']}",
        )
        raw_text = clean_raw_text(row["canonical_text"])
        display_title = simplify(converter, row["title"])
        display_text = simplify(converter, raw_text)
        add_record(
            key_prefix="legacy-work",
            legacy_id=row["work_id"],
            title_before=row["title"],
            title=display_title,
            raw_text=raw_text,
            display_text=display_text,
            poet_id=poet["poet_id"],
            source_id=source_id,
            source_locator=f"legacy_work_id={row['work_id']}; source_record_locator={row['source_record_locator']}; canonical_source_url={row['canonical_source_url']}",
            dating_basis="旧库仅记录作者 period=唐代，未细分诗歌创作年代；年份保留空值",
            source_script=row["source_script"] or "未声明",
            selection_reason="补足旧库唐诗精选集至完整130首；原旧库记录保留来源定位",
        )

    for selected in tang_rows:
        record = selected["record"]
        author_name = simplify(converter, record["author"])
        poet = poet_by_name.get(author_name)
        if poet is None:
            raise ValueError(f"Tang-300 author not present in poets.csv: {author_name}")
        locator = f"file={args.tang300.resolve()}; record_index={next(i for i, r in enumerate(__import__('json').loads(args.tang300.read_text(encoding='utf-8'))) if r['id'] == record['id'])}; id={record['id']}"
        add_record(
            key_prefix="tang300",
            legacy_id=record["id"],
            title_before=record["title"],
            title=selected["title"],
            raw_text=selected["raw_text"],
            display_text=selected["display_text"],
            poet_id=poet["poet_id"],
            source_id=tang_source_id,
            source_locator=locator,
            dating_basis="唐诗三百首快照未提供可靠创作年份；年份保留空值，待文献核考",
            source_script="繁体",
            selection_reason="从本地唐诗三百首快照选取、与旧库文本去重后的补充样本",
        )

    all_poems = poems + new_poems
    all_lines = lines + new_lines
    all_sources = sources + new_sources
    if len(all_poems) != TARGET_COUNT:
        raise AssertionError(f"expected {TARGET_COUNT} poems, got {len(all_poems)}")
    if len({row["source_id"] for row in all_sources}) != len(all_sources):
        raise ValueError("duplicate source IDs after expansion")

    backup = backup_targets(root)
    write_csv(data_dir / "poems.csv", POEM_FIELDS, all_poems)
    write_csv(data_dir / "poem_lines.csv", LINE_FIELDS, all_lines)
    write_csv(data_dir / "sources.csv", SOURCE_FIELDS, all_sources)
    write_csv(reports_dir / "tang_poem_expansion_manifest_v1.csv", list(manifest[0]), manifest)
    write_csv(reports_dir / "tang_poem_expansion_text_audit_v1.csv", list(audit[0]), audit)
    write_csv(reports_dir / "tang_poem_expansion_id_map_v1.csv", list(id_map[0]), id_map)
    print(
        f"expanded poems={len(new_poems)} total_poems={len(all_poems)} "
        f"new_lines={len(new_lines)} total_lines={len(all_lines)} "
        f"new_sources={len(new_sources)} backup={backup}"
    )
    print(f"manifest={reports_dir / 'tang_poem_expansion_manifest_v1.csv'}")
    print(f"text_audit={reports_dir / 'tang_poem_expansion_text_audit_v1.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

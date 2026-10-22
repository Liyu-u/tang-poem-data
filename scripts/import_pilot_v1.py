import argparse
import csv
import hashlib
import sqlite3
import uuid
from pathlib import Path


SNAPSHOT_AT = "2026-10-16T00:00:00+08:00"
CREATED_BY = "migration_pilot_v1"
NAMESPACE = uuid.UUID("7dfb0a13-2f1d-4f7f-a8be-93fa36fd3e9a")

TABLE_FIELDS = {
    "sources.csv": [
        "source_id", "source_type", "title", "creator", "publisher", "edition",
        "publication_date", "url", "accessed_on", "rights", "bibliographic_note",
        "review_status", "created_by", "created_at", "updated_at", "notes",
    ],
    "poets.csv": [
        "poet_id", "name", "courtesy_name", "art_name", "birth_year", "death_year",
        "birthplace_id", "biography", "attribution_notes", "source_id", "source_locator",
        "review_status", "created_by", "created_at", "updated_at", "notes",
    ],
    "poems.csv": [
        "poem_id", "title", "poet_id", "poetic_form", "yuefu_type", "period",
        "year_start", "year_end", "dating_basis", "full_text", "variant_notes",
        "source_id", "source_locator", "review_status", "created_by", "created_at",
        "updated_at", "notes",
    ],
    "poem_lines.csv": [
        "line_id", "poem_id", "line_no", "couplet_no", "line_text", "source_id",
        "source_locator", "review_status", "created_by", "created_at", "updated_at",
        "notes",
    ],
}


def stable_id(prefix, key):
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path, fields, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def source_title(url):
    lowered = url.lower()
    if "chinese-poetry" in lowered:
        return "Chinese Poetry JSON 记录"
    if "wikisource.org" in lowered:
        return "维基文库具体作品页"
    if "pep.com.cn" in lowered:
        return "人民教育出版社公开页面"
    if "chinawriter.com.cn" in lowered:
        return "中国作家网公开页面"
    if "ykt.cbern.com.cn" in lowered:
        return "国家中小学智慧教育平台公开文档"
    return "旧库选定文本来源"


def source_type(url):
    return "database" if "github.com/chinese-poetry" in url.lower() else "web"


def require_empty_targets(data_dir):
    for filename in TABLE_FIELDS:
        path = data_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"missing target template: {path}")
        if read_csv(path):
            raise RuntimeError(f"refusing to overwrite non-empty target: {path}")


def main():
    parser = argparse.ArgumentParser(description="Import the first 20 Tang poems into the repository CSV schema.")
    parser.add_argument("--legacy-db", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    require_empty_targets(data_dir)

    manifest = read_csv(args.manifest.resolve())
    if len(manifest) != 20:
        raise ValueError(f"expected 20 manifest rows, got {len(manifest)}")
    work_ids = [row["legacy_work_id"] for row in manifest]
    if len(set(work_ids)) != len(work_ids):
        raise ValueError("manifest contains duplicate legacy_work_id values")

    connection = sqlite3.connect(args.legacy_db.resolve())
    connection.row_factory = sqlite3.Row
    try:
        placeholders = ",".join("?" for _ in work_ids)
        works = connection.execute(
            f"SELECT * FROM works WHERE work_id IN ({placeholders})", work_ids
        ).fetchall()
        if len(works) != len(work_ids):
            found = {row["work_id"] for row in works}
            missing = sorted(set(work_ids) - found)
            raise ValueError(f"manifest works missing from legacy database: {missing}")

        author_ids = sorted({row["author_id"] for row in works})
        author_placeholders = ",".join("?" for _ in author_ids)
        authors = connection.execute(
            f"SELECT * FROM authors WHERE author_id IN ({author_placeholders}) ORDER BY author_id",
            author_ids,
        ).fetchall()
        if len(authors) != len(author_ids):
            found = {row["author_id"] for row in authors}
            missing = sorted(set(author_ids) - found)
            raise ValueError(f"authors missing from legacy database: {missing}")

        source_rows = connection.execute(
            "SELECT * FROM sources WHERE source_id IN ('S001', 'S002') ORDER BY source_id"
        ).fetchall()
        source_by_id = {row["source_id"]: row for row in source_rows}
        if set(source_by_id) != {"S001", "S002"}:
            raise ValueError("expected legacy sources S001 and S002")

        work_by_id = {row["work_id"]: row for row in works}
        author_by_id = {row["author_id"]: row for row in authors}

        source_id_map = {
            legacy_id: stable_id("src", f"legacy-source:{legacy_id}")
            for legacy_id in ("S001", "S002")
        }
        canonical_urls = sorted({work_by_id[work_id]["canonical_source_url"] for work_id in work_ids})
        for url in canonical_urls:
            source_id_map[f"url:{url}"] = stable_id("src", f"canonical-url:{url}")

        source_output = []
        for legacy_id in ("S001", "S002"):
            source = source_by_id[legacy_id]
            source_output.append({
                "source_id": source_id_map[legacy_id],
                "source_type": "database" if legacy_id == "S001" else "web",
                "title": source["source_name"],
                "creator": "",
                "publisher": "",
                "edition": "",
                "publication_date": "",
                "url": source["url"],
                "accessed_on": "",
                "rights": source["license_name"] or "",
                "bibliographic_note": source["usage_notes"] or "",
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": f"legacy_source_id={legacy_id}; license_review_status={source['license_review_status']}",
            })

        accessed_by_url = {}
        for work_id in work_ids:
            work = work_by_id[work_id]
            accessed_by_url.setdefault(work["canonical_source_url"], work["source_accessed_on"] or "")
        for url in canonical_urls:
            source_id = source_id_map[f"url:{url}"]
            source_output.append({
                "source_id": source_id,
                "source_type": source_type(url),
                "title": source_title(url),
                "creator": "",
                "publisher": "",
                "edition": "",
                "publication_date": "",
                "url": url,
                "accessed_on": accessed_by_url[url],
                "rights": "待逐篇复核；旧库 rights_status=公共领域原作",
                "bibliographic_note": "由旧库 canonical_source_url 建立；不替代逐篇文本与权利核验",
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": "legacy_primary_source_id=S001; legacy_crosscheck_source_id=S002",
            })

        poet_id_map = {
            author_id: stable_id("poet", f"legacy-author:{author_id}")
            for author_id in author_ids
        }
        poet_output = []
        for author_id in author_ids:
            author = author_by_id[author_id]
            biography_url = author["biography_source_url"] or ""
            locator = f"legacy authors.author_id={author_id}"
            if biography_url:
                locator += f"; biography_source_url={biography_url}"
            poet_output.append({
                "poet_id": poet_id_map[author_id],
                "name": author["name"],
                "courtesy_name": "",
                "art_name": "",
                "birth_year": author["birth_year"] or "",
                "death_year": author["death_year"] or "",
                "birthplace_id": "",
                "biography": author["biography"] or "",
                "attribution_notes": f"legacy_author_id={author_id}; legacy_period={author['period']}; legacy_verification_status={author['verification_status']}",
                "source_id": source_id_map["S001"],
                "source_locator": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": "旧库作者资料迁移；需人工补齐生平与来源",
            })

        poem_id_map = {
            work_id: stable_id("poem", f"legacy-work:{work_id}")
            for work_id in work_ids
        }
        line_id_map = {}
        poem_output = []
        line_output = []
        for work_id in work_ids:
            work = work_by_id[work_id]
            poem_id = poem_id_map[work_id]
            canonical_url = work["canonical_source_url"]
            source_id = source_id_map[f"url:{canonical_url}"]
            source_locator = work["source_record_locator"]
            variant_notes = "; ".join([
                f"legacy_work_id={work_id}",
                f"legacy_author_id={work['author_id']}",
                f"legacy_primary_source_id=S001",
                f"legacy_crosscheck_source_id=S002",
                f"canonical_source_url={canonical_url}",
                f"canonical_basis={work['canonical_basis'] or ''}",
                f"source_script={work['source_script'] or ''}",
                f"text_review_status={work['text_review_status']}",
                f"canonical_review_status={work['canonical_review_status']}",
            ])
            poem_output.append({
                "poem_id": poem_id,
                "title": work["title"],
                "poet_id": poet_id_map[work["author_id"]],
                "poetic_form": "待考",
                "yuefu_type": "待考",
                "period": "待考",
                "year_start": "",
                "year_end": "",
                "dating_basis": "旧库仅记录作者 period=唐代，未细分诗歌创作年代",
                "full_text": work["canonical_text"],
                "variant_notes": variant_notes,
                "source_id": source_id,
                "source_locator": source_locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": SNAPSHOT_AT,
                "updated_at": SNAPSHOT_AT,
                "notes": "首批20首迁移试运行；正文沿用旧库 canonical_text，待人工版本复核",
            })

            lines = work["canonical_text"].split("\n")
            if any(line == "" for line in lines):
                raise ValueError(f"empty line in canonical_text: {work_id}")
            for line_no, line_text in enumerate(lines, start=1):
                line_id = stable_id("line", f"legacy-work:{work_id}:line:{line_no}")
                line_id_map[f"{work_id}:{line_no}"] = line_id
                line_output.append({
                    "line_id": line_id,
                    "poem_id": poem_id,
                    "line_no": line_no,
                    "couplet_no": (line_no + 1) // 2,
                    "line_text": line_text,
                    "source_id": source_id,
                    "source_locator": f"legacy_work_id={work_id}; source_record_locator={source_locator}; line_no={line_no}",
                    "review_status": "pending",
                    "created_by": CREATED_BY,
                    "created_at": SNAPSHOT_AT,
                    "updated_at": SNAPSHOT_AT,
                    "notes": "由旧库 canonical_text 按 LF 拆分，待人工逐句核对",
                })

        write_csv(data_dir / "sources.csv", TABLE_FIELDS["sources.csv"], source_output)
        write_csv(data_dir / "poets.csv", TABLE_FIELDS["poets.csv"], poet_output)
        write_csv(data_dir / "poems.csv", TABLE_FIELDS["poems.csv"], poem_output)
        write_csv(data_dir / "poem_lines.csv", TABLE_FIELDS["poem_lines.csv"], line_output)

        mapping_rows = []
        for legacy_id, new_id in sorted(source_id_map.items()):
            mapping_rows.append({
                "entity_type": "source",
                "legacy_id": legacy_id,
                "new_id": new_id,
                "notes": "stable UUID5 mapping",
            })
        for legacy_id, new_id in sorted(poet_id_map.items()):
            mapping_rows.append({
                "entity_type": "poet",
                "legacy_id": legacy_id,
                "new_id": new_id,
                "notes": "stable UUID5 mapping",
            })
        for legacy_id, new_id in sorted(poem_id_map.items()):
            mapping_rows.append({
                "entity_type": "poem",
                "legacy_id": legacy_id,
                "new_id": new_id,
                "notes": "stable UUID5 mapping",
            })
        for legacy_id, new_id in sorted(line_id_map.items()):
            mapping_rows.append({
                "entity_type": "line",
                "legacy_id": legacy_id,
                "new_id": new_id,
                "notes": "stable UUID5 mapping",
            })
        write_csv(
            reports_dir / "tang_poem_import_id_map_v1.csv",
            ["entity_type", "legacy_id", "new_id", "notes"],
            mapping_rows,
        )

        digest = hashlib.sha256("\n".join(work_ids).encode("utf-8")).hexdigest()
        print(f"imported poems={len(poem_output)} lines={len(line_output)} poets={len(poet_output)} sources={len(source_output)}")
        print(f"manifest_work_id_sha256={digest}")
        print(f"id_map={reports_dir / 'tang_poem_import_id_map_v1.csv'}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()

"""补齐诗人档案中可由公开网页直接核对的字段。

本脚本只更新 poets.csv、places.csv、sources.csv，并生成一份逐条变更登记。
不修改诗作年代、标签、声律或诗人关系；网页资料写入 pending，等待人工复核。
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import pathlib
import subprocess
import uuid
from urllib.parse import quote


ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REPORT = ROOT / "reports" / "tang_poem_poet_web_enrichment_v1.csv"
NOW = "2026-10-18T15:00:00+08:00"
SOURCE_ID = "src_" + str(uuid.uuid5(uuid.NAMESPACE_URL, "https://zh.wikipedia.org/"))


def page(name: str) -> str:
    return "https://zh.wikipedia.org/wiki/" + quote(name, safe="")


PEOPLE = {
    "李白": {
        "courtesy_name": "太白", "art_name": "青莲居士", "birth_year": "701", "death_year": "762",
        "biography": "唐代诗人，字太白，号青莲居士；现存诗歌题材广泛，常与杜甫并称李杜。",
        "note": "生卒年采用维基文库唐代作者目录常用口径。出生地诸说有争议，暂不建立籍贯外键。",
    },
    "杜甫": {
        "courtesy_name": "子美", "art_name": "少陵野老", "birth_year": "712", "death_year": "770",
        "birthplace": ("洛州巩县", "河南巩义", "birthplace;杜甫故里通常指巩县"),
        "biography": "唐代诗人，字子美，自号少陵野老；家族自襄阳迁居巩县，作品常被视为唐代现实主义诗歌的重要代表。",
        "note": "出生地按巩县（今河南巩义）记录；杜甫出生地仍有文献表述差异。",
    },
    "王维": {
        "courtesy_name": "摩诘", "art_name": "摩诘居士", "birth_year": "701", "death_year": "761",
        "birthplace": ("太原祁县", "山西祁县", "birthplace;祖籍与出生地表述需区分"),
        "biography": "唐代官员、诗人和画家，字摩诘，号摩诘居士；山水田园诗与绘画成就突出，后世称诗佛。",
        "note": "生年存在699/701等异说，采用常见701年口径；祁县为籍贯/家族来源口径。",
    },
    "白居易": {
        "courtesy_name": "乐天", "art_name": "香山居士、醉吟先生", "birth_year": "772", "death_year": "846",
        "birthplace": ("河南新郑", "河南新郑", "birthplace;祖籍太原与出生地不同"),
        "biography": "中唐诗人，字乐天，号香山居士、醉吟先生；倡导新乐府，诗歌以平易近人和关注现实著称。",
        "note": "采用772—846年常用口径；资料同时记载祖籍太原与生于新郑。",
    },
    "李商隐": {
        "courtesy_name": "义山", "art_name": "玉谿生、樊南生", "birth_year": "813", "death_year": "858",
        "birthplace": ("怀州河内县", "河南沁阳", "birthplace;祖籍陇西狄道"),
        "biography": "晚唐诗人，字义山，号玉谿生、樊南生；与杜牧并称小李杜，诗作多用典且意象密集。",
        "note": "生年有812/813两说，采用常见813年口径；河内县为出生地，陇西狄道为祖籍。",
    },
    "杜牧": {
        "courtesy_name": "牧之", "art_name": "樊川居士", "birth_year": "803", "death_year": "852",
        "birthplace": ("京兆府万年县", "陕西西安", "birthplace;唐京兆万年县今属西安"),
        "biography": "晚唐诗人和士大夫，字牧之，号樊川居士；出身京兆杜氏，诗文兼擅，常与李商隐并称小李杜。",
        "note": "采用803—852年常用口径；现代地点只用于界面定位，不等同唐代行政边界。",
    },
    "孟浩然": {
        "courtesy_name": "浩然", "art_name": "孟山人、鹿门处士", "birth_year": "689", "death_year": "740",
        "birthplace": ("襄州襄阳", "湖北襄阳", "birthplace;孟襄阳"),
        "biography": "盛唐山水田园诗人，名浩，字浩然，号孟山人；襄州襄阳人，后世又称孟襄阳。",
        "note": "以字行，字号信息按人物页与常用人物资料合并记录。",
    },
    "王昌龄": {
        "courtesy_name": "少伯", "art_name": "", "birth_year": "698", "death_year": "757",
        "biography": "盛唐边塞诗人，字少伯；曾任江宁丞、龙标尉，七言绝句成就突出，后世称七绝圣手。",
        "note": "生卒年和籍贯存在多种考订；京兆、太原等说法未强行写入 birthplace_id。",
    },
    "岑参": {
        "courtesy_name": "", "art_name": "", "birth_year": "715", "death_year": "770",
        "birthplace": ("荆州江陵", "湖北荆州", "birthplace;先世居南阳棘阳"),
        "biography": "盛唐边塞诗人，荆州江陵人，岑文本曾孙；曾任嘉州刺史，后人称岑嘉州，与高适并称高岑。",
        "note": "生卒年学界有715/718、769/770等异说，采用人物页所列715—770口径。",
    },
    "高适": {
        "courtesy_name": "达夫（一字仲武）", "art_name": "", "birth_year": "704", "death_year": "765",
        "biography": "盛唐边塞诗人和官员，字达夫，一字仲武；长于古风、乐府，诗歌常反映边地军旅与民生。",
        "note": "生年常见704年口径；籍贯与渤海高氏郡望不宜直接转换为出生地。",
    },
    "刘禹锡": {
        "courtesy_name": "梦得", "art_name": "", "birth_year": "772", "death_year": "842",
        "biography": "中唐诗人、政治家，字梦得；参与永贞革新，诗文风格刚健，后世称刘宾客。",
        "note": "籍贯在彭城、中山、庐陵等史料之间有异说，暂不建立出生地外键。",
    },
    "韦应物": {
        "courtesy_name": "义博", "art_name": "", "birth_year": "737", "death_year": "791",
        "birthplace": ("京兆郡杜陵县", "陕西西安长安区", "birthplace;韦氏籍贯"),
        "biography": "中唐诗人和官员，字义博；京兆杜陵人，历任苏州刺史，诗风闲澹简远，后世称韦苏州。",
        "note": "生年为据诗文推定，采用约737—791年口径；不把估计值当作精确生年。",
    },
    "刘长卿": {
        "courtesy_name": "文房", "art_name": "", "birth_year": "726", "death_year": "790",
        "birthplace": ("宣城", "安徽宣城", "birthplace;郡望河间"),
        "biography": "中唐诗人，字文房，宣城人；擅长五言近体诗，自称五言长城，主要活动于吴越地区。",
        "note": "生卒年无确考，726/790为研究者常用估计；宣城与河间分别是籍贯、郡望口径。",
    },
    "皇甫冉": {
        "courtesy_name": "茂政", "art_name": "", "birth_year": "717", "death_year": "770",
        "birthplace": ("润州丹阳", "江苏丹阳", "birthplace;祖籍安定郡朝那县"),
        "biography": "中唐诗人，字茂政，润州丹阳人；与弟皇甫曾并称，曾任无锡县尉、右补阙等职。",
        "note": "生卒年存在723—767与716/717—770等异说，采用后者并保留争议。",
    },
    "王勃": {
        "courtesy_name": "子安", "art_name": "", "birth_year": "650", "death_year": "676",
        "birthplace": ("绛州龙门", "山西河津", "birthplace;一说卒于677"),
        "biography": "初唐诗人和文学家，字子安，绛州龙门人；与杨炯、卢照邻、骆宾王合称初唐四杰。",
        "note": "生卒年采用650—676年常用口径，另有卒于677年的说法。",
    },
    "杨炯": {
        "courtesy_name": "", "art_name": "", "birth_year": "650", "death_year": "",
        "birthplace": ("弘农郡华阴县", "陕西华阴", "birthplace;排行第七"),
        "biography": "初唐四杰之一，弘农华阴人；擅长边塞诗，现存《杨盈川集》，卒年尚无定论。",
        "note": "卒年不可确考，研究中有692、695等说法，暂留空值。",
    },
    "骆宾王": {
        "courtesy_name": "观光", "art_name": "", "birth_year": "", "death_year": "684",
        "birthplace": ("义乌", "浙江义乌", "birthplace;生年有多说"),
        "biography": "初唐诗人，字观光，义乌人；与王勃、杨炯、卢照邻合称初唐四杰，徐敬业起兵时曾作讨武檄文。",
        "note": "生年有约619、627、640等异说，未将争议年份写入整数栏；卒年采用684年。",
    },
    "贺知章": {
        "courtesy_name": "季真（一字维摩）", "art_name": "石窗、四明狂客", "birth_year": "659", "death_year": "744",
        "birthplace": ("越州永兴县", "浙江萧山", "birthplace;今萧山"),
        "biography": "初唐至盛唐之际诗人、书法家和官员，字季真，号石窗，晚年号四明狂客；越州永兴人。",
        "note": "采用659—744年常用口径；项目分期仍按现有初唐样本规则。",
    },
    "张若虚": {
        "courtesy_name": "", "art_name": "", "birth_year": "", "death_year": "",
        "biography": "初唐诗人，现存《春江花月夜》和《代答闺梦还》两首；生卒年、字号和籍贯尚缺可靠定论。",
        "note": "公开人物页未给出可稳定核验的生卒年和字号，保持空值而补充缺失说明。",
    },
    "杜审言": {
        "courtesy_name": "必简", "art_name": "", "birth_year": "", "death_year": "708",
        "birthplace": ("洛州巩县", "河南巩义", "birthplace;祖籍襄阳"),
        "biography": "初唐诗人和官员，字必简，杜甫祖父；擅长五言律诗，与李峤、崔融、苏味道并称文章四友。",
        "note": "卒年确定为708年；生年史料无确载，常见646年仅为推定，暂留空值。",
    },
    "陈子昂": {
        "courtesy_name": "伯玉", "art_name": "", "birth_year": "661", "death_year": "702",
        "birthplace": ("梓州射洪县", "四川射洪", "birthplace;唐梓州射洪"),
        "biography": "初唐诗人，字伯玉，梓州射洪人；主张汉魏风骨与兴寄，是唐诗革新的先驱，后世称陈拾遗。",
        "note": "生年有659、661等异说，采用中国哲学书电子化计划与维基文库常用661—702口径。",
    },
}


def read_csv(path: pathlib.Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames or [], list(reader)


def read_original_poets() -> dict[str, dict[str, str]]:
    """Read the repository baseline so the report remains stable on reruns."""
    try:
        raw = subprocess.check_output(["git", "show", "HEAD:data/poets.csv"], cwd=ROOT)
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig", errors="strict")))
        return {row["poet_id"]: row for row in reader}
    except (OSError, subprocess.CalledProcessError, UnicodeError):
        return {}


def write_csv(path: pathlib.Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def dedupe_semicolon_text(value: str) -> str:
    parts = [part.strip() for part in value.split("；") if part.strip()]
    seen: list[str] = []
    for part in parts:
        if part not in seen:
            seen.append(part)
    return "；".join(seen)


def ensure_source() -> None:
    path = DATA / "sources.csv"
    fields, rows = read_csv(path)
    if not any(row["source_id"] == SOURCE_ID for row in rows):
        rows.append({
            "source_id": SOURCE_ID,
            "source_type": "web",
            "title": "中文维基百科人物页（网页检索补录来源）",
            "creator": "Wikimedia contributors",
            "publisher": "维基媒体基金会",
            "edition": "当前页面版本",
            "publication_date": "",
            "url": "https://zh.wikipedia.org/",
            "accessed_on": "2026-10-18",
            "rights": "页面以知识共享署名-相同方式共享许可为主；本批仅用于内部人物元数据核对，发布前按页面许可要求复核。",
            "bibliographic_note": "用于核对诗人字号、生卒年、籍贯和简要生平；每条记录在 poets.csv 或 places.csv 中保留具体人物页 URL。",
            "review_status": "pending",
            "created_by": "web_enrichment_v1",
            "created_at": NOW,
            "updated_at": NOW,
            "notes": "internet_retrieval=true; source_role=poet_metadata; human_review_required=true",
        })
        write_csv(path, fields, rows)


def update_places() -> dict[str, str]:
    path = DATA / "places.csv"
    fields, rows = read_csv(path)
    by_name = {row["historical_name"]: row["place_id"] for row in rows}
    place_ids: dict[str, str] = {}
    for name, info in PEOPLE.items():
        birthplace = info.get("birthplace")
        if not birthplace:
            continue
        historical_name, modern_name, note = birthplace
        place_id = by_name.get(historical_name) or (
            "place_" + str(uuid.uuid5(uuid.NAMESPACE_URL, f"wenjing:birthplace:{historical_name}"))
        )
        by_name[historical_name] = place_id
        place_ids[name] = place_id
        if not any(row["place_id"] == place_id for row in rows):
            rows.append({
                "place_id": place_id,
                "historical_name": historical_name,
                "modern_name": modern_name,
                "place_type": "birthplace",
                "parent_place_id": "",
                "longitude": "",
                "latitude": "",
                "coordinate_precision": "",
                "identification_note": note,
                "source_id": SOURCE_ID,
                "source_locator": page(name),
                "review_status": "pending",
                "created_by": "web_enrichment_v1",
                "created_at": NOW,
                "updated_at": NOW,
                "notes": "internet_retrieval=true; coordinates_not_added; human_review_required=true",
            })
    write_csv(path, fields, rows)
    return place_ids


def update_poets(place_ids: dict[str, str]) -> list[dict[str, str]]:
    path = DATA / "poets.csv"
    fields, rows = read_csv(path)
    original_rows = read_original_poets()
    report_rows: list[dict[str, str]] = []
    for row in rows:
        name = row["name"]
        info = PEOPLE.get(name)
        if not info:
            continue
        original = original_rows.get(row["poet_id"], row)
        tracked_fields = ("courtesy_name", "art_name", "birth_year", "death_year", "birthplace_id", "biography")
        before = [field for field in tracked_fields if not original.get(field)]
        for field in ("courtesy_name", "art_name", "birth_year", "death_year", "biography"):
            if info.get(field):
                row[field] = info[field]
        if name in place_ids:
            row["birthplace_id"] = place_ids[name]
        row["source_id"] = SOURCE_ID
        row["source_locator"] = page(name)
        attribution_marker = "web_enrichment_v1=中文维基百科人物页交叉检索"
        row["attribution_notes"] = dedupe_semicolon_text(row.get("attribution_notes", ""))
        if attribution_marker not in row["attribution_notes"]:
            row["attribution_notes"] = (row["attribution_notes"] + "；" + attribution_marker).strip("；")
        row["notes"] = dedupe_semicolon_text(row.get("notes", ""))
        if info["note"] not in row["notes"]:
            row["notes"] = (row["notes"] + "；" + info["note"]).strip("；")
        row["updated_at"] = NOW
        updated_fields = [field for field in tracked_fields if not original.get(field) and row.get(field)]
        report_rows.append({
            "poet_id": row["poet_id"],
            "name": name,
            "source_url": page(name),
            "retrieved_on": "2026-10-18",
            "before_empty_fields": ",".join(before),
            "updated_fields": ",".join(updated_fields),
            "review_status": row["review_status"],
            "notes": info["note"],
        })
    write_csv(path, fields, rows)
    return report_rows


def write_report(rows: list[dict[str, str]]) -> None:
    fields = ["poet_id", "name", "source_url", "retrieved_on", "before_empty_fields", "updated_fields", "review_status", "notes"]
    write_csv(REPORT, fields, rows)


def main() -> None:
    ensure_source()
    place_ids = update_places()
    report = update_poets(place_ids)
    write_report(report)
    print(f"updated poets={len(report)} birthplace_places={len(place_ids)} source_id={SOURCE_ID}")


if __name__ == "__main__":
    main()

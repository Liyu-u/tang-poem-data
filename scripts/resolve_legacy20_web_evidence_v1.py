"""Resolve the remaining legacy 20 annotation rows with web evidence.

This pass updates only the 16 current ``needs_revision`` rows in the main
annotation tables.  Historical review rows remain intact; a new review row,
source entry and standalone resolution report are appended for each decision.
The result is still an assisted web-evidence pass, not a substitute for two
human reviewers.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import uuid


REVIEWED_AT = "2026-10-17T23:45:00+08:00"
REVIEWER = "Codex网页证据复核（非人工双审）"
CREATED_BY = "legacy20_web_evidence_resolution_v1"
NAMESPACE = uuid.UUID("1f63ce79-87f6-5aa0-8f3e-1d2e2cf34c7f")


SOURCE_DEFS = {
    "spring_wang": {
        "title": "杜甫《春望》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv.aspx?id=89d3a63c6d7f",
        "note": "作品页原文、创作背景和赏析；写长安沦陷、烽火、家书及忧国伤怀。",
    },
    "jinse": {
        "title": "李商隐《锦瑟》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv_1921957e6e83.aspx",
        "note": "作品页原文和赏析；明确指出‘思华年’‘成追忆’‘已惘然’，并提示主题解释存在多说。",
    },
    "night_rain": {
        "title": "李商隐《夜雨寄北》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv_e46c43d13b97.aspx",
        "note": "作品页原文、背景和赏析；说明身居巴蜀、归期未定并寄意北方亲友/妻子。",
    },
    "shudao": {
        "title": "李白《蜀道难》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/GuShiWen.aspx?id=37a4410939",
        "note": "作品页注释和赏析；‘六龙回日’解释为太阳神驾六龙的神话。",
    },
    "weicheng": {
        "title": "王维《渭城曲》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/gushiwen_91d30a203b.aspx",
        "note": "作品页原文和赏析；‘渭城’作为送别地点名称出现。",
    },
    "grass": {
        "title": "白居易《赋得古原草送别》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv_b7820a12ebaa.aspx",
        "note": "作品页原文和赏析；‘荒城’与古道、原草共同构成送别场景。",
    },
    "pipa": {
        "title": "白居易《琵琶行》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/GuShiWen.aspx?id=5ee73a6bb1",
        "note": "作品页序、原文和赏析；区分浔阳、江州等处所名称与江河语义，并说明京城为一般城市空间。",
    },
    "chusai": {
        "title": "王昌龄《出塞》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv.aspx?id=b9e14c6e09aa",
        "note": "作品页注释和赏析；‘龙城飞将’涉及汉代地名和典故。",
    },
    "yange": {
        "title": "高适《燕歌行·并序》原文与赏析",
        "creator": "古文岛/古诗文网",
        "publisher": "古文岛/古诗文网",
        "url": "https://www.gushiwen.cn/shiwenv.aspx?id=4c7868ec4409",
        "note": "作品页原文和赏析；‘孤城落日’为边塞景观，‘城南’为城市方位。",
    },
    "zhuque": {
        "title": "朱雀桥历史地名说明",
        "creator": "南京大学",
        "publisher": "南京大学",
        "url": "https://www.nju.edu.cn/info/1056/459021.htm",
        "note": "页面将朱雀桥作为南京历史地名和古桥说明。",
    },
}


DECISIONS = [
    {
        "table": "poem_tags",
        "id": "ptag_dc09637e-6874-505d-b2ad-33acb7b58d52",
        "title": "春望",
        "dimension": "theme",
        "decision": "approved",
        "source": "spring_wang",
        "evidence": "作品赏析将诗置于安史乱局，写长安沦陷、烽火和家书，并概括为忧国伤怀；‘政治讽喻’作为项目宽口径主题标签可保留。",
        "locator": "引句：国破山河在；烽火连三月，家书抵万金。",
    },
    {
        "table": "poem_tags",
        "id": "ptag_eb60527c-b446-5361-bf27-456deb23d643",
        "title": "锦瑟",
        "dimension": "theme",
        "decision": "approved",
        "source": "jinse",
        "evidence": "‘思华年’‘成追忆’‘已惘然’直接形成追忆往事与人生惘然的表达；网页同时提示主题有多种解释，因此仅作宽口径‘人生感怀’标签，不宣称唯一主题。",
        "locator": "引句：一弦一柱思华年；此情可待成追忆，只是当时已惘然。",
    },
    {
        "table": "poem_tags",
        "id": "ptag_fe8c3dd0-56e3-5679-8b10-3f87e0ffebde",
        "title": "夜雨寄北",
        "dimension": "theme",
        "decision": "approved",
        "source": "night_rain",
        "evidence": "作品页说明诗人身居巴蜀、归期未定并寄意北方亲友或妻子；‘君问归期未有期’与羁旅处境直接支持‘羁旅’标签。",
        "locator": "引句：君问归期未有期；巴山夜雨涨秋池。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_d1056d9e-7d35-516d-a7aa-2e8464323ed7",
        "title": "蜀道难",
        "dimension": "imagery",
        "decision": "approved",
        "source": "shudao",
        "evidence": "‘六龙回日’使用太阳神驾六龙的神话来极写山高，‘龙’在此是神话—天象意象，不按现实动物义解释。",
        "locator": "引句：上有六龙回日之高标。",
        "contextual_meaning": "六龙回日：神话天象意象",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_7b8ec18c-6033-56d0-8156-7c655daa0eb1",
        "title": "蜀道难",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "shudao",
        "evidence": "‘锦城’是成都的别称，当前记录中的‘城’属于地名组成，不作为独立城邑意象计数。",
        "locator": "引句：锦城虽云乐。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_bb2bdb78-b592-5d99-afbe-7521cb0001d4",
        "title": "春望",
        "dimension": "imagery",
        "decision": "approved",
        "source": "spring_wang",
        "evidence": "‘城春’中的‘城’指长安城市空间，与春景形成具体景观，不是专名组成，按城邑意象计入。",
        "locator": "引句：城春草木深。",
        "contextual_meaning": "城邑/城市空间",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_c3fc1102-817e-5fb5-97c3-464954bc4973",
        "title": "渭城曲",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "weicheng",
        "evidence": "‘渭城’在诗中是送别地点名称，当前词面属于地名，不作为独立‘城’意象计数。",
        "locator": "引句：渭城朝雨浥轻尘。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_f5c87d20-3b76-56df-aa06-a783cf3b261e",
        "title": "赋得古原草送别",
        "dimension": "imagery",
        "decision": "approved",
        "source": "grass",
        "evidence": "‘荒城’是荒废城邑的景物描写，作品赏析将它与古道、原草并列为送别场景，作为城邑意象计入。",
        "locator": "引句：晴翠接荒城。",
        "contextual_meaning": "荒废城邑/城邑景观",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_4cffa5eb-ea53-5d76-abfb-8cca85008ead",
        "title": "琵琶行",
        "dimension": "imagery",
        "decision": "approved",
        "source": "pipa",
        "evidence": "‘京城’是一般性的都城空间，写琵琶女早年生活处所，不是专名组成；按城市空间意象保留。",
        "locator": "引句：自言本是京城女。",
        "contextual_meaning": "都城/城市空间",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_667a3e40-f57b-5103-ab4e-abe37c4323ba",
        "title": "琵琶行",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "pipa",
        "evidence": "‘浔阳城’是浔阳处所名称，当前词面属于地名组成，不作为独立城邑意象计数。",
        "locator": "引句：谪居卧病浔阳城。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_c1db8ae4-4605-5ae0-ac65-34a9d508f784",
        "title": "琵琶行",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "pipa",
        "evidence": "‘江州司马’中的‘江州’是地域和官职语境的专名，不是江河意象；撤出‘江’的单独计数。",
        "locator": "引句：江州司马青衫湿。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_bf85dbcd-2234-5b8a-b8c4-fdf520dfbf58",
        "title": "出塞",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "chusai",
        "evidence": "‘龙城’在‘龙城飞将’中承载汉代地名和典故，当前词面不作为独立城邑意象计数。",
        "locator": "引句：但使龙城飞将在。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_e63c0424-b990-5163-aa15-8a1ce6e08d84",
        "title": "出塞",
        "dimension": "imagery",
        "decision": "rejected",
        "source": "chusai",
        "evidence": "‘龙城’在‘龙城飞将’中承载汉代地名和典故，‘龙’不作为独立动物意象计数。",
        "locator": "引句：但使龙城飞将在。",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_a8d8dd03-175a-5ee1-90af-e1ff839f0153",
        "title": "燕歌行",
        "dimension": "imagery",
        "decision": "approved",
        "source": "yange",
        "evidence": "‘孤城落日’是边塞中孤立城堡与落日构成的具体景观，作品赏析明确以其烘托战后凄凉，按城邑意象计入。",
        "locator": "引句：大漠穷秋塞草腓，孤城落日斗兵稀。",
        "contextual_meaning": "孤立城堡/边塞城邑景观",
    },
    {
        "table": "poem_imagery",
        "id": "pimg_ec9bf048-af83-585b-b357-3476109692be",
        "title": "燕歌行",
        "dimension": "imagery",
        "decision": "approved",
        "source": "yange",
        "evidence": "‘城南’是城市方位词，写思妇所在的城市空间，不是专名；按城市空间意象保留。",
        "locator": "引句：少妇城南欲断肠。",
        "contextual_meaning": "城市方位/城邑空间",
    },
    {
        "table": "color_occurrences",
        "id": "color_9b60976e-ce02-5399-8e73-d38a0609c008",
        "title": "乌衣巷",
        "dimension": "color",
        "decision": "rejected",
        "source": "zhuque",
        "evidence": "‘朱’属于历史地名‘朱雀桥’的专名组成；南京大学页面明确将朱雀桥作为南京历史地名和古桥说明，不作为颜色词计数。",
        "locator": "引句：朱雀桥边野草花。",
    },
]


def read_csv(path: pathlib.Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames or [], list(reader)


def write_csv(path: pathlib.Path, fields, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def stable_id(prefix: str, value: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, value)}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    report_dir = root / "reports"

    source_fields, sources = read_csv(data_dir / "sources.csv")
    source_by_url = {row.get("url", ""): row for row in sources}
    source_ids = {}
    for key, definition in SOURCE_DEFS.items():
        existing = source_by_url.get(definition["url"])
        if existing:
            source_ids[key] = existing["source_id"]
            continue
        source_id = stable_id("src", definition["url"])
        row = {field: "" for field in source_fields}
        row.update(
            {
                "source_id": source_id,
                "source_type": "web",
                "title": definition["title"],
                "creator": definition["creator"],
                "publisher": definition["publisher"],
                "edition": "网页访问版本",
                "url": definition["url"],
                "accessed_on": "2026-10-17",
                "rights": "仅用于研究核验；网页版权与项目分发许可另行审核",
                "bibliographic_note": definition["note"],
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "web_evidence=true; not_a_text_base=true",
            }
        )
        sources.append(row)
        source_by_url[definition["url"]] = row
        source_ids[key] = source_id
    write_csv(data_dir / "sources.csv", source_fields, sources)

    table_cache = {}
    for table in {item["table"] for item in DECISIONS}:
        fields, rows = read_csv(data_dir / f"{table}.csv")
        table_cache[table] = (fields, rows)
    review_fields, reviews = read_csv(data_dir / "annotation_reviews.csv")
    latest_by_target = {}
    for review in reviews:
        latest_by_target[(review["target_table"], review["target_id"])] = review

    resolution_rows = []
    for item in DECISIONS:
        fields, rows = table_cache[item["table"]]
        target = next((row for row in rows if row[fields[0]] == item["id"]), None)
        if target is None:
            raise RuntimeError(f"missing target: {item['table']} {item['id']}")
        if target.get("review_status") != "needs_revision":
            raise RuntimeError(f"target is not needs_revision: {item['table']} {item['id']}")
        source_id = source_ids[item["source"]]
        target["review_status"] = item["decision"]
        target["updated_at"] = REVIEWED_AT
        target["source_id"] = source_id
        target["source_locator"] = item["locator"]
        target["explanation"] = item["evidence"]
        target["confidence"] = "0.95" if item["decision"] == "rejected" else "0.90"
        if "contextual_meaning" in target and item.get("contextual_meaning"):
            target["contextual_meaning"] = item["contextual_meaning"]
        target["notes"] = (
            "web_evidence=true; ai_assisted_review=true; human_double_review_required=true; "
            "legacy20_resolution_v1=" + item["decision"]
        )

        previous = latest_by_target.get((item["table"], item["id"]))
        review_id = stable_id("review", f"{item['table']}:{item['id']}:{REVIEWED_AT}")
        review_row = {field: "" for field in review_fields}
        review_row.update(
            {
                "review_id": review_id,
                "target_table": item["table"],
                "target_id": item["id"],
                "target_updated_at": REVIEWED_AT,
                "decision": item["decision"],
                "reviewer": REVIEWER,
                "reviewed_at": REVIEWED_AT,
                "review_comment": item["evidence"],
                "previous_review_id": previous["review_id"] if previous else "",
                "source_id": source_id,
                "source_locator": item["locator"],
                "review_status": item["decision"],
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "web_evidence=true; ai_assisted_review=true; human_double_review_required=true",
            }
        )
        reviews.append(review_row)
        latest_by_target[(item["table"], item["id"])] = review_row
        resolution_rows.append(
            {
                "target_table": item["table"],
                "target_id": item["id"],
                "title": item["title"],
                "dimension": item["dimension"],
                "decision": item["decision"],
                "source_id": source_id,
                "source_url": SOURCE_DEFS[item["source"]]["url"],
                "source_locator": item["locator"],
                "evidence_summary": item["evidence"],
                "notes": "web_evidence=true; not_human_double_review=true",
            }
        )

    for table, (fields, rows) in table_cache.items():
        write_csv(data_dir / f"{table}.csv", fields, rows)
    write_csv(data_dir / "annotation_reviews.csv", review_fields, reviews)

    report_fields = [
        "target_table",
        "target_id",
        "title",
        "dimension",
        "decision",
        "source_id",
        "source_url",
        "source_locator",
        "evidence_summary",
        "notes",
    ]
    write_csv(report_dir / "tang_poem_legacy20_web_resolution_v1.csv", report_fields, resolution_rows)
    counts = {decision: sum(item["decision"] == decision for item in DECISIONS) for decision in ("approved", "rejected", "needs_revision")}
    summary = [
        "# 首批20首遗留待修订网页复核 v1",
        "",
        f"- 复核时间：{REVIEWED_AT}",
        f"- 复核者：{REVIEWER}",
        "- 范围：原首批20首中当前仍为 `needs_revision` 的16条主表标注。",
        "- 说明：本轮是公开网页证据辅助复核，不等同两位真人专家终审；原始审核历史保留。",
        "",
        "## 结果",
        "",
        "| 维度 | approved | rejected | needs_revision |",
        "|---|---:|---:|---:|",
        f"| 主题 | {sum(i['decision']=='approved' and i['dimension']=='theme' for i in DECISIONS)} | {sum(i['decision']=='rejected' and i['dimension']=='theme' for i in DECISIONS)} | 0 |",
        f"| 意象 | {sum(i['decision']=='approved' and i['dimension']=='imagery' for i in DECISIONS)} | {sum(i['decision']=='rejected' and i['dimension']=='imagery' for i in DECISIONS)} | 0 |",
        f"| 颜色 | {sum(i['decision']=='approved' and i['dimension']=='color' for i in DECISIONS)} | {sum(i['decision']=='rejected' and i['dimension']=='color' for i in DECISIONS)} | 0 |",
        "",
        "## 口径",
        "",
        "- 主题允许一首诗有多个标签；《锦瑟》的‘人生感怀’仅作为宽口径样本标签，保留解释多说。",
        "- 意象按‘词面＋句内语境’判断；地名/典故组成不重复计为独立意象，明确的城市景观或城市空间则保留。",
        "- 《乌衣巷》的‘朱’属于‘朱雀桥’专名，不计颜色词。",
        "- 所有网页来源仅用于核验，不替代采用底本，也不自动形成版权许可。",
        "",
        "详细逐条记录见 `reports/tang_poem_legacy20_web_resolution_v1.csv`。",
    ]
    (report_dir / "tang_poem_legacy20_web_summary_v1.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print({"resolved": len(DECISIONS), "counts": counts, "sources_added": len(SOURCE_DEFS)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Build a clean result-only data package for external display.

The internal ``data/`` tables remain untouched and retain provenance/review
fields.  This export removes process fields such as review status, confidence,
created-by timestamps, migration notes, and rule explanations.  Stable IDs and
human-readable result labels are retained so a front end can join the tables.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


SCHOOL_TAGS = {"school"}
PUBLIC_DIRNAME = "public_data"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def unique_join(values: list[str]) -> str:
    result: list[str] = []
    for value in values:
        if value and value not in result:
            result.append(value)
    return "；".join(result)


def split_public_feature(value: str) -> str:
    """Keep existing ``term(count)`` result labels, remove empty values."""

    return unique_join([part.strip() for part in value.split("；") if part.strip()])


def display_year(value: str, precision: str) -> str:
    if not value:
        return "不详"
    if precision in {"approximate", "partial"}:
        return f"约{value}"
    return value


def build(root: Path) -> dict[str, int]:
    data = root / "data"
    reports = root / "reports"
    public = root / PUBLIC_DIRNAME
    public.mkdir(exist_ok=True)

    poems = read_csv(data / "poems.csv")
    poets = read_csv(data / "poets.csv")
    tags = read_csv(data / "tags.csv")
    poem_tags = read_csv(data / "poem_tags.csv")
    imagery = read_csv(data / "imagery.csv")
    poem_imagery = read_csv(data / "poem_imagery.csv")
    colors = read_csv(data / "color_occurrences.csv")
    places = read_csv(data / "places.csv")
    poem_places = read_csv(data / "poem_places.csv")
    poet_schools = read_csv(data / "poet_schools.csv")
    source_public = read_csv(data / "public_sources.csv")
    poem_source_public = read_csv(data / "public_poem_sources.csv")

    poet_by_id = {row["poet_id"]: row for row in poets}
    poet_name_by_id = {row["poet_id"]: row["name"] for row in poets}
    poem_by_id = {row["poem_id"]: row for row in poems}
    tag_by_id = {row["tag_id"]: row for row in tags}
    imagery_by_id = {row["imagery_id"]: row for row in imagery}
    place_by_id = {row["place_id"]: row for row in places}

    # Normalize relation fields into clean lists keyed by poem.
    poem_tag_names: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for row in poem_tags:
        tag = tag_by_id.get(row["tag_id"])
        if not tag:
            continue
        category = tag.get("category", "")
        name = tag.get("tag_name", "")
        if name and name not in poem_tag_names[row["poem_id"]][category]:
            poem_tag_names[row["poem_id"]][category].append(name)

    imagery_names: dict[str, list[str]] = defaultdict(list)
    imagery_categories: dict[str, list[str]] = defaultdict(list)
    for row in poem_imagery:
        item = imagery_by_id.get(row["imagery_id"])
        if not item:
            continue
        name = item["canonical_name"]
        if name not in imagery_names[row["poem_id"]]:
            imagery_names[row["poem_id"]].append(name)
        if item.get("category") and item["category"] not in imagery_categories[row["poem_id"]]:
            imagery_categories[row["poem_id"]].append(item["category"])

    color_names: dict[str, list[str]] = defaultdict(list)
    for row in colors:
        value = row.get("normalized_color") or row.get("color_term") or ""
        if value and value not in color_names[row["poem_id"]]:
            color_names[row["poem_id"]].append(value)

    place_names: dict[str, list[str]] = defaultdict(list)
    for row in poem_places:
        item = place_by_id.get(row["place_id"])
        if not item:
            continue
        value = item.get("historical_name", "")
        if value and value not in place_names[row["poem_id"]]:
            place_names[row["poem_id"]].append(value)

    poem_fields = [
        "poem_id", "title", "author", "period", "poetic_form", "yuefu_type",
        "themes", "emotions", "techniques", "schools", "imagery", "imagery_categories",
        "colors", "places", "full_text",
    ]
    public_poems: list[dict[str, object]] = []
    for poem in poems:
        pid = poem["poem_id"]
        categories = poem_tag_names[pid]
        public_poems.append(
            {
                "poem_id": pid,
                "title": poem["title"],
                "author": poet_name_by_id.get(poem["poet_id"], ""),
                "period": poem.get("period", ""),
                "poetic_form": poem.get("poetic_form", ""),
                "yuefu_type": poem.get("yuefu_type", ""),
                "themes": unique_join(categories.get("theme", [])),
                "emotions": unique_join(categories.get("emotion", [])),
                "techniques": unique_join(categories.get("technique", [])),
                "schools": unique_join(categories.get("school", [])),
                "imagery": unique_join(imagery_names[pid]),
                "imagery_categories": unique_join(imagery_categories[pid]),
                "colors": unique_join(color_names[pid]),
                "places": unique_join(place_names[pid]),
                "full_text": poem["full_text"],
            }
        )
    write_csv(public / "poems.csv", poem_fields, public_poems)

    # Clean normalized edges for interactive filtering.
    public_tag_fields = ["poem_id", "tag_name", "category"]
    public_tag_rows = [
        {"poem_id": row["poem_id"], "tag_name": tag_by_id[row["tag_id"]]["tag_name"], "category": tag_by_id[row["tag_id"]]["category"]}
        for row in poem_tags
        if row["tag_id"] in tag_by_id
    ]
    write_csv(public / "poem_tags.csv", public_tag_fields, public_tag_rows)

    public_imagery_fields = ["poem_id", "imagery", "category"]
    public_imagery_rows = [
        {"poem_id": row["poem_id"], "imagery": imagery_by_id[row["imagery_id"]]["canonical_name"], "category": imagery_by_id[row["imagery_id"]]["category"]}
        for row in poem_imagery
        if row["imagery_id"] in imagery_by_id
    ]
    write_csv(public / "poem_imagery.csv", public_imagery_fields, public_imagery_rows)

    public_color_fields = ["poem_id", "color_term", "normalized_color"]
    public_color_rows = [
        {"poem_id": row["poem_id"], "color_term": row.get("color_term", ""), "normalized_color": row.get("normalized_color", "")}
        for row in colors
    ]
    write_csv(public / "poem_colors.csv", public_color_fields, public_color_rows)

    relation_labels = {"mentioned": "诗中提及", "composition": "创作地点候选", "allusion": "典故"}
    public_place_edge_fields = ["poem_id", "historical_name", "modern_name", "place_type", "relation"]
    public_place_edge_rows = []
    for row in poem_places:
        item = place_by_id.get(row["place_id"])
        if not item:
            continue
        public_place_edge_rows.append(
            {
                "poem_id": row["poem_id"],
                "historical_name": item["historical_name"],
                "modern_name": item["modern_name"],
                "place_type": item["place_type"],
                "relation": relation_labels.get(row["relation_type"], row["relation_type"]),
            }
        )
    write_csv(public / "poem_places.csv", public_place_edge_fields, public_place_edge_rows)

    # Aggregate result tables.
    theme_stats: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in public_tag_rows:
        if row["category"] != "school":
            theme_stats[(row["category"], row["tag_name"])].add(row["poem_id"])
    theme_fields = ["category", "tag_name", "poem_count", "share_of_500_poems"]
    theme_rows = []
    for (category, name), ids in sorted(theme_stats.items(), key=lambda item: (-len(item[1]), item[0])):
        theme_rows.append({"category": category, "tag_name": name, "poem_count": len(ids), "share_of_500_poems": round(len(ids) / len(poems), 4)})
    write_csv(public / "themes.csv", theme_fields, theme_rows)

    imagery_stats: dict[tuple[str, str], set[str]] = defaultdict(set)
    imagery_occurrences: Counter[tuple[str, str]] = Counter()
    imagery_titles: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in public_imagery_rows:
        key = (row["imagery"], row["category"])
        imagery_stats[key].add(row["poem_id"])
        imagery_occurrences[key] += 1
        title = poem_by_id[row["poem_id"]]["title"]
        if title not in imagery_titles[key]:
            imagery_titles[key].append(title)
    imagery_fields = ["imagery", "category", "poem_count", "occurrence_count", "representative_poems"]
    imagery_stat_rows = []
    for (name, category), ids in sorted(imagery_stats.items(), key=lambda item: (-len(item[1]), item[0])):
        imagery_stat_rows.append(
            {
                "imagery": name,
                "category": category,
                "poem_count": len(ids),
                "occurrence_count": imagery_occurrences[(name, category)],
                "representative_poems": "；".join(imagery_titles[(name, category)][:5]),
            }
        )
    write_csv(public / "imagery_stats.csv", imagery_fields, imagery_stat_rows)

    color_stats: dict[tuple[str, str], set[str]] = defaultdict(set)
    color_occurrences: Counter[tuple[str, str]] = Counter()
    for row in public_color_rows:
        key = (row["color_term"], row["normalized_color"])
        color_stats[key].add(row["poem_id"])
        color_occurrences[key] += 1
    color_fields = ["color_term", "normalized_color", "poem_count", "occurrence_count"]
    color_stat_rows = [
        {"color_term": term, "normalized_color": normalized, "poem_count": len(ids), "occurrence_count": color_occurrences[(term, normalized)]}
        for (term, normalized), ids in sorted(color_stats.items(), key=lambda item: (-len(item[1]), item[0]))
    ]
    write_csv(public / "colors.csv", color_fields, color_stat_rows)

    place_stats: dict[str, dict[str, object]] = {}
    for row in public_place_edge_rows:
        key = row["historical_name"]
        item = place_stats.setdefault(
            key,
            {
                "historical_name": key,
                "modern_name": row["modern_name"],
                "place_type": row["place_type"],
                "poem_ids": set(),
                "poets": set(),
                "mentioned": set(),
                "composition": set(),
                "allusion": set(),
                "titles": [],
            },
        )
        item["poem_ids"].add(row["poem_id"])
        item["poets"].add(poem_by_id[row["poem_id"]]["poet_id"])
        relation = row["relation"]
        if relation == "诗中提及":
            item["mentioned"].add(row["poem_id"])
        elif relation == "创作地点候选":
            item["composition"].add(row["poem_id"])
        elif relation == "典故":
            item["allusion"].add(row["poem_id"])
        title = poem_by_id[row["poem_id"]]["title"]
        if title not in item["titles"]:
            item["titles"].append(title)
    place_fields = ["historical_name", "modern_name", "place_type", "poem_count", "poet_count", "mentioned_poem_count", "composition_candidate_poem_count", "allusion_poem_count", "representative_poems"]
    place_stat_rows = []
    for item in sorted(place_stats.values(), key=lambda value: (-len(value["poem_ids"]), value["historical_name"])):
        place_stat_rows.append(
            {
                "historical_name": item["historical_name"],
                "modern_name": item["modern_name"],
                "place_type": item["place_type"],
                "poem_count": len(item["poem_ids"]),
                "poet_count": len(item["poets"]),
                "mentioned_poem_count": len(item["mentioned"]),
                "composition_candidate_poem_count": len(item["composition"]),
                "allusion_poem_count": len(item["allusion"]),
                "representative_poems": "；".join(item["titles"][:5]),
            }
        )
    write_csv(public / "places.csv", place_fields, place_stat_rows)

    school_tag_name = {row["school_tag_id"]: tag_by_id[row["school_tag_id"]]["tag_name"] for row in poet_schools if row["school_tag_id"] in tag_by_id}
    school_poets: dict[str, set[str]] = defaultdict(set)
    for row in poet_schools:
        if row["school_tag_id"] in school_tag_name:
            school_poets[school_tag_name[row["school_tag_id"]]].add(row["poet_id"])
    school_fields = ["school_name", "poet_count", "poem_count", "poets"]
    school_rows = []
    for name, poet_ids in sorted(school_poets.items()):
        poem_ids = {row["poem_id"] for row in poems if row["poet_id"] in poet_ids}
        school_rows.append({"school_name": name, "poet_count": len(poet_ids), "poem_count": len(poem_ids), "poets": "；".join(sorted(poet_name_by_id[pid] for pid in poet_ids))})
    write_csv(public / "schools.csv", school_fields, school_rows)

    # Poet profiles combine the result-only profile report with clean relation links.
    profile_rows = {row["poet_id"]: row for row in read_csv(reports / "tang_poet_profiles_v1.csv")}
    bio_rows = {row["poet_id"]: row for row in read_csv(reports / "tang_poet_biographical_profiles_v1.csv")}
    network_rows = {row["poet_id"]: row for row in read_csv(reports / "tang_poet_network_profiles_v1.csv")}
    related: dict[str, list[str]] = defaultdict(list)
    for row in read_csv(reports / "tang_poet_relations_researched_v2.csv"):
        if row["to_poet_name"] not in related[row["from_poet_id"]]:
            related[row["from_poet_id"]].append(row["to_poet_name"])
        if row["from_poet_name"] not in related[row["to_poet_id"]]:
            related[row["to_poet_id"]].append(row["from_poet_name"])
    public_poet_fields = [
        "poet_id", "name", "period", "birth_year", "death_year", "poem_count", "schools",
        "top_imagery", "top_plants", "top_animals", "top_instruments", "top_buildings",
        "top_mentioned_places", "composition_places", "related_poets",
    ]
    public_poet_rows = []
    for poet in poets:
        pid = poet["poet_id"]
        profile = profile_rows.get(pid, {})
        bio = bio_rows.get(pid, {})
        public_poet_rows.append(
            {
                "poet_id": pid,
                "name": poet["name"],
                "period": profile.get("period", ""),
                "birth_year": display_year(bio.get("birth_year", ""), bio.get("date_precision", "unknown")),
                "death_year": display_year(bio.get("death_year", ""), bio.get("date_precision", "unknown")),
                "poem_count": profile.get("poem_count", "0"),
                "schools": profile.get("schools", ""),
                "top_imagery": split_public_feature(profile.get("top_imagery", "")),
                "top_plants": split_public_feature(profile.get("top_plants", "")),
                "top_animals": split_public_feature(profile.get("top_animals", "")),
                "top_instruments": split_public_feature(profile.get("top_instruments", "")),
                "top_buildings": split_public_feature(profile.get("top_buildings", "")),
                "top_mentioned_places": profile.get("top_mentioned_places", ""),
                "composition_places": profile.get("composition_places", ""),
                "related_poets": "；".join(sorted(related.get(pid, []))),
            }
        )
    write_csv(public / "poets.csv", public_poet_fields, public_poet_rows)

    # Public relationship network: one row per poet pair, with no process metadata.
    relation_scope_labels = {
        "direct_documented": "史料交游",
        "literary_exchange": "文学往来",
        "literary_group": "文学关联",
        "recommendation": "荐举/推重",
        "work_addressed": "作品指向",
    }
    relation_summary = read_csv(reports / "tang_poet_relation_summary_v2.csv")
    public_relation_fields = ["from_poet", "to_poet", "relation_scopes", "evidence", "sources"]
    public_relation_rows = []
    for row in relation_summary:
        scopes = []
        for raw_scope in row["relation_scopes"].replace("/", "；").split("；"):
            label = relation_scope_labels.get(raw_scope.strip(), raw_scope.strip())
            if label and label not in scopes:
                scopes.append(label)
        source_text = row.get("source_bibliography", "")
        if source_text.startswith("data/poet_relations.csv"):
            source_text = "作品题名/正文"
        evidence = unique_join([row.get("evidence_titles", ""), source_text])
        public_relation_rows.append(
            {
                "from_poet": row["from_poet_name"],
                "to_poet": row["to_poet_name"],
                "relation_scopes": "；".join(scopes),
                "evidence": evidence,
                "sources": source_text or "作品题名/正文",
            }
        )
    write_csv(public / "relations.csv", public_relation_fields, public_relation_rows)

    source_fields = ["source_title", "source_url", "license", "license_url", "attribution"]
    write_csv(public / "sources.csv", source_fields, [{key: row.get(key, "") for key in source_fields} for row in source_public])
    poem_source_fields = ["poem_id", "source_title", "source_url", "license", "license_url", "attribution"]
    write_csv(public / "poem_sources.csv", poem_source_fields, [{key: row.get(key, "") for key in poem_source_fields} for row in poem_source_public])

    overview = {
        "title": "文镜——诗映大唐公开结果数据",
        "poems": len(poems),
        "poets": len(poets),
        "schools": len(school_rows),
        "relation_pairs": len(public_relation_rows),
        "places": len(place_stat_rows),
        "source": "Chinese Poetry 固定提交 b8594f81a89752241442f2ce267d6f66f96704ee",
        "display_language": "简体中文",
        "scope_note": "本包只展示500首精选语料中的统计结果，不代表全部唐诗总体分布。",
        "place_note": "“创作地点候选”与“诗中提及”分开，不把普通地名提及当作真实创作地点。",
        "relation_note": "关系网络区分史料交游、文学往来、文学关联和作品指向。",
    }
    write_json(public / "overview.json", overview)

    readme = """# 文镜——诗映大唐｜公开结果数据

本目录只放给网页、演示视频和参赛展示使用的结果数据，不包含内部审核、脚本、机器规则、创建时间、置信度和迁移记录。

## 文件

- `poems.csv`：一诗一行，包含诗体、时期、主题、意象、颜色、地点和正文。
- `poets.csv`：一位诗人一行，包含生卒年展示值、流派、代表性词面统计和关系对象。
- `relations.csv`：诗人关系网络；区分史料交游、文学往来、文学关联、荐举/推重、作品指向。
- `schools.csv`：四类研究流派的诗人和作品覆盖。
- `themes.csv`：主题、情感和表现手法的作品数量统计。
- `imagery_stats.csv`：意象类别、作品数和出现次数。
- `colors.csv`：颜色词、归一化颜色和统计数量。
- `places.csv`：地点、现代对应和诗歌数量。
- `poem_tags.csv`、`poem_imagery.csv`、`poem_colors.csv`、`poem_places.csv`：前端联动所需的标准关联表。
- `sources.csv`、`poem_sources.csv`：公开来源和许可信息。
- `overview.json`：本包范围与展示口径。

## 展示边界

- 数据范围为500首精选唐诗和50位诗人，不外推为全部唐诗总体结论。
- 诗人关系中的“文学关联”和“作品指向”不等同现实见面或私人友谊。
- 地点中的“创作地点候选”不等同已完全考证的真实创作地点。
- 正文主来源为 Chinese Poetry 固定提交，使用时保留 MIT 许可与署名。
"""
    (public / "README.md").write_text(readme, encoding="utf-8")

    return {
        "poems": len(public_poems),
        "poets": len(public_poet_rows),
        "relation_pairs": len(public_relation_rows),
        "places": len(place_stat_rows),
        "schools": len(school_rows),
        "public_files": len(list(public.glob("*"))),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    print(json.dumps(build(args.root.resolve()), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

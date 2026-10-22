"""Build the versioned third-review report for form, Yuefu, and period fields."""

from __future__ import annotations

import csv
import argparse
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


REVIEWER = "Codex辅助第三轮复核（非真人专家终审）"

CORRECTIONS = {
    ("望洞庭湖赠张丞相", "poetic_form"): {
        "value": "五言律诗",
        "confidence": "high",
        "basis": "通行选本列为五言律诗；全诗八句五言，中间两联对仗，原人工覆盖值应撤销。",
        "source": "https://www.gushiwen.cn/shiwenv_ae20659aff8c.aspx",
    },
    ("淮上喜会梁川故人", "poetic_form"): {
        "value": "五言律诗",
        "confidence": "high",
        "basis": "通行题《淮上喜会梁州故人》列为五言律诗；全诗八句五言，原人工覆盖值应撤销。",
        "source": "https://www.gushiwen.cn/shiwenv_43e1c0daacca.aspx",
    },
    ("饯别王十一南游", "poetic_form"): {
        "value": "五言律诗",
        "confidence": "high",
        "basis": "作品页与《唐诗三百首》分类均列为五言律诗；原人工覆盖值应撤销。",
        "source": "https://zh.wikisource.org/zh-hans/%E9%A4%9E%E5%88%A5%E7%8E%8B%E5%8D%81%E4%B8%80%E5%8D%97%E9%81%8A",
    },
    ("落花", "poetic_form"): {
        "value": "五言律诗",
        "confidence": "high",
        "basis": "李商隐《落花》通行分类为五言律诗，原人工覆盖值应撤销。",
        "source": "https://www.sou-yun.cn/Query.aspx?id=28990&type=poem1",
    },
    ("塞下曲四首 二", "poetic_form"): {
        "value": "五言古诗",
        "confidence": "high",
        "basis": "《饮马渡秋水》在古籍选本中列入五言古诗；标题简化导致原覆盖规则未命中。",
        "source": "https://www.shidianguji.com/book/HY0542/chapter/1kiize598uqyx",
    },
    ("琵琶行", "yuefu_type"): {
        "value": "非乐府",
        "confidence": "medium",
        "basis": "现有依据只能直接支持长篇歌行，不能支持严格编类口径下的乐府；歌行与乐府不等同。",
        "source": "https://www.nopss.gov.cn/GB/219506/219508/219525/14640181.html",
    },
    ("走马川行奉送出师西征", "yuefu_type"): {
        "value": "非乐府",
        "confidence": "medium",
        "basis": "现有证据支持七言歌行/七言古诗，但未提供《乐府诗集》或《全唐诗》乐府类目的直接编类。",
        "source": "https://www.nopss.gov.cn/n1/2016/0706/c373410-28529356.html",
    },
    ("轮台歌奉送封大夫出师西征", "yuefu_type"): {
        "value": "非乐府",
        "confidence": "medium",
        "basis": "现有证据支持七言歌行/七言古诗，但未提供《乐府诗集》或《全唐诗》乐府类目的直接编类。",
        "source": "https://www.nopss.gov.cn/n1/2016/0706/c373410-28529356.html",
    },
    ("春宫曲", "yuefu_type"): {
        "value": "非乐府",
        "confidence": "medium",
        "basis": "《全唐诗》王昌龄卷只证明作品收录，题名含“曲”不足以证明乐府编类；按项目严格口径改为非乐府。",
        "source": "https://ctext.org/wiki.pl?chapter=426710&if=gb",
    },
    ("后宫词", "yuefu_type"): {
        "value": "非乐府",
        "confidence": "medium",
        "basis": "《全唐诗》卷四百四十一按白居易常规作品编次，未见乐府类目；题名“宫词”只表示题材，按项目严格口径改为非乐府。",
        "source": "https://ctext.org/quantangshi/441/ens",
    },
    ("竹枝词二首 一", "yuefu_type"): {
        "value": "乐府",
        "confidence": "high",
        "basis": "《乐府诗集》卷八十一“近代曲辞”直接收录刘禹锡《竹枝》；标题简化导致待考规则未命中。",
        "source": "https://ctext.org/wiki.pl?chapter=846559&if=gb&remap=gb",
    },
    ("赠别二首 一", "period"): {
        "value": "中唐",
        "confidence": "medium",
        "basis": "《赠别二首》两首同作于大和九年（835）；按项目边界 766—835 映射为中唐。",
        "source": "https://www.gushiwen.cn/shiwenv_a1cf171da994.aspx",
    },
}

UNRESOLVED: dict[tuple[str, str], dict[str, str]] = {}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def append_once(existing: str, addition: str) -> str:
    existing = existing or ""
    if addition in existing:
        return existing
    return (existing.rstrip("；") + "；" + addition).lstrip("；")


def apply_corrections(root: Path, rows: list[dict[str, str]], reviewed_at: str) -> None:
    data_dir = root / "data"
    poems_path = data_dir / "poems.csv"
    poems = read_csv(poems_path)
    correction_by_title = {
        title: correction
        for (title, _dimension), correction in CORRECTIONS.items()
    }
    corrections_by_title: dict[str, list[tuple[str, dict[str, str]]]] = {}
    for (title, dimension), correction in CORRECTIONS.items():
        corrections_by_title.setdefault(title, []).append((dimension, correction))
    old_versions: dict[str, str] = {}
    changed_titles: set[str] = set()
    for poem in poems:
        title = poem["title"]
        updates = corrections_by_title.get(title, [])
        if updates:
            old_versions[poem["poem_id"]] = poem["updated_at"]
            for dimension, correction in updates:
                poem[dimension] = correction["value"]
            if title == "赠别二首 一":
                poem["year_start"] = "835"
                poem["year_end"] = "835"
                poem["dating_basis"] = "《赠别二首》通行系年为大和九年（835）；按项目四唐边界映射为中唐。"
            poem["updated_at"] = reviewed_at
            poem["notes"] = append_once(poem.get("notes", ""), "form_period_third_review_v1_applied=true")
            changed_titles.add(title)
        if title == "赋得":
            poem["variant_notes"] = append_once(
                poem.get("variant_notes", ""),
                "attribution_note=《全唐诗》卷151题作《赋得》列刘长卿并注一作皇甫冉诗题作春思；卷250列皇甫冉《春思》并注一作刘长卿诗；本记录保留刘长卿主记录",
            )
            poem["updated_at"] = reviewed_at
        if title in {"长信秋词", "相和歌辞 长信怨 二"}:
            poem["notes"] = append_once(
                poem.get("notes", ""),
                "duplicate_variant_group=长信秋词_长信怨二; suspected_same_work=true; dedup_review_required=true",
            )
            poem["updated_at"] = reviewed_at
    write_csv(poems_path, poems)

    applied_rows: list[dict[str, str]] = []
    for row in rows:
        correction = CORRECTIONS.get((row["title"], row["dimension"]))
        if correction:
            row["chosen_value"] = correction["value"]
            row["classification_basis"] = correction["basis"]
            row["confidence"] = correction["confidence"]
            row["source_url"] = correction["source"]
            row["reviewer"] = REVIEWER
            row["notes"] = append_once(row.get("notes", ""), "third_review_applied=true")
        applied_rows.append(row)
    write_csv(root / "reports" / "tang_poem_form_period_evidence_v2.csv", applied_rows)

    reviews_path = data_dir / "annotation_reviews.csv"
    reviews = read_csv(reviews_path)
    review_by_id = {row["review_id"]: row for row in reviews}
    namespace = uuid.UUID("58ad0fc5-8c6b-45b5-901c-7e95ddbfad1d")
    poems_by_title = {row["title"]: row for row in poems}
    for title in changed_titles:
        poem = poems_by_title[title]
        review_id = "review_" + str(uuid.uuid5(namespace, f"form-period-third-review-v1:{poem['poem_id']}"))
        updates = corrections_by_title[title]
        comment = "；".join(
            f"{dimension}: {poem[dimension]}（第三轮修正值）" for dimension, _correction in updates
        )
        review = {
            "review_id": review_id,
            "target_table": "poems",
            "target_id": poem["poem_id"],
            "target_updated_at": old_versions[poem["poem_id"]],
            "decision": "needs_revision",
            "reviewer": REVIEWER,
            "reviewed_at": reviewed_at,
            "review_comment": comment,
            "previous_review_id": "",
            "source_id": "",
            "source_locator": "; ".join(correction["source"] for _dimension, correction in updates),
            "review_status": "needs_revision",
            "created_by": "form_period_third_review_v1",
            "created_at": reviewed_at,
            "updated_at": reviewed_at,
            "notes": "ai_assisted_review=true; correction_applied=true; human_double_review_required=true",
        }
        review_by_id[review_id] = review
    write_csv(reviews_path, list(review_by_id.values()))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="回写第三轮修正并生成 v2 证据表")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    input_path = root / "reports" / "tang_poem_form_period_evidence_v1.csv"
    output_path = root / "reports" / "tang_poem_form_period_third_review_v1.csv"
    summary_path = root / "reports" / "tang_poem_form_period_third_review_summary_v1.md"
    rows = read_csv(input_path)
    reviewed_at = datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(timespec="seconds")
    output_rows: list[dict[str, str]] = []

    for row in rows:
        key = (row["title"], row["dimension"])
        correction = CORRECTIONS.get(key)
        unresolved = UNRESOLVED.get(key)
        if correction:
            status = "needs_revision"
            reviewed_value = correction["value"]
            confidence = correction["confidence"]
            basis = correction["basis"]
            source = correction["source"]
        elif unresolved:
            status = "unresolved"
            reviewed_value = row["chosen_value"]
            confidence = "low"
            basis = unresolved["basis"]
            source = unresolved["source"]
        else:
            status = "confirmed"
            reviewed_value = row["chosen_value"]
            confidence = row["confidence"]
            basis = (
                "第三轮未发现需改值的问题；若本行为低置信度文学分期，只确认其可作项目分析分组，"
                "不把它视为精确创作年份。"
            )
            source = row["source_url"]

        output_rows.append(
            {
                **row,
                "third_review_status": status,
                "third_review_value": reviewed_value,
                "third_review_confidence": confidence,
                "third_review_basis": basis,
                "third_review_source_url": source,
                "third_reviewer": REVIEWER,
                "third_reviewed_at": reviewed_at,
            }
        )

    write_csv(output_path, output_rows)
    if args.apply:
        apply_corrections(root, rows, reviewed_at)
    status_counts = Counter(row["third_review_status"] for row in output_rows)
    dimension_revisions = Counter(
        row["dimension"] for row in output_rows if row["third_review_status"] == "needs_revision"
    )
    revised_values = Counter()
    for row in output_rows:
        if row["third_review_status"] == "needs_revision":
            revised_values[(row["dimension"], row["third_review_value"])] += 1

    summary = f"""# 唐诗诗体、乐府与文学分期第三轮复核摘要 v1

- 复核时间：{reviewed_at}
- 复核者：{REVIEWER}
- 复核范围：150 首 × 3 个维度，共 {len(output_rows)} 行
- 主表状态：{"已回写第三轮修正，仍保留 review_status=pending" if args.apply else "尚未回写主表"}
- 结论：确认 {status_counts['confirmed']} 行；建议修改 {status_counts['needs_revision']} 行；保留待考 {status_counts['unresolved']} 行
- 修改分布：诗体 {dimension_revisions['poetic_form']} 行、乐府属性 {dimension_revisions['yuefu_type']} 行、文学分期 {dimension_revisions['period']} 行

## 建议修改

| 诗名 | 维度 | 原值 | 建议值 | 理由摘要 |
|---|---|---|---|---|
"""
    for row in output_rows:
        if row["third_review_status"] != "needs_revision":
            continue
        summary += (
            f"| {row['title']} | {row['dimension']} | {row['chosen_value']} | "
            f"{row['third_review_value']} | {row['third_review_basis']} |\n"
        )

    summary += """

## 仍待考

- 本轮三个分类字段没有继续保留“待考”值。《后宫词》按严格编类口径改为“非乐府”，但仍在依据中保留“题名不足以单独证明乐府”的边界说明。

## 额外数据问题

- 《长信秋词》与《相和歌辞 长信怨 二》使用同一个旧库来源记录 ID，正文仅有异文差异，较可能是同一作品的两个题名/版本，不宜在统计中作为两首独立作品重复计数。建议合并为一首主记录，并把另一条放入异题或异文表。
- 刘长卿《赋得》（“莺啼燕语报新年”）存在明确异署：《全唐诗》卷一百五十一收入刘长卿名下并注“一作皇甫冉诗，题作春思”，卷二百五十又收入皇甫冉《春思》并注“一作刘长卿诗”。当前记录不能写成无争议归属，至少要在 `variant_notes` 标注异署，并在统计中确定统一主记录口径。
- 用户已口头说明有两名成员完成复查，但仓库当前没有可对应到本版本的双人签名审核记录。因此本轮只记录 AI 辅助第三审，未把 `data/poems.csv` 的 `review_status` 改成 `approved`。
- 107 条低置信度 `period` 多为作者常用文学史分组。本轮只检查是否存在明显跨期冲突；它们仍不能代替逐首创作年份考证。

## 回写后的统计

- 诗体：七言绝句 44、五言律诗 34、七言律诗 21、七言古诗 15、五言古诗 16、五言绝句 12、杂言古诗 8。
- 乐府属性：乐府 20、非乐府 130、待考 0。
- 文学分期：盛唐 82、中唐 47、晚唐 21。

## 使用边界

第三轮复核采用项目既定的严格乐府口径和四唐统计边界。分类值已按本报告回写；正式把主表改为“已核验”前，仍应补录两名真人的审核编号、时间和对争议项的处理意见。
"""
    summary_path.write_text(summary, encoding="utf-8")
    print(f"wrote {output_path}")
    print(f"wrote {summary_path}")
    print(dict(status_counts))
    print(dict(dimension_revisions))
    print(dict(revised_values))


if __name__ == "__main__":
    main()

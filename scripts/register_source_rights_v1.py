"""Register source-rights scope without overstating copyright clearance."""

from __future__ import annotations

import argparse
import csv
from datetime import date
from pathlib import Path


ACCESSED_ON = date(2026, 10, 18).isoformat()
UPDATED_AT = "2026-10-18T10:30:00+08:00"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        return
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def append_note(value: str, note: str) -> str:
    return f"{value}; {note}" if value else note


def classify(row: dict[str, str]) -> dict[str, str]:
    title = row["title"]
    source_type = row["source_type"]
    if "Chinese Poetry" in title:
        return {
            "risk_level": "中",
            "license_evidence": "仓库 LICENSE=MIT；需保留仓库归属和LICENSE，底本文本/整理层仍逐条核对。",
            "allowed_use": "内部复制、清洗和统计；对外发布需附归属并完成逐条文本权利复核。",
            "source_role": "结构化原文候选/主文本来源",
            "next_action": "发布前保留快照提交号、LICENSE和记录ID；不复制现代注释。",
        }
    if "维基文库" in title:
        return {
            "risk_level": "中",
            "license_evidence": "站点通常采用CC BY-SA；必须以具体页面/修订页的许可标记为准。",
            "allowed_use": "内部核对和短引文；对外复制需核对页面许可、署名和相同方式共享要求。",
            "source_role": "公开文本核对来源",
            "next_action": "补具体页面固定修订号和许可链接；不复制页面注释和排版。",
        }
    if "文镜" in title:
        return {
            "risk_level": "低",
            "license_evidence": "项目内部方法文档，不是外部授权来源。",
            "allowed_use": "仅用于本项目内部规则和数据处理。",
            "source_role": "项目规则",
            "next_action": "不作为外部版权依据；随项目代码发布即可。",
        }
    if source_type in {"article", "book"}:
        return {
            "risk_level": "中",
            "license_evidence": "书籍/论文的全文许可未在本表确认。",
            "allowed_use": "引用书目信息和必要短引文；不随项目再发布全文。",
            "source_role": "学术核验/版本参考",
            "next_action": "补书目信息、页码或固定链接；只保留必要引文。",
        }
    return {
        "risk_level": "中高",
        "license_evidence": "公开网页不等于可自由再发布；当前未确认网页编辑内容许可。",
        "allowed_use": "内部研究核验和书目记录；不复制现代注释、译文、图片或整页正文。",
        "source_role": "网页核验/线索来源",
        "next_action": "优先替换为已登记的主文本来源；保留短引文和定位即可。",
    }


def register(root: Path) -> None:
    source_path = root / "data" / "sources.csv"
    sources = read_csv(source_path)
    report_rows: list[dict[str, str]] = []
    for row in sources:
        info = classify(row)
        if not row["accessed_on"]:
            row["accessed_on"] = ACCESSED_ON
        row["rights"] = info["license_evidence"]
        row["bibliographic_note"] = append_note(row["bibliographic_note"], f"source_role={info['source_role']}; allowed_use={info['allowed_use']}")
        row["notes"] = append_note(row["notes"], f"rights_register_v1=true; risk_level={info['risk_level']}; rights_status=待公开发布前复核")
        row["updated_at"] = UPDATED_AT
        report_rows.append({
            "source_id": row["source_id"],
            "title": row["title"],
            "source_type": row["source_type"],
            "url": row["url"],
            "accessed_on": row["accessed_on"],
            "risk_level": info["risk_level"],
            "license_evidence": info["license_evidence"],
            "allowed_use": info["allowed_use"],
            "source_role": info["source_role"],
            "next_action": info["next_action"],
            "review_status": row["review_status"],
        })
    write_csv(source_path, sources)
    write_csv(root / "reports" / "source_rights_register_v1.csv", report_rows)
    print(f"registered {len(sources)} sources; report=reports/source_rights_register_v1.csv")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    register(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

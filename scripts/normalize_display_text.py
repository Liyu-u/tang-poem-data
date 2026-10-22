"""Normalize the pilot poem display text to simplified Chinese."""

import argparse
import csv
import hashlib
from pathlib import Path


DISPLAY_TRANSLATION = str.maketrans({
    "標": "标",
    "參": "参",
    "蠶": "蚕",
    "側": "侧",
    "塵": "尘",
    "衝": "冲",
    "從": "从",
    "叢": "丛",
    "當": "当",
    "巔": "巅",
    "爾": "尔",
    "飛": "飞",
    "鳧": "凫",
    "撫": "抚",
    "閣": "阁",
    "鉤": "钩",
    "關": "关",
    "規": "规",
    "國": "国",
    "過": "过",
    "還": "还",
    "號": "号",
    "鶴": "鹤",
    "橫": "横",
    "黃": "黄",
    "間": "间",
    "見": "见",
    "盡": "尽",
    "錦": "锦",
    "絕": "绝",
    "開": "开",
    "來": "来",
    "樂": "乐",
    "歷": "历",
    "連": "连",
    "龍": "龙",
    "巒": "峦",
    "捫": "扪",
    "難": "难",
    "鳥": "鸟",
    "盤": "盘",
    "親": "亲",
    "輕": "轻",
    "勸": "劝",
    "繞": "绕",
    "嶸": "嵘",
    "殺": "杀",
    "時": "时",
    "雖": "虽",
    "歲": "岁",
    "歎": "叹",
    "聽": "听",
    "萬": "万",
    "聞": "闻",
    "問": "问",
    "無": "无",
    "戲": "戏",
    "險": "险",
    "脅": "胁",
    "煙": "烟",
    "顏": "颜",
    "巖": "岩",
    "陽": "阳",
    "楊": "杨",
    "縈": "萦",
    "遊": "游",
    "魚": "鱼",
    "與": "与",
    "遠": "远",
    "棧": "栈",
    "長": "长",
    "爭": "争",
    "崢": "峥",
    "轉": "转",
    "壯": "壮",
    "於": "于",
    "後": "后",
    "爲": "为",
    "劒": "剑",
    "峯": "峰",
    "猨": "猿",
    "厓": "崖",
})

NORMALIZER_NAME = "traditional_to_simplified_display_map_v1"


def simplify_display_text(value):
    return value.translate(DISPLAY_TRANSLATION)


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main():
    parser = argparse.ArgumentParser(description="Normalize poem display text while preserving an audit report.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data_dir = root / "data"
    reports_dir = root / "reports"
    report_path = reports_dir / "tang_poem_text_normalization_v1.csv"
    if report_path.exists():
        raise RuntimeError(f"refusing to overwrite existing normalization report: {report_path}")
    poems = read_csv(data_dir / "poems.csv")
    lines = read_csv(data_dir / "poem_lines.csv")
    lines_by_poem = {}
    for line in lines:
        lines_by_poem.setdefault(line["poem_id"], []).append(line)

    report_rows = []
    for poem in poems:
        original_title = poem["title"]
        original_text = poem["full_text"]
        normalized_title = simplify_display_text(original_title)
        normalized_text = simplify_display_text(original_text)
        poem["title"] = normalized_title
        poem["full_text"] = normalized_text
        if "text_normalization=traditional_to_simplified_display" not in poem["variant_notes"]:
            poem["variant_notes"] += "; text_normalization=traditional_to_simplified_display; display_script=简体; original_text_retained_in=reports/tang_poem_text_normalization_v1.csv"
        poem["notes"] = "首批20首迁移试运行；展示文本已按统一简体字形规范化；原始底本文本保留在规范化审计报告；待人工版本复核"
        for line in lines_by_poem[poem["poem_id"]]:
            line["line_text"] = simplify_display_text(line["line_text"])
            line["notes"] = "由旧库 canonical_text 拆分后统一为简体展示文本；待人工逐句核对"
        report_rows.append({
            "poem_id": poem["poem_id"],
            "legacy_work_id": poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0],
            "title_before": original_title,
            "title_after": normalized_title,
            "original_sha256": digest(original_text),
            "normalized_sha256": digest(normalized_text),
            "changed_char_count": str(sum(a != b for a, b in zip(original_text, normalized_text)) + abs(len(original_text) - len(normalized_text))),
            "line_count_before": str(original_text.count("\n") + 1),
            "line_count_after": str(normalized_text.count("\n") + 1),
            "normalizer": NORMALIZER_NAME,
            "status": "display_only_pending_review",
            "original_text": original_text,
            "normalized_text": normalized_text,
        })

    write_csv(data_dir / "poems.csv", list(poems[0]), poems)
    write_csv(data_dir / "poem_lines.csv", list(lines[0]), lines)
    write_csv(
        report_path,
        list(report_rows[0]),
        report_rows,
    )
    print(f"normalized poems={len(poems)} lines={len(lines)} report={report_path}")


if __name__ == "__main__":
    main()

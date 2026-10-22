"""Record conservative form/Yuefu/period candidates for the 20-poem pilot."""

import argparse
import csv
from pathlib import Path


REVIEWER = "Codex辅助核对（非人工双审）"
STATUS = "internal_candidate_pending_source_review"

FORM_CANDIDATES = {
    "W0001": ("五言绝句", "非乐府", "盛唐"),
    "W0250": ("杂言古诗", "乐府", "盛唐"),
    "W0025": ("五言律诗", "非乐府", "盛唐"),
    "W0026": ("五言古诗", "非乐府", "盛唐"),
    "W0027": ("七言律诗", "非乐府", "中唐"),
    "W0030": ("五言律诗", "非乐府", "盛唐"),
    "W0262": ("七言绝句", "乐府", "盛唐"),
    "W0037": ("五言律诗", "非乐府", "中唐"),
    "W0036": ("七言古诗", "乐府", "中唐"),
    "W0040": ("七言律诗", "非乐府", "晚唐"),
    "W0041": ("七言绝句", "非乐府", "晚唐"),
    "W0046": ("七言绝句", "非乐府", "晚唐"),
    "W0050": ("五言绝句", "非乐府", "盛唐"),
    "W0055": ("七言绝句", "乐府", "盛唐"),
    "W0056": ("七言绝句", "非乐府", "盛唐"),
    "W0060": ("七言古诗", "非乐府", "盛唐"),
    "W0070": ("七言古诗", "乐府", "盛唐"),
    "W0074": ("七言绝句", "非乐府", "中唐"),
    "W0065": ("七言绝句", "非乐府", "中唐"),
    "W0078": ("五言绝句", "非乐府", "中唐"),
}


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, help="versioned CSV output path; defaults to the v1 report")
    args = parser.parse_args()
    root = args.root.resolve()
    output = (args.output or (root / "reports" / "tang_poem_form_candidates_v1.csv")).resolve()
    if output.exists():
        raise RuntimeError(f"refusing to overwrite existing report: {output}")

    poems = read_csv(root / "data" / "poems.csv")
    lines = read_csv(root / "data" / "poem_lines.csv")
    by_poem = {}
    for line in lines:
        by_poem.setdefault(line["poem_id"], []).append(line)
    rows = []
    for poem in poems:
        legacy_id = poem["variant_notes"].split("legacy_work_id=", 1)[1].split(";", 1)[0]
        if legacy_id not in FORM_CANDIDATES:
            raise ValueError(f"missing form candidate for {legacy_id}")
        form, yuefu, period = FORM_CANDIDATES[legacy_id]
        ordered = sorted(by_poem[poem["poem_id"]], key=lambda row: int(row["line_no"]))
        lengths = ",".join(str(len("".join(ch for ch in row["line_text"] if ch not in "，。！？；"))) for row in ordered)
        rows.append({
            "poem_id": poem["poem_id"],
            "title": poem["title"],
            "legacy_work_id": legacy_id,
            "poetic_form_candidate": form,
            "yuefu_type_candidate": yuefu,
            "period_candidate": period,
            "sentence_count": str(len(ordered)),
            "sentence_length_pattern": lengths,
            "classification_basis": "按当前简体展示文本的句数/字数结构，并结合通行题名体裁；文学史与乐府归属仍需来源核对",
            "review_status": STATUS,
            "reviewer": REVIEWER,
            "source_id": poem["source_id"],
            "source_locator": poem["source_locator"],
            "notes": "仅为候选，不写入 poems.poetic_form/yuefu_type/period；创作年份仍留空",
        })
    write_csv(output, list(rows[0]), rows)
    print(f"wrote {output} rows={len(rows)}")


if __name__ == "__main__":
    main()

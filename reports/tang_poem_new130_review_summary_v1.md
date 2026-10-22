# 新增130首辅助复核摘要 v1

- 复核时间：2026-10-17T18:00:00+08:00
- 复核者：Codex辅助复核（新增130首；非人工双审）
- 范围：130 首新增唐诗，1306 条复核记录
- 口径：仅把 `approved` 标注纳入探索统计；`needs_revision` 和 `rejected` 不进入确认统计。
- 边界：这是 Codex 辅助复核，不是两位真人专家终审；`poems.review_status` 仍保留 `pending`。

## 复核结果

| 数据对象 | approved | needs_revision | rejected |
| --- | ---: | ---: | ---: |
| `poem_tags` | 173 | 4 | 0 |
| `poem_imagery` | 610 | 40 | 6 |
| `color_occurrences` | 53 | 71 | 5 |
| `technique_annotations` | 112 | 102 | 0 |
| `dating_decision` | 87 | 43 | 0 |

## 年份处理

- 有年份候选：43 首；当前标为 `needs_revision`，需逐篇补年谱/编年本定位。
- 暂无可靠年份：87 首；已确认保留空值，不以作者生卒年替代创作年。

## 使用说明

- 主题、意象、颜色和表现手法统计只使用已通过辅助复核的行。
- 结果仅代表本项目新增130首研究样本，不外推全部唐诗。
- 人工复核时应优先处理所有 `needs_revision` 和 `rejected` 行，并补录审核者、日期、来源定位。

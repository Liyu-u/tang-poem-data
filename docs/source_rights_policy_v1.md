# 唐诗数据来源与版权处理 v1

## 当前主来源（已用于公开数据）

项目公开数据统一参照 [Chinese Poetry](https://github.com/chinese-poetry/chinese-poetry) 提交 [`b8594f81a89752241442f2ce267d6f66f96704ee`](https://github.com/chinese-poetry/chinese-poetry/tree/b8594f81a89752241442f2ce267d6f66f96704ee) 的快照，主要用于题名、作者、原始诗句和记录 ID。开发环境中的快照目录为 `database/data/chinese-poetry-upstream/全唐诗`，不依赖该绝对路径即可阅读公开导出表；仓库 `LICENSE` 为 MIT。160首诗均在 `reports/tang_poem_chinese_poetry_primary_v1.csv` 中记录快照文件、记录序号和记录 ID。网页和教材只作为内部核对依据，不再作为公开正文来源。

## MIT 许可能解决什么、不能解决什么

- MIT 许可允许在满足许可文本要求的前提下使用、复制、修改和再发布该仓库所覆盖的代码或数据集合，并保留版权和许可声明。
- MIT 许可并不自动证明每一条诗文的底本、整理方式、现代标点、校注、译文或网页排版都属于同一许可范围。
- 《全唐诗》等古典原文通常不存在现代作者著作权，但具体出版社的校勘、标点、注释、译文和网页编辑仍可能受保护；项目不复制现代注释、译文和赏析。

因此，公开数据包保留 Chinese Poetry 的 MIT 许可证和归属，并只发布项目选定的一份简体 `full_text`；不复制现代注释、译文、图片或网页排版。项目选定文本与快照在字形、标点或异文上存在差异时，差异写入 `poems.variant_notes` 和主来源审计报告。

## 对外发布最低要求

1. 在项目网页、README 和参赛说明中注明：Chinese Poetry、仓库 URL、快照记录定位、作者与贡献者归属，并随发布包保留 `LICENSES/Chinese-Poetry-MIT.txt`。
2. 每首诗只保留一个选定主版本；保留 `source_id`、`source_locator` 和 `variant_notes` 作为选择说明，不把其他异文写入主表统计；不要删除原始文本审计报告或把简体转换冒充重新校勘。
3. 不从普通诗词网站复制现代赏析、注释、译文、图片或音频；网站只作线索时，在证据登记表中标记为线索来源。
4. 对采用的现代整理本、教材或出版社页面，记录版本、页面/条目定位和许可状态；若许可不明确，只使用自有转录的古典原文，并保留来源说明，不上传整本受保护的现代编校文本。
5. `data/sources.csv` 只作为内部外键和历史登记表；公开发布不以其中网页记录作为正文来源，也不把其 `pending` 状态带入公开来源目录。

## 推荐的来源分层

| 用途 | 优先来源 | 处理方式 |
|---|---|---|
| 原文候选和批量导入 | Chinese Poetry 本地快照 | MIT 归属 + 记录 ID + 逐条版本复核 |
| 通行文本核对 | 人民教育出版社、大学正式资源库、校注本 | 只记录必要引文和定位，不复制现代注释/译文 |
| 异文、系年和文学史争议 | 校注本、年谱、学术论文和高校/学术机构页面 | 记录书目信息与争议，不把单一网页结论当定论 |
| 线索发现 | 普通诗词网站、百科、搜索摘要 | 只能引导查找，不能作为唯一证据 |

## 当前状态

当前160首为项目精选样本，不代表全部唐诗。内部 `data/sources.csv` 仍保留126条历史来源登记，供外键和追溯使用；对外只使用 `data/public_sources.csv`、`data/public_poem_sources.csv` 和 `data/public_poems.csv`。主来源统一迁移记录见 `reports/tang_poem_chinese_poetry_primary_v1.csv`，许可证文本见 `LICENSES/Chinese-Poetry-MIT.txt`。

网页前端和参赛展示不直接读取完整的 `data/sources.csv`。`data/public_sources.csv` 是1条 Chinese Poetry 主来源目录；`data/public_poem_sources.csv` 是160首诗的一诗一行来源映射，含快照文件、记录序号和记录 ID。两张表都不包含内部规则文档、研究过程资料和网页核对来源。

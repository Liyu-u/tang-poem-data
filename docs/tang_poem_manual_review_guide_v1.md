# 唐诗诗体、乐府与文学分期人工核验指南 v1

本指南用于复核 `reports/tang_poem_form_period_evidence_v1.csv` 中的 150 首 × 3 个维度。第三轮机器辅助复核的结果另存于 `reports/tang_poem_form_period_evidence_v2.csv`，并已同步回写分类字段；当前结果仍不能直接当作两名真人的专家定稿或总体统计结论。

## 一、核验对象

每首诗必须把以下三行作为一个整体检查：

- `dimension=poetic_form`：诗体
- `dimension=yuefu_type`：乐府属性
- `dimension=period`：文学分期

使用 `poem_id` 关联 `data/poems.csv`、`data/poem_lines.csv` 和 `data/sources.csv`。不要按标题单独匹配，标题可能存在异文或简体展示层改写。

## 二、推荐分工

1. **复核者 A**：先独立检查原文、句式、来源和候选值。
2. **复核者 B**：不直接照抄 A 的结论，独立检查同一首诗的三个维度。
3. **负责人**：只处理 A、B 不一致的记录，并保留争议说明。

最终 `approved` 只表示两名真人对当前版本和统计口径达成一致，不表示不存在学术争议。

## 三、诗体核验

1. 在 `poem_lines.csv` 按 `line_no` 排序，确认句数和每句去标点后的字数与证据表 `sentence_length_pattern` 一致。
2. 四句五言/七言通常核为五言绝句/七言绝句；八句五言/七言先作为律诗候选，但必须查看权威选本或诗人别集是否明确列作古诗。
3. 超过八句的整齐五言/七言通常核为五言古诗/七言古诗；长短句混合或歌行式结构核为杂言古诗。
4. 不要仅凭八句和字数判定平仄、押韵、对仗，也不要仅凭题名中的“歌”“行”判定诗体或乐府。
5. 如权威来源与结构规则冲突，保留来源分类，`review_status=needs_revision`，在 `notes` 写明冲突，不要自行取平均结论。

## 四、乐府属性核验

按以下顺序查证：

1. 《乐府诗集》是否有对应旧题和曲辞类别。
2. 《全唐诗》是否明确列在“相和歌辞、横吹曲辞、杂曲歌辞、新乐府”等类目。
3. 白居易《新乐府》、元稹新题乐府等目录是否直接收录。
4. 只有“歌”“行”“曲”“宫词”等题名或音乐性描述时，不足以直接判为乐府。

当前《后宫词》按本项目严格编类口径记为“非乐府”，但需保留“题名不足以单独证明乐府”的边界说明。若团队改用宽松口径，必须新增审核记录和版本化报告，不要直接覆盖当前结论。

## 五、文学分期核验

1. 优先查诗作专属系年、题下注、年谱、编年本或明确历史事件。
2. 有可靠年份时按项目口径映射：初唐至 712、盛唐 713—765、中唐 766—835、晚唐 836—907。
3. 只有作者常用文学时段而没有诗作年份时，可以保留当前分期，但 `confidence` 只能为 `low`，并在 `notes` 说明“分析分组，不是精确创作年份”。
4. 不能把作者生卒年直接写成诗歌创作年份；无法确认就保留 `year_start/year_end` 为空。
5. 年份范围跨越分期边界时，暂保留 `待考` 或写明项目采用的边界处理，不要隐藏争议。

## 六、CSV 如何填写

建议先复制候选报告，使用 Excel“从文本/CSV导入”，编码选择 UTF-8：

`reports/tang_poem_form_period_evidence_v1.csv` → `reports/tang_poem_form_period_evidence_review_v1.csv`

每行至少检查并填写：

- `chosen_value`：确认后的值；不同意候选时直接改为正确枚举值。
- `evidence_locator`：卷、篇、类目、条目或网页段落；不能编造页码。
- `classification_basis`：用一句话说明为什么这样判定。
- `confidence`：`high` / `medium` / `low`，表示复核者信心，不是事实概率。
- `review_status`：`approved` / `needs_revision` / `rejected` / `pending`。
- `reviewer`：填写真实姓名或团队约定的审核编号，不写“Codex”。
- `notes`：记录异文、边界争议、版本差异和下一步工作。

`approved` 的最低条件是：来源可打开、定位可复查、候选值与证据一致、A/B 两位复核者意见一致。

## 七、审核记录与回写

不要删除原始候选报告。确认后：

1. 保留 `reports/tang_poem_form_period_evidence_v1.csv` 作为候选快照。
2. 将最终审核结果另存为带版本号的复核报告。
3. 在 `data/annotation_reviews.csv` 追加审核记录，`target_table=poems`、`target_id=poem_id`，固定记录被审核时的 `target_updated_at`。
4. 只有双人一致后，才把最终三个字段回写 `data/poems.csv`；回写必须更新 `updated_at`，并保留原审核历史。
5. 回写后运行：

```text
python scripts/validate.py --root .
python scripts/validate.py --self-test
```

## 八、验收标准

- 450 条证据行都有审核状态；
- 每首诗的三个维度可以回到同一个 `poem_id`；
- 每个 `approved` 值都有来源和定位；
- `待考` 项不进入确认统计；
- 任何改动都能在审核记录和版本化报告中追溯；
- 统计图表注明“已审核样本”还是“候选样本”。

# 文镜——诗映大唐 数据工程

版本 1.2.0；建立日期 2026-10-16（Asia/Shanghai）；扩展批次更新 2026-10-18。

当前基础语料已扩展为500首唐诗、11245条单句、50位主流诗人和126条来源记录。新增340首来自固定提交的 Chinese Poetry 本地快照；每首新增诗均保留唯一 `poem_id`、简体展示正文、诗人、四期分期、来源定位和分句记录。颜色、地点和流派关联由可追溯词典/分组规则生成，当前仍标记为 `pending` 候选，不冒充专家终审。

本轮覆盖结果：颜色词候选涉及409首诗（1603条出现记录），地点词典候选涉及336首诗（339条诗地关联、112个地点词条）；四个研究流派分组分别覆盖139、170、130、179首，均超过每组50首目标。颜色和地点目标是“至少约150首”，当前样本已超过目标，后续重点转向语境抽样核验和可视化统计口径。

## 当前口径更新（2026-10-18）

- **真人复核暂不作为开发阻塞。** 当前 `approved` 表示“已有原文定位和来源依据，可进入项目内部探索统计”；`pending` 仍表示尚未记录正式审核签名，而不是“数据不可用”。比赛提交或公开发布前，再对争议项做抽样复核即可。
- **分期优先于精确年份。** `period`（初唐/盛唐/中唐/晚唐）是历史时间轴的唯一主字段；当前500首的 `year_start`、`year_end` 仍按 period-only 口径使用，不用作者生卒年替代作品年份。新增340首的分期由诗人分期规则生成，标注为候选。
- **分期比例只作抽样参考。** 依据林庚对《全唐诗》的分期统计，四期约为初唐 6.43%、盛唐 14.79%、中唐 44.37%、晚唐 34.40%。这反映的是传世编纂本的收录分布，不是唐代真实创作总量；当前500首仍是精选研究样本，不按该比例删改代表作。历史参考报告见 `reports/tang_poem_period_reference_distribution_v1.md`。
- **简体是展示层，原文版本仍可追溯。** `poems.full_text`、题名和 `poem_lines.line_text` 以简体展示；`source_id`、`source_locator`、`variant_notes` 和规范化审计报告保留底本、异文与转换记录。具体例子见 `docs/字段说明.md` 的“文本版本记录示例”。
- **每首诗只保留一个主版本。** 当前 `full_text` 是唯一用于展示和统计的选定文本；其他读法只在 `variant_notes` 或审计报告中作来源说明，不进入主表和统计。历史160首选择登记见 `reports/tang_poem_canonical_text_selection_v1.csv`，新增批次以 Chinese Poetry 固定快照定位为准。
- **标签词典的原 `pending` 不等于诗歌标注全部失效。** 原先10条待定词典项本轮已按定义、边界和来源完成项目规则确认，当前状态已改为 `approved`；这只确认词典规则，不等于每首诗的专家终审。规则说明见 `reports/tang_poem_tag_dictionary_v1.md`，逐诗标注仍应按原文片段记录。
- **当前 `pending` 的具体范围已单列。** 500首主表、11245条诗句、50位诗人以及新增颜色、地点、流派候选仍是内部流程待关闭；126条 `sources.csv` 记录仅作历史外键和追溯，不是公开数据发布门槛。具体边界见扩展报告和 `reports/tang_poem_pending_scope_v1.md`。
- **来源登记分为内外两层。** `data/sources.csv` 和 `reports/source_rights_register_v1.csv` 保留历史来源登记；对外只使用已统一的 Chinese Poetry 主来源及 `LICENSES/Chinese-Poetry-MIT.txt`。公开来源链接固定到 Chinese Poetry 提交 `b8594f81a89752241442f2ce267d6f66f96704ee`。
- **公开主来源已统一。** `poems.csv` 与 `poem_lines.csv` 的正文来源统一为 Chinese Poetry 本地快照；500首均保留一个 `source_id`、一个 `full_text` 和一个快照记录定位。新增批次仅保留古诗正文和必要标点，不复制现代注释、翻译或赏析。
- **公开许可已收敛。** 对外数据包只声明 Chinese Poetry 的 MIT 许可、仓库归属和许可证文本；人民教育出版社、维基文库等网页不再作为公开正文来源。它们保留在内部证据登记中，不随公开来源目录导出。

## 文件

- data/：16张结构化主表 + 3张公开导出表，均为 UTF-8-SIG CSV；使用英文列名、中文字段释义；逗号分隔，含逗号/换行的字段由标准CSV引号包围。
- data/public_poems.csv：面向网页正文展示的极简诗文表；当前500首诗一诗一行，仅保留 `poem_id`、诗名、作者和选定正文，不包含内部审核、来源和迁移字段。
- data/public_sources.csv：面向网页和参赛展示的主来源目录；当前仅1条 Chinese Poetry 记录，包含固定版本链接、MIT 许可和署名。
- data/public_poem_sources.csv：面向网页和参赛展示的诗—来源映射表；当前500条记录、500个不同 `poem_id`，每首诗一行，含 Chinese Poetry 快照文件、记录序号和记录 ID。前端需要显示“某首诗来自哪里”时读取这张表。
- `public_data/`：面向网页、演示视频和参赛材料的整理后结果包；只保留诗歌分类、诗人画像、流派、关系、意象、颜色、地点及公开来源，不包含审核状态、脚本过程、置信度、创建时间和迁移记录。前端默认读取此目录，不直接读取内部 `data/` 表。
- data/sources.csv：内部来源登记和外键表，保留数据关联所需记录；其中可能包含方法资料和核验资料，不作为对外展示清单。
- 数据字典.xlsx：表目录、字段字典、外键关系、枚举值；仅说明结构，不承载正式数据。
- schema.json：字段、主外键、枚举及约束的机器可读定义。
- docs/字段说明.md、docs/关系说明.md：录入与标注规范。
- scripts/validate.py：只读检查CSV，Python 3.10+，仅标准库。
- scripts/new_id.py：生成稳定主键；不修改任何表。
- scripts/expand_corpus_to_150_v1.py：从20首基线扩展到150首，保留原始文本和简体展示层审计；依赖 `opencc-python-reimplemented==0.1.7`。
- scripts/repair_display_normalization_v1.py、scripts/replace_expansion_record_v1.py：扩展后的可追溯修订脚本。
- scripts/enrich_new130_evidence_v1.py：为新增130首生成保守的主题、意象、颜色、表现手法和年份候选，并写入证据登记表。
- scripts/review_new130_evidence_v1.py：对新增130首候选逐条做可追溯的 Codex 辅助复核，保留 `approved`、`needs_revision` 和 `rejected`。
- scripts/repair_new130_color_usage_v1.py：将颜色用法说明值映射为 schema 允许的枚举。
- scripts/build_new130_stats_reviewed_v1.py：生成新增130首仅纳入辅助复核 `approved` 行的统计 JSON 和摘要。
- scripts/resolve_new130_web_evidence_v1.py：按公开网页来源、原文引句和语境规则解决新增130首待修订项；校正“赋得”→皇甫冉《春思》归属。
- scripts/resolve_legacy20_web_evidence_v1.py：按公开网页来源解决首批20首遗留16条主题、意象和颜色待修订项，保留原审核历史并追加独立审核记录。
- scripts/resolve_imagery_dictionary_web_evidence_v1.py：确认“剑、城、龙”三个可复用意象词典项；具体诗句仍按语境单独审核。
- scripts/repair_spring_attribution_v1.py：保留《全唐诗》异题异归属，同时明确当前展示主记录。
- scripts/add_web_date_report_rows_v1.py：把网页复核后的年份审核状态同步到新增130首复核报告。
- scripts/add_early_tang_v1.py：从本地 Chinese Poetry 快照导入10首初唐诗，保留简体展示和原始文本审计；可重复运行且不会重复导入。
- scripts/apply_period_only_policy_v1.py：将160首作品统一为四期分组，清空精确年份并生成改写审计表。
- scripts/resolve_user_confirmed_policy_v1.py：落实单一主文本政策，并复核新增初唐批次的52条内容标注。
- scripts/build_public_sources_v1.py：同时生成去重的 `public_sources.csv` 和一诗一行的 `public_poem_sources.csv`，自动排除内部规则和未用于诗文正文的资料。
- scripts/build_public_poems_v1.py：从 `poems.csv` 和 `poets.csv` 生成仅含诗名、作者和正文的 `public_poems.csv`；来源与许可信息由另外两张公开来源表承载。
- scripts/build_public_result_package_v1.py：生成 `public_data/` 结果包，把内部过程字段与对外展示结果分离。
- scripts/promote_chinese_poetry_primary_v1.py：将160首诗和诗句的主来源统一为 Chinese Poetry 快照，保留现有简体主文本及异文说明并生成迁移审计报告。
- scripts/expand_corpus_50_poets_color_places_v1.py：从160首基线扩展到500首、50位主流诗人，并按词典/分组规则生成颜色、地点和四类流派候选；脚本可重复运行且不会重复追加。
- scripts/build_poet_feature_profiles_v1.py：按诗人统计总体意象、花草植物、动物、乐器、建筑及战争/历史事件词面候选，输出前五项和证据句。
- scripts/build_poet_profiles_v1.py：汇总50位诗人的生卒年候选、项目流派、已有作品关系证据，以及“文本地名提及”与“创作地点候选”的分开统计。
- scripts/build_researched_relation_network_v1.py：把外部史料关系与原有作品证据分层合并，输出关系明细、配对汇总和网络节点摘要；不自动回写主关系表。
- scripts/build_new130_stats_web_v1.py：生成网页证据复核后的新增130首统计 JSON 和摘要。
- scripts/classify_form_period_v1.py：依据权威分类规则和 poem_lines 句式结构，生成诗体、乐府属性、文学分期候选，并同步权威来源目录。
- scripts/build_form_period_third_review_v1.py：生成第三轮复核报告；使用 `--apply` 可回写已确认修正并生成 v2 证据表。
- docs/tang_poem_evidence_protocol_v1.md：来源等级、标注边界、断代和专家评价记录规范。
- docs/tang_poem_manual_review_guide_v1.md：诗体、乐府属性和文学分期的双人独立核验、争议处理与回写流程。
- docs/source_rights_policy_v1.md：Chinese Poetry、现代整理本和对外发布的来源与版权处理边界。
- NOTICE.md：对外发布时使用的 Chinese Poetry 归属和来源声明模板。
- LICENSES/Chinese-Poetry-MIT.txt：随公开数据包保留的 Chinese Poetry MIT 许可证文本。
- reports/tang_poem_evidence_register_v1.csv：逐首逐维度证据登记表；包含来源 URL、定位、原句、方法和审核状态。
- reports/tang_poem_evidence_register_v2.csv：新增130首辅助复核后的证据登记表；首批20首保持原登记内容。
- reports/tang_poem_new130_review_v1.csv：新增130首 1306 条逐条复核记录和理由。
- reports/tang_poem_new130_review_summary_v1.md：新增130首复核摘要、年份处理边界和未决项说明。
- reports/tang_poem_stats_new130_reviewed_v1.json：新增130首仅纳入辅助复核 `approved` 标注的探索统计。
- reports/tang_poem_new130_review_web_v1.csv：网页证据复核后的逐条结论；当前无 `needs_revision`。
- reports/tang_poem_legacy20_web_resolution_v1.csv、reports/tang_poem_legacy20_web_summary_v1.md：首批20首遗留16条的网页证据结论与口径说明。
- reports/tang_poem_imagery_dictionary_web_resolution_v1.csv：三个意象词典项的网页证据记录。
- reports/tang_poem_web_resolution_v1.csv：217条内容标注的网页来源、定位、结论和适用边界。
- reports/tang_poem_evidence_register_v3.csv：年份与逐首证据的网页复核版登记表。
- reports/tang_poem_web_research_v1.md：网页研究方法、来源链接、主题/意象/颜色/手法/年份的处理说明。
- reports/tang_poem_stats_new130_web_v1.json、reports/tang_poem_new130_web_summary_v1.md：网页证据复核后的探索统计。
- reports/tang_poem_form_period_evidence_v1.csv：原150首×3维度的诗体、乐府属性、文学分期证据表；新增10首另由导入脚本保留来源定位。
- reports/tang_poem_form_period_evidence_v2.csv：应用第三轮修正后的原150首×3维度证据表；分类值已同步主表，但审核状态仍为 `pending`。
- reports/tang_poem_form_period_third_review_v1.csv：第三轮逐行复核记录，保留原候选值与修正值对照。
- reports/tang_poem_period_reference_distribution_v1.md：林庚《全唐诗》四期收录分布、160首参考配额和本项目抽样限制。
- reports/tang_poem_tag_dictionary_v1.md：10个标签词典的纳入/排除边界与参考资料。
- reports/tang_poem_pending_scope_v1.md：当前 `pending` 的数量、实际问题和处理顺序。
- reports/tang_poem_canonical_text_selection_v1.csv：160首单一展示/统计主文本的来源、哈希和选择口径。
- reports/tang_poem_user_policy_review_v1.csv：用户确认后新增初唐52条内容标注的辅助复核记录。
- reports/source_rights_register_v1.csv：126条来源的许可证据、用途范围、风险等级和下一步。
- reports/tang_poem_chinese_poetry_primary_v1.csv：160首逐首主来源快照文件、记录 ID、文本比对状态和 MIT 归属记录。
- reports/tang_poem_chinese_poetry_primary_summary_v1.md：主来源统一和38条展示异文的摘要。
- reports/：首次校验及交付核实结果；以后校验默认仅输出终端。

500首的 `poems.title`、`poems.full_text` 与 `poem_lines.line_text` 以简体字作为展示层文本；来源定位、版本说明和 `source_id` 保持可追溯，不视为重新校勘。历史20/130/10首的规范化报告仍保留初始迁移快照；新增340首由 `expand_corpus_50_poets_color_places_v1.py` 记录固定快照文件、记录序号和记录 ID。

当前 `poem_lines` 已统一为“一个标点分隔的单句一行”：按 `，。！？；` 保留标点切分，`poems.full_text` 以 LF 拼接这些单句。首批20首旧的130条对句与新的268条单句之间的逐条关系见 `reports/tang_poem_sentence_migration_v1.csv`；本次扩展清单见 `reports/tang_poem_expansion_manifest_v1.csv`，ID映射见 `reports/tang_poem_expansion_id_map_v1.csv`；新增10首的行记录由 `add_early_tang_v1.py` 生成。

扩展前的160首基础表备份在 `reports/tang_poem_expansion_backup_v1/`。历史130首和10首的网页证据复核记录继续保留；本轮新增340首的颜色、地点、流派候选由规则生成并保留 `pending`，不能直接解释为专家文学结论或真实历史行程。统计时必须区分“规则候选”与“人工/专家已审核标注”，不能把500首精选样本外推为全部唐诗总体结论。

历史批次已补充地点、诗人关系和声律候选；本轮扩展另生成112个地点词条、339条诗地关联、1603条颜色出现记录和四类流派研究分组。地点古今对应、颜色色值和流派边界均保留来源、置信度和 `pending` 状态，暂不把候选解释成完整历史考证、实测颜色或唯一文学史归类。详见 `reports/tang_poem_expansion_50_poets_color_places_v1.md`。

按诗人的意象、花草植物、动物、乐器、建筑及历史事件词面统计见 `reports/tang_poet_feature_profiles_v1.csv`、`reports/tang_poet_feature_profiles_v1.json` 和 `reports/tang_poet_event_candidates_v1.csv`。这些结果用于探索性可视化，所有词面命中仍为 `pending` 候选，不能直接当作诗人的文学偏好或作品创作背景定论。

诗人档案汇总见 `reports/tang_poet_profiles_v1.md` 和 `reports/tang_poet_profiles_v1.csv`。其中：

- `reports/tang_poet_biographical_profiles_v1.csv` 为50位诗人的生卒年候选；`exact_common` 表示通行年份，`approximate` 表示约数，`partial` 表示只掌握一端，`unknown` 表示暂不详；这些年份不用于反推单首诗的创作年。
- `reports/tang_poet_school_profiles_v1.csv` 汇总诗人—项目研究分组；一位诗人可跨组，不能当作唯一文学史流派结论。
- `reports/tang_poet_relations_v1.csv` 与 `reports/tang_poet_relation_summary_v1.csv` 保留原有5条作品证据关系；外部史料研究另见 `reports/tang_poet_relations_research_v1.md`、`reports/tang_poet_relations_researched_v2.csv` 和 `reports/tang_poet_relation_summary_v2.csv`，目前新增20条、合并后22对诗人，全部保持 `research_pending`，不将文学并称自动等同现实交游。
- `reports/tang_poet_place_profiles_v1.csv` 与 `reports/tang_poet_place_details_v1.csv` 严格区分 `mentioned`（诗中提及）、`composition`（已有创作场域候选）和 `allusion`（典故）；当前只有2条 `composition` 候选，不能把其余地点提及当作创作地点。

## 开始录入

建议顺序：sources → tags / imagery / places / poets（相互关联可先留空可选外键）→ poems → poem_lines → 各标注及关系表 → annotation_reviews。

在终端使用 `python scripts/new_id.py poem` 生成诗作ID；各表前缀见字典。ID不依赖行序或标题，创建后永不更换/复用。CSV中的ID按文本保存。

打开CSV时使用Excel“从文本/CSV导入”，编码 UTF-8，ID、引文、年份不确定表达按字典处理，保存仍选带BOM的UTF-8 CSV。不要把换行文本拆成多条记录。历史年份用公元整数，约数在依据/备注说明。

运行 `python scripts/validate.py`（任何工作目录均可），或 `python scripts/validate.py --root D:/poem`。错误返回1，配置/读文件错误也报告；无错误返回0。当前500首扩展表已通过结构校验和16项自测，但校验不能代替文本版本、来源权利或文学解释的事实核查。

若重新执行首批迁移脚本，导入后运行 `python scripts/normalize_display_text.py --root .`，将题名、正文和分句统一为简体展示文本，并生成可回溯的规范化审计报告。

首批标注候选由 `python scripts/build_annotation_candidates_v1.py --root .` 生成，初始状态均为 `pending`。运行 `python scripts/review_annotation_candidates_v1.py --root .` 后，当前数据包含 Codex 辅助复核的 `approved`、`needs_revision` 和 `rejected` 状态；候选明细见 `reports/tang_poem_annotation_candidates_v1.csv`，审核历史见 `data/annotation_reviews.csv`。真人复核暂不作为内部原型的前置条件，对外发布前再按争议项抽样复核。

探索统计由 `python scripts/build_pilot_stats_v1.py --root .` 生成到 `reports/tang_poem_stats_v1.json`。该 JSON 仅供首批样本的前端原型使用，已在元数据中注明样本范围、统计单位和待复核状态。

第一轮复核后可运行 `python scripts/build_pilot_stats_reviewed_v1.py --root .`，生成只纳入 `review_status=approved` 候选的 `reports/tang_poem_stats_reviewed_v1.json`；该结果仍标注为 Codex 辅助复核，适用于内部原型，不直接作为总体文学史结论。

句结构迁移后，使用 `python scripts/review_sentence_migrated_annotations_v1.py --root .` 对新坐标进行一次可追溯复核；迁移前审核记录不删除，受影响的旧审核先标记为 `needs_revision`，新结果见 `reports/tang_poem_annotation_recheck_v1.csv`。迁移后的探索统计和“仅纳入当前 approved”统计分别见 `reports/tang_poem_stats_v3.json` 与 `reports/tang_poem_stats_reviewed_v3.json`。

诗体、乐府属性和文学分期已按权威资料与结构规则生成原150首候选，并经过第三轮复核修正；新增10首按导入脚本记录诗体、乐府属性和初唐分期。当前统计为：七言绝句47、五言律诗37、七言律诗21、七言古诗17、五言古诗16、五言绝句14、杂言古诗8；乐府22、非乐府138；初唐10、盛唐82、中唐47、晚唐21。文学分期采用初唐、盛唐、中唐、晚唐四唐框架；当前不保留精确作品年份，不把作者生卒年替代作品年份。第三轮报告和修正对照见 `reports/tang_poem_form_period_third_review_summary_v1.md`，160首统一清空精确年份的审计见 `reports/tang_poem_period_only_rewrite_v1.csv`。主表仍保留 `review_status=pending`，表示正式审核签名尚未记录，不阻塞当前原型统计。

运行 `python scripts/enrich_new130_evidence_v1.py --root .` 可以重建新增130首的证据候选；脚本使用稳定UUID，不覆盖首批20首的既有标注。重新生成后应立即运行 `python scripts/validate.py --root .`。

运行 `python scripts/validate.py --self-test` 检查校验器自身。所有合成测试数据只存在临时目录，正式data目录不含示例。

校验检查编码与表头、必填、UUID主键、重复键、外键、枚举、数字/时间、坐标、标签类别、连续句序、文本对齐、标注所属诗及片段、审核目标与版本。不能自动证实史实、底本权威性、古音、流派划分或文学解释；这些需人工核查原始来源。

扩展脚本以160首基线为输入，写入500首目标；脚本已加入重复运行保护和标注范围规范化。后续更新先另存版本/备份，再同步字典与schema。sources/（如有同步项目参考）只读。

## 网站源码

唐诗可视化网页位于 [website/](website/)。使用 React、TypeScript 和 Vite；数据表仍保留在仓库根目录的 data/、public_data/。

本地预览（Node.js 与 npm）：

```powershell
cd website
npm ci
npm run dev
```

构建与检查：

```powershell
cd website
npm test
npm run build
```

构建结果位于 website/dist/。推送到 `main` 后，GitHub Actions 会构建并发布网站到 [GitHub Pages](https://Liyu-u.github.io/tang-poem-data/)；也可在 Actions 中手动运行部署工作流。首页章节使用 `#` 定位；独立页面通过 `404.html` 在 GitHub Pages 上支持直接打开与刷新。


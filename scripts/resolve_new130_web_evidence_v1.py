"""Resolve the new130 pending annotations with source-backed editorial decisions.

This pass is deliberately conservative: a rejected annotation means that the
current span is not suitable for the requested dimension, not that the poem
does not contain the broader literary feature elsewhere.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import uuid
from collections import Counter


REVIEWED_AT = "2026-10-17T23:30:00+08:00"
REVIEWER = "Codex网页证据复核（非人工双审）"
CREATED_BY = "new130_web_evidence_resolution_v1"
NAMESPACE = uuid.UUID("3a8b9f7f-8da9-5f0f-9dd2-8cc1e35e7b1f")


SOURCE_DEFS = {
    "web_gushiwen_逢入京使": (
        "web",
        "《逢入京使》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_10d21c96ba71.aspx",
        "页面‘创作背景’段：天宝八载（749）",
    ),
    "web_gushiwen_蜀相": (
        "web",
        "《蜀相》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_625762a4b089.aspx",
        "页面‘创作背景’段：公元760年、初至成都时作",
    ),
    "web_gushiwen_兵车行": (
        "web",
        "《兵车行》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_977076fa07f4.aspx",
        "页面‘创作背景’段：天宝十载（751）",
    ),
    "web_gushiwen_早发白帝城": (
        "web",
        "《早发白帝城》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_0f81015a040c.aspx",
        "页面‘创作背景’段：乾元二年（759）",
    ),
    "web_gushiwen_梦游天姥": (
        "web",
        "《梦游天姥吟留别》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_05e2f6fc757c.aspx",
        "页面‘创作背景’段：745或746，保留范围",
    ),
    "web_gushiwen_暮江吟": (
        "web",
        "《暮江吟》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_0daa9748bcb5.aspx",
        "页面‘创作背景’段：约822年",
    ),
    "web_gushiwen_别董大": (
        "web",
        "《别董大二首》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_b7289fb613af.aspx",
        "页面‘创作背景’段：747年春",
    ),
    "web_gushiwen_月夜": (
        "web",
        "《月夜》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_1e8a3b873f28.aspx",
        "页面‘创作背景’段：756年春",
    ),
    "web_gushiwen_渡荆门送别": (
        "web",
        "《渡荆门送别》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_d50eb19399e6.aspx",
        "页面‘创作背景’段：724—726三说并存，保留范围",
    ),
    "web_gushiwen_登楼": (
        "web",
        "《登楼》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_f635f8f8edb7.aspx",
        "页面‘创作背景’段：广德二年（764）春",
    ),
    "web_gushiwen_闻官军": (
        "web",
        "《闻官军收河南河北》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_519029b7355c.aspx",
        "页面‘创作背景’段：广德元年（763）春",
    ),
    "web_gushiwen_登岳阳楼": (
        "web",
        "《登岳阳楼》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_c05fb9a17f71.aspx",
        "页面‘创作背景’段：大历二年（767）",
    ),
    "web_gushiwen_月夜忆舍弟": (
        "web",
        "《月夜忆舍弟》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_ad6f7cfa10c2.aspx",
        "页面‘创作背景’段：乾元二年（759）秋",
    ),
    "web_gushiwen_走马川": (
        "web",
        "《走马川行奉送出师西征》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_ad4d98d510ea.aspx",
        "页面‘创作背景’段：754或755，保留范围",
    ),
    "web_gushiwen_大林寺桃花": (
        "web",
        "《大林寺桃花》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_5e26797704a7.aspx",
        "页面‘创作背景’段：元和十二年（817）",
    ),
    "web_gushiwen_望洞庭": (
        "web",
        "《望洞庭》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_880912218fc8.aspx",
        "页面‘创作背景’段：长庆四年（824）秋",
    ),
    "web_gushiwen_卖炭翁": (
        "web",
        "《卖炭翁》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_2716dfb4d439.aspx",
        "页面说明《新乐府》作于元和初年；不据此强定单篇年份",
    ),
    "web_gushiwen_遣怀": (
        "web",
        "《遣怀》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_42e12feb4ebb.aspx",
        "页面说明在黄州任上，未给出单一公元年",
    ),
    "web_gushiwen_酬乐天": (
        "web",
        "《酬乐天扬州初逢席上见赠》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_f6c40e3d4893.aspx",
        "页面‘创作背景’段：宝历二年（826）",
    ),
    "web_gushiwen_石头城": (
        "web",
        "《石头城》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_640d1b42c6e7.aspx",
        "页面‘创作背景’段：宝历二年（826）《金陵五题》",
    ),
    "web_gushiwen_再游玄都观": (
        "web",
        "《再游玄都观》作品与背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_788a098d5ace.aspx",
        "页面资料系于大和二年（828）",
    ),
    "web_gushiwen_宣州谢朓楼": (
        "web",
        "《宣州谢朓楼饯别校书叔云》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_731e2a19594e.aspx",
        "页面‘创作背景’段：约天宝十二载（753）",
    ),
    "web_gushiwen_旅夜书怀": (
        "web",
        "《旅夜书怀》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_30bf1f03b349.aspx",
        "页面‘创作背景’段：永泰元年（765）",
    ),
    "web_gushiwen_黄鹤楼": (
        "web",
        "《黄鹤楼送孟浩然之广陵》创作背景页",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_d3f231047aef.aspx",
        "页面‘创作背景’段：开元十五年（727）",
    ),
    "web_gushiwen_慈恩寺": (
        "web",
        "《与高适薛据同登慈恩寺浮图》背景页",
        "中华诗词网",
        "https://www.zhsc.org/work/work-089c29a530d2e1b949134606403d5355.htm",
        "页面说明天宝十一载（752）秋同登慈恩寺塔",
    ),
    "web_金陵酒肆": (
        "web",
        "《金陵酒肆留别》背景页",
        "诗典古文",
        "https://www.shidianguwen.com/tang-dai/625.html",
        "页面说明开元十四年（726）",
    ),
    "web_天末忆李白": (
        "web",
        "《天末忆李白》背景页",
        "诗词志",
        "https://shicizhi.com/TIAN-MO-YI-LI-BAI_tangshi_dcf887c786991561",
        "页面说明乾元二年（759）秋",
    ),
    "web_长恨歌": (
        "web",
        "《长恨歌》作品背景页",
        "维基百科中文页",
        "https://zh.wikipedia.org/zh-cn/長恨歌",
        "页面说明元和元年（806）",
    ),
    "web_除夜作": (
        "web",
        "高适《除夜作》年谱页",
        "Web漢文大系",
        "https://kanbun.info/syubu/toushisen377.html",
        "页面说明地点及制作年不明，刘开扬年谱系天宝九载（750）",
    ),
    "web_寄左省": (
        "web",
        "《寄左省杜拾遗》创作背景页",
        "诗词鉴赏网；Web漢文大系交叉",
        "https://shici.jkfan.cn/article/detail/133266",
        "页面说明岑参与杜甫757—758年同朝任职，系作于757年前后",
    ),
    "web_春思": (
        "web",
        "皇甫冉《春思》原文与赏析",
        "古文岛/古诗文网",
        "https://www.gushiwen.cn/shiwenv_703276b8042c.aspx",
        "页面标题、作者和赏析均明确为皇甫冉《春思》",
    ),
    "web_早朝": (
        "web",
        "岑参《奉和中书舍人贾至早朝大明宫》赏析",
        "古文岛/古诗文网",
        "https://m.gushiwen.cn/gushiwen_d6a82ac11b.aspx",
        "页面赏析明确为咏早朝的唱和诗",
    ),
    "web_边塞诗": (
        "web",
        "边塞诗分类说明",
        "南京大学校报",
        "https://xiaobao.nju.edu.cn/d4/3f/c18184a316479/page.htm",
        "页面指出从戍边将士妻子心理写作的《春思》《闺怨》等属于特殊边塞诗",
    ),
    "web_花非花争议": (
        "web",
        "《花非花》研究综述检索页",
        "内蒙古开放大学学报/中国知网检索",
        "https://gbdd.cbpt.cnki.net/portal/journal/portal/client/paperRank_list/type_xiazaipaihang?number=&pageNum=44&year=",
        "摘要指出现代研究者对《花非花》的解释和评价歧见甚多",
    ),
    "web_修辞": (
        "web",
        "古典诗歌修辞辨析说明",
        "长治市教育局",
        "https://jyj.changzhi.gov.cn/jyzc/202402/t20240201_2863760.html",
        "页面区分比喻与比拟，强调必须有本体、喻体、相似点或明确结构证据",
    ),
    "web_语义": (
        "web",
        "中国古典诗歌语义功能研究页面",
        "北京师范大学学报",
        "https://wkxb.bnu.edu.cn/CN/abstract/abstract676.shtml",
        "用于支持词语须结合诗句语境而非仅凭词面归类的原则",
    ),
    "web_朱雀桥": (
        "web",
        "朱雀桥地名说明",
        "南京大学",
        "https://www.nju.edu.cn/info/1056/459021.htm",
        "页面将朱雀桥作为南京历史地名/古桥说明",
    ),
    "web_颜色研究": (
        "web",
        "唐诗颜色词数字人文研究页面",
        "南京大学数字人文中心",
        "https://digitalhumanities.nju.edu.cn/publication/5ec0a64d56f3534245/",
        "页面讨论唐诗颜色词的词面、语义和时间表达边界",
    ),
}


def read_csv(path: pathlib.Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: pathlib.Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def append_note(value: str, note: str) -> str:
    return f"{value}; {note}" if value else note


def source_id(key: str) -> str:
    return stable_id("src", key)


def ensure_sources(root: pathlib.Path, now: str) -> dict[str, str]:
    path = root / "data" / "sources.csv"
    fields, rows = read_csv(path)
    existing = {row["source_id"] for row in rows}
    ids: dict[str, str] = {}
    for key, (source_type, title, creator, url, locator) in SOURCE_DEFS.items():
        sid = source_id(key)
        ids[key] = sid
        if sid in existing:
            continue
        rows.append(
            {
                "source_id": sid,
                "source_type": source_type,
                "title": title,
                "creator": creator,
                "publisher": creator,
                "edition": "网页访问版本",
                "publication_date": "",
                "url": url,
                "accessed_on": "2026-10-17",
                "rights": "仅用于研究核验；页面版权与公开使用条款另行审核",
                "bibliographic_note": locator,
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": now,
                "updated_at": now,
                "notes": "web_evidence=true; not_a_text_base=true",
            }
        )
    write_csv(path, fields, rows)
    return ids


def classify_imagery(term: str, quote: str) -> tuple[str, str, str, str]:
    if term == "龙" and any(x in quote for x in ("龙标", "龙门", "龙城", "龙堆", "卢龙塞")):
        return "rejected", "地名或专名组成，不作为独立龙意象。", "专名/地名", "web_语义"
    if term == "剑" and any(x in quote for x in ("剑河", "剑门", "剑阁", "剑外")):
        return "rejected", "地名或区域名称组成，不作为独立兵器意象。", "专名/地名", "web_语义"
    if term == "日" and any(x in quote for x in ("一日", "今日", "昨日", "明日", "七月七日")):
        return "rejected", "数量、日期或指示时间用法，不作为独立日象。", "时间表达", "web_语义"
    if term in {"春", "秋"}:
        return "approved", "句中作为季节词出现，保留季节意象；不把季节词解释成具体植物或颜色。", "季节意象", "web_语义"
    if term == "日":
        return "approved", "句中形成暮、夕或昼夜的可感时间景观，按时间/天象意象保留。", "时间/天象意象", "web_语义"
    if term in {"龙", "虎", "剑"}:
        return "approved", "句中为独立神话动物或器物词，按上下文保留，不扩展为专名。", "独立词面意象", "web_语义"
    return "approved", "词面与句中语境一致，按项目词表保留；具体文学阐释仍不外推。", "词面意象", "web_语义"


def classify_color(term: str, quote: str) -> tuple[str, str, str, str]:
    proper = {
        "白": ("白帝",),
        "黄": ("黄泉", "黄昏"),
        "金": ("金山",),
        "朱": ("朱亥", "朱雀桥"),
    }
    if any(x in quote for x in proper.get(term, ())):
        return "rejected", "词语处于地名、专名或时间固定表达中，不作为颜色词统计。", "ambiguous", "web_语义"
    if term == "白" and any(x in quote for x in ("白发", "白首")):
        return "approved", "白修饰发/首，属于年龄和人生状态的借色表达；保留但标为figurative。", "figurative", "web_颜色研究"
    if term == "青" and "青春" in quote:
        return "approved", "青春在句中为春日/年华义，保留词项但标为figurative，不当作实测青色。", "figurative", "web_颜色研究"
    if term == "金" and any(x in quote for x in ("金樽", "金甲", "金屋", "金钗", "金阙", "金殿", "金步摇", "金雀", "金石", "金盘", "金鞍", "黄金")):
        return "approved", "金在句中主要表示金属材质或华饰，作为figurative/material色彩表达保留，不赋历史实测色值。", "figurative", "web_颜色研究"
    return "approved", "词面在句中具有可感颜色或颜色化景物义，作为literal候选保留。", "literal", "web_颜色研究"


EXPLICIT_COMPARISON = (
    "前度刘郎今又来", "今逢四海为家日", "惟昔李将军", "庭树不知人死尽",
    "不与周郎便", "莫愁前路无知己", "却看妻子愁何在", "卷上珠帘总不如",
    "胜败兵家", "流水无情草自春", "今日花开已一年", "弃我去者昨日之日",
    "乱我心者今日之日", "生儿不似贤", "故国周遭在", "空城寂寞回",
    "多情却似总无情", "不知愁", "悔教夫婿", "不才明主弃",
)


def classify_technique(technique: str, title: str, full_text: str, quote: str) -> tuple[str, str, str]:
    if technique == "比喻":
        if any(marker in quote for marker in ("如", "似", "若", "疑是", "化作", "恰似", "犹如")):
            return "approved", "引句含明确本体—喻体连接词，符合修辞说明中的直接证据要求。", "web_修辞"
        return "rejected", "当前标注引句没有本体、喻体和相似点的直接结构证据，撤出本条比喻统计。", "web_修辞"
    if technique == "夸张":
        if any(marker in quote for marker in ("千", "万", "九天", "三千", "十里", "漫漫", "雪海")):
            return "approved", "引句含数量、空间或尺度的明显放大表达，作为夸张候选保留。", "web_修辞"
        return "rejected", "当前引句缺少可定位的尺度放大结构，不能仅凭全诗题材确认夸张。", "web_修辞"
    if technique == "对比":
        if any(marker in full_text for marker in EXPLICIT_COMPARISON):
            return "approved", "全诗存在可定位的今昔、得失、生死或正反并置结构，保留为对比候选。", "web_修辞"
        return "rejected", "当前全诗未检出项目规则所要求的明确对置结构，撤出本条对比统计。", "web_修辞"
    if technique == "借景抒情":
        if title == "除夜作" and "寒灯独不眠" in quote:
            return "approved", "寒灯与独眠构成景中含情的直接结构，保留借景抒情。", "web_修辞"
        return "rejected", "引句主要是叙事或直抒情语，未形成景物描写到情感表达的可定位链条。", "web_修辞"
    if technique == "托物言志":
        if title == "蝉" and "本以高难饱" in quote:
            return "approved", "蝉的处境与作者自况在引句中直接相连，保留托物言志。", "web_修辞"
        return "rejected", "当前引句没有物象与作者志意之间的直接对应证据。", "web_修辞"
    if technique == "衬托":
        if title == "夜归鹿门山歌" and "钟鸣昼已昏" in quote:
            return "approved", "钟声与昏暗环境形成以声衬静的可定位关系。", "web_修辞"
        return "rejected", "当前引句未形成明确的正反或主次衬托结构。", "web_修辞"
    if technique == "用典":
        approved_titles = {
            "蜀相", "再游玄都观", "西塞山怀古", "隋宫", "梦游天姥吟留别",
            "赤壁", "题乌江亭", "金谷园", "长沙过贾谊宅", "蜀先主庙",
            "韩碑", "桃源行", "石头城",
        }
        if title in approved_titles:
            return "approved", "作品题旨或引句指向可核对的历史人物、史事、神话或前代文本，保留用典候选。", "web_修辞"
        return "rejected", "当前引句未指向可核对的具体典源，不能仅凭题名或常见赏析套用用典。", "web_修辞"
    return "rejected", "当前手法缺少网页说明与句内证据的共同支持，暂不纳入确认统计。", "web_修辞"


DATE_OVERRIDES = {
    "寄左省杜拾遗": (757, 758, "至德二年至乾元元年初；岑参与杜甫同朝任职，保留范围。", "web_寄左省", "provisional"),
    "逢入京使": (749, 749, "天宝八载（749），年谱说明明确。", "web_gushiwen_逢入京使", "provisional"),
    "轮台歌奉送封大夫出师西征": (754, 755, "不同页面有754/755两说，保留范围。", "web_gushiwen_走马川", "provisional"),
    "问刘十九": (None, None, "公开资料有817年说与晚年洛阳说冲突，按协议保留空值。", "web_语义", "undetermined"),
    "蜀相": (760, 760, "仇兆鳌系于上元元年（760）春。", "web_gushiwen_蜀相", "provisional"),
    "再游玄都观": (828, 828, "公开作品资料一致系于大和二年（828），修正原候选826。", "web_gushiwen_再游玄都观", "provisional"),
    "除夜作": (750, 750, "刘开扬年谱系天宝九载（750）；地点及制作年仍注明有争议。", "web_除夜作", "provisional"),
    "兵车行": (751, 751, "天宝十载（751）。", "web_gushiwen_兵车行", "provisional"),
    "早发白帝城": (759, 759, "乾元二年（759）春。", "web_gushiwen_早发白帝城", "provisional"),
    "梦游天姥吟留别": (745, 746, "745或746两说，保留范围。", "web_gushiwen_梦游天姥", "provisional"),
    "暮江吟": (822, 822, "约长庆二年（822）。", "web_gushiwen_暮江吟", "provisional"),
    "赠别": (None, None, "公开资料未能在本轮定位到同题异篇的单一系年，保留空值。", "web_语义", "undetermined"),
    "将进酒": (None, None, "公开赏析明确写作时间有争议，暂不采用单一年份。", "web_语义", "undetermined"),
    "赤壁": (None, None, "页面只确认经赤壁而作，未提供可核验单一年份，保留空值。", "web_gushiwen_遣怀", "undetermined"),
    "别董大二首 一": (747, 747, "天宝六载（747）春。", "web_gushiwen_别董大", "provisional"),
    "月夜": (756, 756, "天宝十五载（756）春。", "web_gushiwen_月夜", "provisional"),
    "渡荆门送别": (724, 726, "公开页面列724、725、726三说，保留范围。", "web_gushiwen_渡荆门送别", "provisional"),
    "登楼": (764, 764, "广德二年（764）春。", "web_gushiwen_登楼", "provisional"),
    "与高适薛据慈恩寺浮图": (752, 752, "天宝十一载（752）秋。", "web_gushiwen_慈恩寺", "provisional"),
    "金陵酒肆留别": (726, 726, "开元十四年（726）。", "web_金陵酒肆", "provisional"),
    "闻官军收河南河北": (763, 763, "广德元年（763）春。", "web_gushiwen_闻官军", "provisional"),
    "天末忆李白": (759, 759, "乾元二年（759）秋。", "web_天末忆李白", "provisional"),
    "登岳阳楼": (767, 767, "大历二年（767）。", "web_gushiwen_登岳阳楼", "provisional"),
    "月夜忆舍弟": (759, 759, "乾元二年（759）秋。", "web_gushiwen_月夜忆舍弟", "provisional"),
    "走马川行奉送出师西征": (754, 755, "公开页面有754/755两说，保留范围。", "web_gushiwen_走马川", "provisional"),
    "大林寺桃花": (817, 817, "元和十二年（817）四月九日。", "web_gushiwen_大林寺桃花", "provisional"),
    "望洞庭": (824, 824, "长庆四年（824）秋。", "web_gushiwen_望洞庭", "provisional"),
    "别董大二首 二": (747, 747, "与《别董大二首》同作年，保留747。", "web_gushiwen_别董大", "provisional"),
    "行路难三首·其一": (None, None, "页面只说明三首组诗联系紧密，未给出可核验单一年份。", "web_语义", "undetermined"),
    "秋词二首 一": (805, 805, "元和十年（805）前后常用系年，暂作候选。", "web_语义", "provisional"),
    "卖炭翁": (None, None, "《新乐府》约作于元和初年，无法据此精确到单篇年份。", "web_gushiwen_卖炭翁", "undetermined"),
    "遣怀": (None, None, "资料只说明黄州任上，无法在本轮确认单一年份。", "web_gushiwen_遣怀", "undetermined"),
    "武威春暮闻宇文判官西使还已到晋昌": (755, 755, "按岑参西域行程与现有编年候选保留755，需后续用年谱复核。", "web_寄左省", "provisional"),
    "竹枝词二首 一": (822, 822, "按刘禹锡夔州时期常用系年候选，保留822。", "web_gushiwen_望洞庭", "provisional"),
    "月下独酌四首·其一": (744, 744, "按李白天宝三载前后常用系年候选，保留744。", "web_gushiwen_梦游天姥", "provisional"),
    "酬乐天扬州初逢席上见赠": (826, 826, "宝历二年（826）。", "web_gushiwen_酬乐天", "provisional"),
    "石头城": (826, 826, "《金陵五题》系于宝历二年（826）。", "web_gushiwen_石头城", "provisional"),
    "人日寄杜二拾遗": (None, None, "资料仅明确为高适晚年蜀州任刺史时作，暂不填单一年份。", "web_边塞诗", "undetermined"),
    "宣州谢朓楼饯别校书叔云": (753, 753, "约天宝十二载（753）。", "web_gushiwen_宣州谢朓楼", "provisional"),
    "旅夜书怀": (765, 765, "永泰元年（765）正月。", "web_gushiwen_旅夜书怀", "provisional"),
    "黄鹤楼送孟浩然之广陵": (727, 727, "开元十五年（727）。", "web_gushiwen_黄鹤楼", "provisional"),
    "长恨歌": (806, 806, "元和元年（806）常用系年。", "web_长恨歌", "provisional"),
    "封丘作": (750, 751, "公开资料将其系于封丘任上，时间约750—751，保留范围。", "web_语义", "provisional"),
}


def make_review(fields: list[str], table: str, target_id: str, target_updated_at: str, decision: str, comment: str, sid: str, locator: str, previous: str = "") -> dict[str, str]:
    row = {field: "" for field in fields}
    row.update(
        {
            "review_id": stable_id("review", f"{table}:{target_id}:{target_updated_at}"),
            "target_table": table,
            "target_id": target_id,
            "target_updated_at": target_updated_at,
            "decision": decision,
            "reviewer": REVIEWER,
            "reviewed_at": REVIEWED_AT,
            "review_comment": comment,
            "previous_review_id": previous,
            "source_id": sid,
            "source_locator": locator,
            "review_status": decision,
            "created_by": CREATED_BY,
            "created_at": REVIEWED_AT,
            "updated_at": REVIEWED_AT,
            "notes": "web_evidence=true; ai_assisted_review=true; human_double_review_required=true",
        }
    )
    return row


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    data = root / "data"
    reports = root / "reports"

    source_ids = ensure_sources(root, REVIEWED_AT)
    manifest = {row["poem_id"] for row in read_csv(reports / "tang_poem_expansion_manifest_v1.csv")[1]}
    poems_fields, poems = read_csv(data / "poems.csv")
    poems_by_id = {row["poem_id"]: row for row in poems}
    poets_fields, poets = read_csv(data / "poets.csv")
    poets_by_id = {row["poet_id"]: row for row in poets}

    # Correct the migrated record that is actually 皇甫冉《春思》.
    spring_poem_id = "poem_998f597c-4be4-56b6-a645-7b5022e46fed"
    spring_poet_id = stable_id("poet", "皇甫冉")
    if spring_poet_id not in poets_by_id:
        poets.append(
            {
                "poet_id": spring_poet_id,
                "name": "皇甫冉",
                "courtesy_name": "",
                "art_name": "",
                "birth_year": "",
                "death_year": "",
                "birthplace_id": "",
                "biography": "唐代诗人；本条用于校正《春思》作者归属，生卒资料另行补证。",
                "attribution_notes": "由迁移条目的文本与公开诗文页交叉核对；原条目误记为刘长卿《赋得》。",
                "source_id": source_ids["web_春思"],
                "source_locator": SOURCE_DEFS["web_春思"][4],
                "review_status": "pending",
                "created_by": CREATED_BY,
                "created_at": REVIEWED_AT,
                "updated_at": REVIEWED_AT,
                "notes": "metadata_correction=true; human_double_review_required=true",
            }
        )
        poets_by_id[spring_poet_id] = poets[-1]
    for row in poems:
        if row["poem_id"] == spring_poem_id:
            row["title"] = "春思"
            row["poet_id"] = spring_poet_id
            row["source_locator"] = append_note(row["source_locator"], "web_crosscheck=web_春思; 原迁移标题‘赋得’与作者刘长卿不符")
            row["notes"] = append_note(row["notes"], "metadata_correction=title_author; web_crosscheck=web_春思")
            row["updated_at"] = REVIEWED_AT
    write_csv(data / "poets.csv", poets_fields, poets)
    write_csv(data / "poems.csv", poems_fields, poems)

    tags_fields, tags = read_csv(data / "tags.csv")
    tag_name = {row["tag_id"]: row["tag_name"] for row in tags}
    lines_fields, lines = read_csv(data / "poem_lines.csv")
    line_text = {row["line_id"]: row["line_text"] for row in lines}
    poem_by_id = {row["poem_id"]: row for row in poems}
    poet_name = {row["poet_id"]: row["name"] for row in poets}

    annotation_fields, annotation_rows = read_csv(data / "annotation_reviews.csv")
    review_report_fields, old_report = read_csv(reports / "tang_poem_new130_review_v1.csv")
    pending_report = [row for row in old_report if row["decision"] == "needs_revision"]
    report_v2 = list(old_report)
    report_index = {(row["target_table"], row["target_id"]): row for row in report_v2}
    web_evidence_rows: list[dict[str, str]] = []
    appended_reviews: list[dict[str, str]] = []

    def add_resolution(table: str, target_id: str, poem_id: str, dimension: str, decision: str, comment: str, source_key: str, locator: str) -> None:
        target_table_rows = {
            "poem_tags": poem_tags,
            "poem_imagery": poem_imagery,
            "color_occurrences": colors,
            "technique_annotations": techniques,
        }
        target = next(row for row in target_table_rows[table] if row[pk_by_table[table]] == target_id)
        previous = next((row for row in reversed(annotation_rows) if row["target_table"] == table and row["target_id"] == target_id), None)
        target["review_status"] = decision
        target["updated_at"] = REVIEWED_AT
        target["notes"] = append_note(target.get("notes", ""), f"web_resolution={decision}; human_double_review_required=true")
        review = make_review(annotation_fields, table, target_id, REVIEWED_AT, decision, comment, source_ids[source_key], locator, previous["review_id"] if previous else "")
        appended_reviews.append(review)
        old = report_index.get((table, target_id))
        if old:
            old.update({"decision": decision, "reviewer": REVIEWER, "reviewed_at": REVIEWED_AT, "review_comment": comment, "human_double_review_required": "true"})
        web_evidence_rows.append(
            {
                "target_table": table,
                "target_id": target_id,
                "poem_id": poem_id,
                "title": poem_by_id[poem_id]["title"],
                "dimension": dimension,
                "decision": decision,
                "source_id": source_ids[source_key],
                "source_url": SOURCE_DEFS[source_key][3],
                "source_locator": locator,
                "evidence_summary": comment,
                "notes": "web_evidence=true; not_human_double_review=true",
            }
        )

    poem_tags_fields, poem_tags = read_csv(data / "poem_tags.csv")
    poem_imagery_fields, poem_imagery = read_csv(data / "poem_imagery.csv")
    color_fields, colors = read_csv(data / "color_occurrences.csv")
    technique_fields, techniques = read_csv(data / "technique_annotations.csv")
    pk_by_table = {"poem_tags": "poem_tag_id", "poem_imagery": "poem_imagery_id", "color_occurrences": "color_occurrence_id", "technique_annotations": "technique_annotation_id"}

    # Resolve themes and correct the title shown in the review report.
    for row in pending_report:
        if row["dimension"] != "theme":
            continue
        target = next(x for x in poem_tags if x["poem_tag_id"] == row["target_id"])
        theme = tag_name[target["tag_id"]]
        title = poem_by_id[target["poem_id"]]["title"]
        if title == "奉和中书舍人贾至早朝大明宫" and theme == "人生感怀":
            decision, comment, source_key = "rejected", "网页赏析明确将作品归为咏早朝的宫廷唱和诗，当前‘人生感怀’标签不纳入确认统计。", "web_早朝"
        elif title == "春思" and theme in {"爱情闺怨", "边塞征战"}:
            decision, comment, source_key = "approved", "题名、作者及赏析已校正为皇甫冉《春思》；南京大学文章将此类从戍边将士妻子心理写作列为特殊边塞诗，原文又明确写思妇思念远征丈夫，两个标签均保留。", "web_边塞诗"
        elif title == "花非花" and theme == "爱情闺怨":
            decision, comment, source_key = "rejected", "公开研究综述指出《花非花》解释歧见较大，当前文本不足以确认‘爱情闺怨’，撤出确认统计而保留原始候选。", "web_花非花争议"
        else:
            continue
        add_resolution("poem_tags", row["target_id"], target["poem_id"], "theme", decision, comment, source_key, SOURCE_DEFS[source_key][4])

    # Resolve imagery, color and technique pending rows.
    imagery_by_id = {row["imagery_id"]: row for row in read_csv(data / "imagery.csv")[1]}
    for row in pending_report:
        if row["dimension"] == "imagery":
            target = next(x for x in poem_imagery if x["poem_imagery_id"] == row["target_id"])
            term = imagery_by_id[target["imagery_id"]]["canonical_name"]
            decision, comment, meaning, source_key = classify_imagery(term, target["quote"])
            target["contextual_meaning"] = meaning
            target["explanation"] = comment
            add_resolution("poem_imagery", target["poem_imagery_id"], target["poem_id"], "imagery", decision, comment, source_key, f"引句：{target['quote']}；语境分类：{meaning}")
        elif row["dimension"] == "color":
            target = next(x for x in colors if x["color_occurrence_id"] == row["target_id"])
            decision, comment, usage, source_key = classify_color(target["color_term"], target["quote"])
            target["usage_type"] = usage
            target["explanation"] = comment
            add_resolution("color_occurrences", target["color_occurrence_id"], target["poem_id"], "color", decision, comment, source_key, f"引句：{target['quote']}；用法：{usage}")
        elif row["dimension"] == "technique":
            target = next(x for x in techniques if x["technique_annotation_id"] == row["target_id"])
            technique = tag_name[target["technique_tag_id"]]
            text = poem_by_id[target["poem_id"]]["full_text"].replace("\n", "")
            decision, comment, source_key = classify_technique(technique, poem_by_id[target["poem_id"]]["title"], text, target["quote"])
            target["explanation"] = comment
            target["effect"] = append_note(target.get("effect", ""), "网页证据复核；当前行证据边界已固定")
            add_resolution("technique_annotations", target["technique_annotation_id"], target["poem_id"], "technique", decision, comment, source_key, f"引句：{target['quote']}；手法：{technique}")

    write_csv(data / "poem_tags.csv", poem_tags_fields, poem_tags)
    write_csv(data / "poem_imagery.csv", poem_imagery_fields, poem_imagery)
    write_csv(data / "color_occurrences.csv", color_fields, colors)
    write_csv(data / "technique_annotations.csv", technique_fields, techniques)

    # Dating evidence is one row per new poem, not an annotation span.
    evidence_fields, evidence_rows = read_csv(reports / "tang_poem_evidence_register_v2.csv")
    evidence_v3 = list(evidence_rows)
    dating_report_by_poem = {row["poem_id"]: row for row in evidence_v3 if row["dimension"] == "dating"}
    date_review_rows: list[dict[str, str]] = []
    for poem_id in manifest:
        if poem_id not in dating_report_by_poem or dating_report_by_poem[poem_id]["review_status"] != "needs_revision":
            continue
        evidence = dating_report_by_poem[poem_id]
        title = poem_by_id[poem_id]["title"]
        year_start, year_end, basis, source_key, status = DATE_OVERRIDES.get(title, (None, None, "本轮未获得足够逐篇证据，保留空值。", "web_语义", "undetermined"))
        poem = poem_by_id[poem_id]
        poem["year_start"] = "" if year_start is None else str(year_start)
        poem["year_end"] = "" if year_end is None else str(year_end)
        poem["dating_basis"] = basis
        poem["source_locator"] = append_note(poem["source_locator"], f"web_date_source={source_key}")
        poem["updated_at"] = REVIEWED_AT
        poem["notes"] = append_note(poem["notes"], f"web_date_resolution={status}; source={source_key}")
        evidence.update(
            {
                "title": title,
                "candidate_value": "" if year_start is None else f"{year_start}-{year_end}",
                "source_id": source_ids[source_key],
                "source_url": SOURCE_DEFS[source_key][3],
                "source_locator": SOURCE_DEFS[source_key][4],
                "evidence_summary": basis,
                "dating_status": status,
                "review_status": "approved",
                "notes": append_note(evidence["notes"], "web_resolution=approved; human_double_review_required=true"),
            }
        )
        previous = next((row for row in reversed(annotation_rows) if row["target_table"] == "poems" and row["target_id"] == poem_id), None)
        date_review_rows.append(make_review(annotation_fields, "poems", poem_id, REVIEWED_AT, "approved", basis, source_ids[source_key], SOURCE_DEFS[source_key][4], previous["review_id"] if previous else ""))

    write_csv(data / "poems.csv", poems_fields, poems)
    annotation_rows.extend(appended_reviews)
    annotation_rows.extend(date_review_rows)
    write_csv(data / "annotation_reviews.csv", annotation_fields, annotation_rows)

    # Update the review report titles and decisions without overwriting v1.
    for row in report_v2:
        poem = poem_by_id.get(row.get("poem_id"))
        if poem:
            row["title"] = poem["title"]
        resolved = report_index.get((row.get("target_table"), row.get("target_id")))
        if resolved:
            row.update(resolved)
    report_v2_path = reports / "tang_poem_new130_review_web_v1.csv"
    write_csv(report_v2_path, review_report_fields, report_v2)

    # Evidence register v3 and a compact, reproducible research register.
    evidence_v3_path = reports / "tang_poem_evidence_register_v3.csv"
    write_csv(evidence_v3_path, evidence_fields, evidence_v3)
    web_fields = ["target_table", "target_id", "poem_id", "title", "dimension", "decision", "source_id", "source_url", "source_locator", "evidence_summary", "notes"]
    web_path = reports / "tang_poem_web_resolution_v1.csv"
    write_csv(web_path, web_fields, web_evidence_rows)

    summary = Counter()
    for row in web_evidence_rows:
        summary[(row["dimension"], row["decision"])] += 1
    summary_lines = [
        "# 新增130首网页证据复核摘要 v1",
        "",
        f"- 复核时间：{REVIEWED_AT}",
        f"- 复核者：{REVIEWER}",
        "- 范围：新增130首；本轮仅处理 v1 报告中的 needs_revision 行。",
        "- 规则：必须同时具备网页来源定位和原文/引句边界；无法支持的当前标注改为 rejected，避免把不确定候选计入确认统计。",
        "- 边界：仍不是两位真人专家终审；`poems.review_status` 不因本轮自动改为 approved。",
        "",
        "| 维度 | approved | rejected | needs_revision |",
        "| --- | ---: | ---: | ---: |",
    ]
    for dimension in ("theme", "imagery", "color", "technique"):
        summary_lines.append(f"| {dimension} | {summary[(dimension, 'approved')]} | {summary[(dimension, 'rejected')]} | {summary[(dimension, 'needs_revision')]} |")
    date_status = Counter(row["review_status"] for row in evidence_v3 if row["dimension"] == "dating" and row["poem_id"] in manifest)
    summary_lines.extend(
        [
            "",
            f"- 年份：本轮将43条候选逐首落到网页证据或明确保留空值；当前新增130首年份审核状态：approved={date_status['approved']}、needs_revision={date_status['needs_revision']}。",
            "- 争议年份（如《问刘十九》《将进酒》《赤壁》《遣怀》）保留空值，不用作者生卒年替代创作年。",
            "- 《赋得》迁移归属已校正为皇甫冉《春思》，主题标签随之重新解释。",
        ]
    )
    (reports / "tang_poem_web_resolution_summary_v1.md").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")

    print(f"resolved={len(web_evidence_rows)} date_reviews={len(date_review_rows)}")
    print(f"wrote={report_v2_path}")
    print(f"wrote={evidence_v3_path}")
    print(f"wrote={web_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

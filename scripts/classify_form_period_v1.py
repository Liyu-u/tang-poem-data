"""Classify poetic form, Yuefu status, and literary period for the 150-poem corpus."""

from __future__ import annotations

import argparse
import csv
import re
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


REVIEW_STATUS = "pending"
REVIEWER = "Codex辅助核对（权威来源规则＋结构推断；待真人复核）"
NAMESPACE = uuid.UUID("c7e3b3b4-63c4-4dc0-9a90-4df0b8f2b3de")

PEP_FORM_URL = "https://www.pep.com.cn/bks/xxyw/jzjd/202505/W020250531427120006364.pdf"
CSSN_YUEFU_URL = "https://www.cssn.cn/skgz/bwyc/202305/t20230523_5639758.shtml"
CSSN_BOUNDARY_URL = "https://www.cssn.cn/skgz/bwyc/202502/t20250217_5844834.shtml"
CTEXT_QUANTANG_URL = "https://ctext.org/quantangshi/17/zhs"
CTEXT_SHUDAO_URL = "https://ctext.org/quantangshi/162/zhs"
CTEXT_CHUSAi_URL = "https://ctext.org/quantangshi/18/zhs"
CTEXT_YAN_GE_URL = "https://ctext.org/quantangshi/19/ens"
CTEXT_XIN_YUEFU_URL = "https://ctext.org/wiki.pl?chapter=1696305&if=en&remap=gb"
CTEXT_YUEFU_CHANGXIANGSI_URL = "https://ctext.org/wiki.pl?chapter=130870&if=gb"
CTEXT_MENG_HAORAN_VOL2_URL = "https://ctext.org/wiki.pl?chapter=2833543&if=gb"
CTEXT_HOUGONG_URL = "https://ctext.org/quantangshi/441/ens"
MOE_PERIOD_URL = "https://www.moe.gov.cn/srcsite/A26/s8001/200303/W020241017509261718950.pdf"
PEOPLE_PERIOD_URL = "https://sc.people.com.cn/n2/2022/0513/c345528-35294151.html"


FORM_OVERRIDES = {
    ("李白", "月下独酌四首·其一"): "五言古诗",
    ("杜甫", "望岳"): "五言古诗",
    ("孟浩然", "望洞庭湖赠张丞相"): "五言律诗",
    ("孟浩然", "秋登兰山寄张五"): "五言古诗",
    ("孟浩然", "夏日南亭怀辛大"): "五言古诗",
    ("孟浩然", "宿业师山房期丁大不至"): "五言古诗",
    ("韦应物", "淮上喜会梁川故人"): "五言律诗",
    ("刘长卿", "饯别王十一南游"): "五言律诗",
    ("刘长卿", "赋得"): "七言律诗",
    ("李商隐", "落花"): "五言律诗",
    ("李商隐", "韩碑"): "七言古诗",
    ("李白", "行路难三首·其一"): "杂言古诗",
    ("李白", "蜀道难"): "杂言古诗",
    ("李白", "将进酒"): "杂言古诗",
    ("李白", "梦游天姥吟留别"): "杂言古诗",
    ("李白", "宣州谢朓楼饯别校书叔云"): "杂言古诗",
    ("白居易", "琵琶行"): "七言古诗",
    ("白居易", "长恨歌"): "七言古诗",
    ("白居易", "卖炭翁"): "杂言古诗",
    ("白居易", "花非花"): "杂言古诗",
    ("杜甫", "兵车行"): "杂言古诗",
    ("杜牧", "旅宿"): "五言律诗",
    ("孟浩然", "同从弟销南斋玩月忆山阴崔少府"): "五言古诗",
    ("岑参", "与高适薛据慈恩寺浮图"): "五言古诗",
    ("岑参", "暮秋山行"): "五言古诗",
    ("高适", "塞上"): "五言古诗",
    ("高适", "古大梁行"): "七言古诗",
    ("高适", "人日寄杜二拾遗"): "七言古诗",
    ("高适", "燕歌行"): "七言古诗",
    ("王昌龄", "塞下曲"): "五言古诗",
    ("王昌龄", "塞下曲四首·其二"): "五言古诗",
    ("王昌龄", "塞下曲四首 二"): "五言古诗",
    ("岑参", "走马川行奉送出师西征"): "七言古诗",
    ("王维", "老将行"): "七言古诗",
    ("王维", "桃源行"): "七言古诗",
    ("王维", "终南别业"): "五言律诗",
    ("王维", "渡荆门送别"): "五言律诗",
    ("李白", "宣州谢朓楼饯别校书叔云"): "七言古诗",
    ("孟浩然", "夜归鹿门山歌"): "七言古诗",
}


YUEFU_VALUES = {
    ("李白", "蜀道难"): ("乐府", "《乐府诗集》有《蜀道难》古题；《全唐诗》以乐府类收录李白篇。", "high", CTEXT_SHUDAO_URL),
    ("李白", "行路难三首·其一"): ("乐府", "《行路难》为乐府古题，题名与《全唐诗》乐府编类相合。", "high", "https://ctext.org/quantangshi/213/zhs"),
    ("李白", "将进酒"): ("乐府", "《全唐诗》卷十七明确置于‘乐府杂曲·鼓吹曲辞’。", "high", CTEXT_QUANTANG_URL),
    ("李白", "子夜吴歌·春歌"): ("乐府", "《子夜吴歌》承用吴声西曲旧题，属于乐府旧题系统。", "high", "https://ctext.org/quantangshi/28/ens"),
    ("王维", "渭城曲"): ("乐府", "《渭城曲》为王维旧题歌辞，通行《全唐诗》编为乐府歌辞。", "medium", "https://ctext.org/quantangshi/125/zhs"),
    ("王维", "老将行"): ("乐府", "《老将行》见唐代歌行/乐府编纂材料，保留歌行与乐府边界说明。", "medium", "https://ctext.org/text.pl?if=en&node=160390"),
    ("王维", "桃源行"): ("乐府", "《桃源行》以‘行’为题的歌行，传统总集常列入乐府歌辞范围。", "medium", "https://ctext.org/quantangshi/125/zhs"),
    ("王昌龄", "出塞"): ("乐府", "《全唐诗》卷十八明确标为‘横吹曲辞：出塞’。", "high", CTEXT_CHUSAi_URL),
    ("王昌龄", "塞下曲"): ("乐府", "《塞下曲》为横吹曲辞旧题，题名本身指向乐府系统。", "high", "https://ctext.org/quantangshi/18/ens"),
    ("王昌龄", "塞下曲四首·其二"): ("乐府", "《塞下曲》为横吹曲辞旧题，题名本身指向乐府系统。", "high", "https://ctext.org/quantangshi/18/ens"),
    ("王昌龄", "从军行 三"): ("乐府", "《全唐诗》以‘从军行’旧题编列，属乐府题名系统。", "high", "https://ctext.org/quantangshi/143/ens"),
    ("王昌龄", "采莲曲三首·其二"): ("乐府", "《采莲曲》为南朝以来曲辞旧题，属乐府曲辞系统。", "medium", "https://ctext.org/quantangshi/143/ens"),
    ("王昌龄", "相和歌辞 长信怨 二"): ("乐府", "题名显式含‘相和歌辞’，属于《乐府诗集》曲辞分类。", "high", "https://ctext.org/quantangshi/143/ens"),
    ("高适", "燕歌行"): ("乐府", "《全唐诗》卷十九标为‘相和歌辞：燕歌行’，属乐府旧题。", "high", CTEXT_YAN_GE_URL),
    ("岑参", "走马川行奉送出师西征"): ("非乐府", "现有证据支持七言歌行/七言古诗，但未提供《乐府诗集》或《全唐诗》乐府类目的直接编类。", "medium", "https://www.nopss.gov.cn/n1/2016/0706/c373410-28529356.html"),
    ("岑参", "轮台歌奉送封大夫出师西征"): ("非乐府", "现有证据支持七言歌行/七言古诗，但未提供《乐府诗集》或《全唐诗》乐府类目的直接编类。", "medium", "https://www.nopss.gov.cn/n1/2016/0706/c373410-28529356.html"),
    ("白居易", "琵琶行"): ("非乐府", "现有依据只能直接支持长篇歌行，不能支持严格编类口径下的乐府；歌行与乐府不等同。", "medium", "https://www.nopss.gov.cn/GB/219506/219508/219525/14640181.html"),
    ("杜甫", "兵车行"): ("乐府", "《乐府诗集》及白居易《与元九书》所涉新乐府传统均收录/讨论此篇；歌行与乐府边界保留。", "medium", "https://ctext.org/wiki.pl?chapter=532653&if=en&remap=gb"),
    ("白居易", "卖炭翁"): ("乐府", "白居易自编《新乐府》明列《卖炭翁》，并见《乐府诗集·新乐府辞》。", "high", CTEXT_XIN_YUEFU_URL),
    ("白居易", "花非花"): ("乐府", "《花非花》见《全唐诗》杂曲歌辞相关材料；其曲辞边界仍需人工复核。", "medium", "https://ctext.org/quantangshi/890/ens"),
    ("王昌龄", "春宫曲"): ("非乐府", "《全唐诗》王昌龄卷只证明作品收录，题名含‘曲’不足以证明乐府编类；按项目严格口径改为非乐府。", "medium", "https://ctext.org/wiki.pl?chapter=426710&if=gb"),
    ("李白", "长相思"): ("乐府", "《乐府诗集》卷六十九列入杂曲歌辞；李白篇题承用长相思乐府旧题。", "high", CTEXT_YUEFU_CHANGXIANGSI_URL),
    ("刘禹锡", "竹枝词二首·其一"): ("乐府", "《乐府诗集》卷八十一‘近代曲辞’直接收录刘禹锡《竹枝》；标题简化导致原规则未命中。", "high", "https://ctext.org/wiki.pl?chapter=846559&if=gb&remap=gb"),
    ("白居易", "后宫词"): ("非乐府", "《全唐诗》卷四百四十一按白居易常规作品编次，题名‘宫词’只表示题材；按项目严格口径标为非乐府。", "medium", CTEXT_HOUGONG_URL),
    ("王昌龄", "长信秋词"): ("乐府", "《乐府诗集》以《长信怨》题收录，通行题名《长信秋词》；属相和歌辞楚调曲系统。", "high", "https://ctext.org/quantangshi/143/ens"),
    ("白居易", "长恨歌"): ("非乐府", "权威歌行研究将《长恨歌》归为长篇歌行；歌行与乐府编类不等同，本项目按严格编类口径标为非乐府。", "medium", "https://www.nopss.gov.cn/GB/219506/219508/219525/14640181.html"),
    ("孟浩然", "夜归鹿门山歌"): ("非乐府", "《孟浩然集》卷二将本篇编在七言古诗，而非乐府类；题名含‘歌’不足以单独判为乐府。", "medium", CTEXT_MENG_HAORAN_VOL2_URL),
}


AMBIGUOUS_YUEFU = {}


AUTHOR_PERIOD = {
    "李白": "盛唐",
    "杜甫": "盛唐",
    "王维": "盛唐",
    "孟浩然": "盛唐",
    "王昌龄": "盛唐",
    "岑参": "盛唐",
    "高适": "盛唐",
    "白居易": "中唐",
    "刘禹锡": "中唐",
    "韦应物": "中唐",
    "刘长卿": "中唐",
    "李商隐": "晚唐",
    "杜牧": "晚唐",
}


PERIOD_OVERRIDES = {
    ("杜甫", "登高"): "中唐",
    ("白居易", "赋得古原草送别"): "中唐",
    ("刘禹锡", "乌衣巷"): "中唐",
    ("刘禹锡", "秋词二首·其一"): "中唐",
    ("韦应物", "滁州西涧"): "中唐",
    ("刘长卿", "送灵澈上人"): "中唐",
    ("杜牧", "赠别二首 一"): "中唐",
}


KNOWN_PERIOD_BOUNDARIES = (
    (712, "初唐"),
    (766, "盛唐"),
    (836, "中唐"),
    (908, "晚唐"),
)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def clean_line(line: str) -> str:
    line = re.sub(r"\[([^\]]*)\]", r"\1", line)
    return "".join(ch for ch in line if ch not in "，。！？；、：？！")


def normalize_title_for_lookup(title: str) -> str:
    """Match display titles after punctuation and ‘其’ markers are normalized."""
    normalized = re.sub(r"[\s·・．.。,:：，、（）()\[\]【】]", "", title)
    return normalized.replace("其", "")


def line_pattern(rows: list[dict[str, str]]) -> tuple[list[int], str]:
    ordered = sorted(rows, key=lambda row: int(row["line_no"]))
    lengths = [len(clean_line(row["line_text"])) for row in ordered]
    return lengths, ",".join(str(value) for value in lengths)


def infer_form(poet: str, title: str, lengths: list[int]) -> tuple[str, str]:
    override = FORM_OVERRIDES.get((poet, title))
    if override is None:
        normalized_title = normalize_title_for_lookup(title)
        for (known_poet, known_title), known_form in FORM_OVERRIDES.items():
            if poet == known_poet and normalized_title == normalize_title_for_lookup(known_title):
                override = known_form
                break
    if override:
        return override, "题名/通行诗体与句式结构的人工规则覆盖"
    if len(lengths) == 4 and set(lengths) == {5}:
        return "五言绝句", "四句、每句五言"
    if len(lengths) == 4 and set(lengths) == {7}:
        return "七言绝句", "四句、每句七言"
    if len(lengths) == 8 and set(lengths) == {5}:
        return "五言律诗", "八句、每句五言；未命中特殊古诗覆盖"
    if len(lengths) == 8 and set(lengths) == {7}:
        return "七言律诗", "八句、每句七言；未命中特殊古诗覆盖"
    if set(lengths) == {5}:
        return "五言古诗", "非四句/八句的整齐五言句式"
    if set(lengths) == {7}:
        return "七言古诗", "非四句/八句的整齐七言句式"
    return "杂言古诗", "句长混合或含歌行式长短句"


def infer_yuefu(poet: str, title: str) -> tuple[str, str, str, str]:
    value = YUEFU_VALUES.get((poet, title))
    if value is None:
        normalized_title = normalize_title_for_lookup(title)
        for (known_poet, known_title), known_value in YUEFU_VALUES.items():
            if poet == known_poet and normalized_title == normalize_title_for_lookup(known_title):
                value = known_value
                break
    if value:
        return value
    ambiguous = AMBIGUOUS_YUEFU.get((poet, title))
    if ambiguous:
        return "待考", ambiguous, "low", CSSN_BOUNDARY_URL
    return "非乐府", "未命中本轮固定的乐府旧题/新乐府清单；规则上不因题名含‘歌/行’自动归入乐府。", "medium", CSSN_BOUNDARY_URL


def period_from_year(poem: dict[str, str], author_period: str) -> tuple[str, str, str]:
    override = PERIOD_OVERRIDES.get((poem.get("_poet_name", ""), poem["title"]))
    if override:
        return override, "采用首批候选快照中的通行文学史分期；非精确创作年份。", "low"
    if poem.get("year_start") and poem.get("year_end"):
        year = int(poem["year_start"])
        if year >= 908:
            period = "晚唐"
        elif year >= 836:
            period = "晚唐"
        elif year >= 766:
            period = "中唐"
        elif year >= 713:
            period = "盛唐"
        else:
            period = "初唐"
        return period, "按诗作已有系年范围的起始年映射四唐分期；不等同于精确断代结论。", "medium"
    return author_period, "无足够可靠的诗作专属年份；采用作者在文学史中的常用时段，仅作分析分组。", "low"


def source_id_for(url: str) -> str:
    return "src_" + str(uuid.uuid5(NAMESPACE, url))


def append_once(existing: str, addition: str) -> str:
    existing = existing or ""
    if addition in existing:
        first = existing.find(addition)
        prefix = existing[: first + len(addition)]
        suffix = existing[first + len(addition) :]
        suffix = suffix.replace("；" + addition, "")
        return prefix + suffix
    return (existing.rstrip("；") + "；" + addition).lstrip("；")


def add_authority_sources(root: Path, accessed_on: str) -> None:
    path = root / "data" / "sources.csv"
    rows = read_csv(path)
    urls = {row.get("url", "") for row in rows}
    additions = [
        {
            "source_type": "article",
            "title": "诗藻锐初学——从《唐诗三百首》看语文教科书中的古诗",
            "creator": "张静",
            "publisher": "人民教育出版社",
            "edition": "人民教育出版社公开 PDF",
            "publication_date": "2025",
            "url": PEP_FORM_URL,
            "rights": "网页公开资料；仅作分类依据与书目记录",
            "bibliographic_note": "讨论古体诗、律诗、绝句的形式区别及乐府诗的独立属性。",
            "notes": "本项目诗体分类规则来源；逐首结果仍待真人复核。",
        },
        {
            "source_type": "article",
            "title": "乐府采诗的史学建构与诗学影响",
            "creator": "梁海燕",
            "publisher": "中国社会科学网",
            "edition": "中国社会科学报网络版",
            "publication_date": "2023-05-23",
            "url": CSSN_YUEFU_URL,
            "rights": "网页公开资料；仅作分类依据与书目记录",
            "bibliographic_note": "讨论乐府采诗传统、古题乐府与中唐新乐府。",
            "notes": "乐府历史与新乐府规则来源；逐首结果仍待真人复核。",
        },
        {
            "source_type": "article",
            "title": "20世纪唐诗研究的成就与不足",
            "creator": "首都师范大学文学院相关作者",
            "publisher": "中国社会科学网",
            "edition": "中国社会科学报网络版",
            "publication_date": "2025-02-17",
            "url": CSSN_BOUNDARY_URL,
            "rights": "网页公开资料；仅作分类依据与书目记录",
            "bibliographic_note": "明确说明歌行与乐府不等同，并给出依《乐府诗集》判定的边界。",
            "notes": "乐府保守判定规则来源。",
        },
        {
            "source_type": "database",
            "title": "全唐诗：卷十七、卷十八、卷十九及相关卷",
            "creator": "钦定四库全书本《御定全唐诗》；中国哲学书电子化计划整理",
            "publisher": "中国哲学书电子化计划",
            "edition": "在线古籍数据库",
            "publication_date": "",
            "url": CTEXT_QUANTANG_URL,
            "rights": "按原站条款使用；本项目仅记录书目与分类定位",
            "bibliographic_note": "用于核对‘将进酒’、‘出塞’、‘燕歌行’等乐府编类。",
            "notes": "具体篇目另在证据报告中记录定位 URL。",
        },
        {
            "source_type": "database",
            "title": "全唐诗：卷一百四十三（王昌龄）",
            "creator": "钦定四库全书本《御定全唐诗》；中国哲学书电子化计划整理",
            "publisher": "中国哲学书电子化计划",
            "edition": "在线古籍数据库",
            "publication_date": "",
            "url": "https://ctext.org/quantangshi/143/ens",
            "rights": "按原站条款使用；本项目仅记录书目与分类定位",
            "bibliographic_note": "核对《长信怨》（通行题《长信秋词》）、《采莲曲》《从军行》等题名与编类。",
            "notes": "具体篇目另在证据报告中记录定位 URL。",
        },
        {
            "source_type": "database",
            "title": "孟浩然集：卷二七言古诗、五言排律",
            "creator": "《孟浩然集》四部丛刊本；中国哲学书电子化计划整理",
            "publisher": "中国哲学书电子化计划",
            "edition": "在线古籍数据库",
            "publication_date": "",
            "url": CTEXT_MENG_HAORAN_VOL2_URL,
            "rights": "按原站条款使用；本项目仅记录书目与分类定位",
            "bibliographic_note": "用于确认《夜归鹿门山歌》在别集中的七言古诗编排。",
            "notes": "歌行题名不直接等同于乐府，仍保留边界说明。",
        },
        {
            "source_type": "database",
            "title": "乐府诗集：卷六十九杂曲歌辞",
            "creator": "郭茂倩编《乐府诗集》；中国哲学书电子化计划整理",
            "publisher": "中国哲学书电子化计划",
            "edition": "在线古籍数据库",
            "publication_date": "",
            "url": CTEXT_YUEFU_CHANGXIANGSI_URL,
            "rights": "按原站条款使用；本项目仅记录书目与分类定位",
            "bibliographic_note": "核对《长相思》旧题及杂曲歌辞分类。",
            "notes": "用于李白《长相思》乐府属性证据。",
        },
        {
            "source_type": "database",
            "title": "全唐诗：卷四百四十一（白居易）",
            "creator": "钦定四库全书本《御定全唐诗》；中国哲学书电子化计划整理",
            "publisher": "中国哲学书电子化计划",
            "edition": "在线古籍数据库",
            "publication_date": "",
            "url": CTEXT_HOUGONG_URL,
            "rights": "按原站条款使用；本项目仅记录书目与分类定位",
            "bibliographic_note": "核对白居易《后宫词》原文与卷次；宫词题材不自动等同乐府。",
            "notes": "本条只作文本与编排核对，乐府边界仍保留待考。",
        },
        {
            "source_type": "article",
            "title": "普通高中语文课程标准（实验）课程举例：唐诗选读",
            "creator": "中华人民共和国教育部",
            "publisher": "教育部",
            "edition": "公开 PDF",
            "publication_date": "2003",
            "url": MOE_PERIOD_URL,
            "rights": "政府公开资料；仅作分期框架依据",
            "bibliographic_note": "采用初唐、盛唐、中唐、晚唐四个文学史分期框架。",
            "notes": "四唐框架来源；具体边界按项目规则记录，非唯一学术分期。",
        },
        {
            "source_type": "article",
            "title": "唐代歌行研究",
            "creator": "全国哲学社会科学工作办公室",
            "publisher": "全国哲学社会科学工作办公室",
            "edition": "公开页面",
            "publication_date": "2010",
            "url": "https://www.nopss.gov.cn/GB/219506/219508/219525/14640181.html",
            "rights": "政府公开资料；仅作分类依据与书目记录",
            "bibliographic_note": "讨论歌行名称、乐府传统及白居易《长恨歌》《琵琶行》的歌行属性。",
            "notes": "歌行与乐府边界的辅助来源；逐首结果仍待真人复核。",
        },
        {
            "source_type": "article",
            "title": "蜀地唐诗的发端与终结",
            "creator": "人民网文化频道",
            "publisher": "人民网",
            "edition": "公开页面",
            "publication_date": "2022-05-13",
            "url": PEOPLE_PERIOD_URL,
            "rights": "网页公开资料；仅作分期框架辅助依据",
            "bibliographic_note": "给出四唐分期的一组常用时间界线，并提示其为文学史分期。",
            "notes": "分期边界辅助来源；不替代逐篇系年。",
        },
    ]
    fieldnames = list(rows[0])
    for addition in additions:
        if addition["url"] in urls:
            continue
        now = datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(timespec="seconds")
        row = {field: "" for field in fieldnames}
        row.update(addition)
        row.update(
            {
                "source_id": source_id_for(addition["url"]),
                "accessed_on": accessed_on,
                "review_status": "pending",
                "created_by": "form_period_evidence_v1",
                "created_at": now,
                "updated_at": now,
            }
        )
        rows.append(row)
        urls.add(addition["url"])
    write_csv(path, fieldnames, rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    poems_path = root / "data" / "poems.csv"
    poems = read_csv(poems_path)
    original_created_by = {}
    backup_path = root / "reports" / "tang_poem_expansion_backup_v1" / "poems.csv"
    if backup_path.exists():
        original_created_by = {
            row["poem_id"]: row.get("created_by", "migration_pilot_v1")
            for row in read_csv(backup_path)
        }
    poets = {row["poet_id"]: row for row in read_csv(root / "data" / "poets.csv")}
    lines_by_poem: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in read_csv(root / "data" / "poem_lines.csv"):
        lines_by_poem[row["poem_id"]].append(row)

    now = datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(timespec="seconds")
    report_rows = []
    for poem in poems:
        poet = poets[poem["poet_id"]]["name"]
        poem["_poet_name"] = poet
        if poem.get("created_by") == "form_period_evidence_v1":
            poem["created_by"] = original_created_by.get(poem["poem_id"], "corpus_expansion_v1")
        lengths, pattern = line_pattern(lines_by_poem[poem["poem_id"]])
        form, form_basis = infer_form(poet, poem["title"], lengths)
        yuefu, yuefu_basis, yuefu_confidence, yuefu_url = infer_yuefu(poet, poem["title"])
        period, period_basis, period_confidence = period_from_year(poem, AUTHOR_PERIOD[poet])
        poem["poetic_form"] = form
        poem["yuefu_type"] = yuefu
        poem["period"] = period
        poem["updated_at"] = now
        poem["dating_basis"] = append_once(poem.get("dating_basis", ""), period_basis)
        poem["notes"] = append_once(poem.get("notes", ""), "诗体/乐府/分期候选已写入，review_status仍为pending")
        common = {
            "poem_id": poem["poem_id"],
            "title": poem["title"],
            "poet": poet,
            "sentence_count": str(len(lengths)),
            "sentence_length_pattern": pattern,
            "review_status": REVIEW_STATUS,
            "reviewer": REVIEWER,
        }
        report_rows.extend(
            [
                {
                    **common,
                    "dimension": "poetic_form",
                    "chosen_value": form,
                    "evidence_source": "PEP古诗体说明＋当前句式结构",
                    "source_url": PEP_FORM_URL,
                    "evidence_locator": "诗体区别以形式为主；句数/每句字数由 poem_lines 计算",
                    "classification_basis": form_basis,
                    "confidence": "medium" if "覆盖" in form_basis else "high",
                    "notes": "结构识别不等于格律平仄人工校勘；排律仅在本轮明确规则下使用。",
                },
                {
                    **common,
                    "dimension": "yuefu_type",
                    "chosen_value": yuefu,
                    "evidence_source": "CSSN乐府研究＋《全唐诗》/《乐府诗集》编类",
                    "source_url": yuefu_url,
                    "evidence_locator": "题名、编类或新乐府目录；非乐府不因‘歌/行’字样自动判定",
                    "classification_basis": yuefu_basis,
                    "confidence": yuefu_confidence,
                    "notes": "歌行与乐府边界存在学术争议；待考项不进入确认统计。",
                },
                {
                    **common,
                    "dimension": "period",
                    "chosen_value": period,
                    "evidence_source": "教育部课程标准四唐框架＋诗作系年/作者常用文学史时段",
                    "source_url": PEOPLE_PERIOD_URL if poem.get("year_start") else MOE_PERIOD_URL,
                    "evidence_locator": "四唐分期：初唐/盛唐/中唐/晚唐；有 year_start 时按年份映射",
                    "classification_basis": period_basis,
                    "confidence": period_confidence,
                    "notes": "period 是文学史分析分组，不是对诗作创作年份的替代；具体年份仍以 year_start/year_end 为准。",
                },
            ]
        )
        poem.pop("_poet_name", None)

    write_csv(poems_path, list(poems[0]), poems)
    report_path = root / "reports" / "tang_poem_form_period_evidence_v1.csv"
    write_csv(report_path, list(report_rows[0]), report_rows)
    add_authority_sources(root, datetime.now(ZoneInfo("Asia/Shanghai")).date().isoformat())
    print(f"updated poems={len(poems)} report_rows={len(report_rows)} report={report_path}")


if __name__ == "__main__":
    main()

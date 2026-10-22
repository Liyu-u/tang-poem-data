"""为新增130首生成保守的特征候选、年份候选和证据登记表。

本脚本只处理 reports/tang_poem_expansion_manifest_v1.csv 中的诗作，
不会覆盖首批20首已有标注。新记录全部保留 pending，供人工复核。
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import pathlib
import re
import uuid


NOW = "2026-10-17T12:00:00+08:00"
NAMESPACE = uuid.UUID("8d0c4c38-2c1c-4e2a-bd4b-1f17a1ca3e48")


def sid(prefix: str, key: str) -> str:
    return f"{prefix}_{uuid.uuid5(NAMESPACE, key)}"


def read_csv(path: pathlib.Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: pathlib.Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def source_rows(now: str) -> list[dict[str, str]]:
    records = [
        (
            "ctext_tangshi_beicai",
            "book",
            "《唐诗别裁集》电子文本",
            "沈德潜编；中国哲学书电子化计划整理",
            "中国哲学书电子化计划",
            "在线整理本",
            "https://ctext.org/datawiki.pl?if=gb&remap=gb&res=683058",
            "用于传统选本、题名和诗评线索；具体版本仍需核对纸本或校注本。",
        ),
        (
            "pep_zh_jingdian",
            "web",
            "中华经典资源库·中华经典诗文精讲",
            "人民教育出版社",
            "人民教育出版社",
            "教育部语用司相关项目成果页面",
            "https://www.pep.com.cn/products/zhytu/gjshnj/zhyxdb/202004/t20200419_1950891.shtml",
            "用于通行文本和教材常见解读；不替代逐篇校勘。",
        ),
        (
            "cssn_dufu_dating",
            "article",
            "论杜诗系年的版本依据与标准",
            "中国社会科学网",
            "中国社会科学网",
            "学术文章网页",
            "https://www.cssn.cn/wx/wx_zggdwx/202208/t20220802_5442818.shtml",
            "用于说明系年需结合年谱、编年本、历史事件和版本依据。",
        ),
        (
            "cssn_digital_humanities_dating",
            "article",
            "数字人文在古代文学研究中的初步实践及学术意义",
            "中国社会科学网",
            "中国社会科学网",
            "学术文章网页",
            "https://www.cssn.cn/skgz/202209/t20220916_5511816.shtml",
            "用于逐篇记录时间、地点、来源和证据链的方法参考。",
        ),
        (
            "pku_moon_imagery",
            "other",
            "月亮意象相关讲座材料",
            "北京大学",
            "北京大学中文系/相关教学材料",
            "讲座 PDF",
            "https://fh.pku.edu.cn/docs/2018-11/20181114213940058884.pdf",
            "只作为月意象解释的参考，不把讲座观点扩展为所有诗作结论。",
        ),
        (
            "snnu_tang_poetry_changan",
            "article",
            "唐诗与长安的双向建构",
            "陕西师范大学",
            "陕西师范大学",
            "高校新闻/学术活动页面",
            "https://news.snnu.edu.cn/info/21402/276544.htm",
            "用于文学地理和长安相关意象的解释参考。",
        ),
    ]
    output = []
    for key, source_type, title, creator, publisher, edition, url, note in records:
        output.append(
            {
                "source_id": sid("src", key),
                "source_type": source_type,
                "title": title,
                "creator": creator,
                "publisher": publisher,
                "edition": edition,
                "publication_date": "",
                "url": url,
                "accessed_on": "2026-10-17",
                "rights": "网页内容和数据库条款按原站说明；本项目仅记录书目信息和短引文。",
                "bibliographic_note": note,
                "review_status": "pending",
                "created_by": "evidence_protocol_v1",
                "created_at": now,
                "updated_at": now,
                "notes": "新增证据来源；逐篇适用性待人工复核。",
            }
        )
    return output


THEMES = {
    "行路难三首·其一": ["人生感怀"],
    "黄鹤楼送孟浩然之广陵": ["送别"],
    "早发白帝城": ["山水田园", "人生感怀"],
    "月下独酌四首·其一": ["人生感怀"],
    "闻官军收河南河北": ["人生感怀"],
    "蜀相": ["咏史怀古", "政治讽喻"],
    "鹿柴": ["山水田园"],
    "竹里馆": ["山水田园"],
    "相思": ["思乡怀人"],
    "九月九日忆山东兄弟": ["思乡怀人"],
    "长恨歌": ["爱情闺怨", "咏史怀古"],
    "问刘十九": ["人生感怀"],
    "后宫词": ["爱情闺怨"],
    "无题": ["爱情闺怨"],
    "乐游原": ["人生感怀"],
    "嫦娥": ["咏物", "人生感怀"],
    "赤壁": ["咏史怀古"],
    "秋夕": ["爱情闺怨"],
    "赠别": ["送别"],
    "遣怀": ["人生感怀"],
    "过故人庄": ["山水田园"],
    "宿建德江": ["羁旅"],
    "望洞庭湖赠张丞相": ["山水田园", "政治讽喻"],
    "早寒江上有怀": ["羁旅", "思乡怀人"],
    "塞下曲": ["边塞征战"],
    "闺怨": ["爱情闺怨"],
    "长信秋词": ["爱情闺怨"],
    "逢入京使": ["羁旅", "思乡怀人"],
    "走马川行奉送出师西征": ["边塞征战"],
    "轮台歌奉送封大夫出师西征": ["边塞征战"],
    "与高适薛据慈恩寺浮图": ["山水田园", "人生感怀"],
    "秋夜寄丘二十二员外": ["思乡怀人"],
    "寄全椒山中道士": ["思乡怀人"],
    "寄李儋元锡": ["思乡怀人", "人生感怀"],
    "淮上喜会梁川故人": ["思乡怀人"],
    "送李少府贬峡中王少府贬长沙": ["送别"],
    "蜀先主庙": ["咏史怀古"],
    "西塞山怀古": ["咏史怀古"],
    "和乐天春词": ["爱情闺怨"],
    "听弹琴": ["人生感怀"],
    "送方外上人": ["送别"],
    "新年作": ["羁旅", "人生感怀"],
    "秋日登吴公台上寺远眺": ["咏史怀古", "羁旅"],
    "寻南溪常山道人隐居": ["山水田园"],
    "饯别王十一南游": ["送别"],
    "江州重别薛六柳八二员外": ["送别"],
    "长沙过贾谊宅": ["咏史怀古", "人生感怀"],
    "梦游天姥吟留别": ["山水田园", "人生感怀"],
    "宣州谢朓楼饯别校书叔云": ["送别", "人生感怀"],
    "渡荆门送别": ["山水田园", "羁旅"],
    "登金陵凤凰台": ["咏史怀古", "人生感怀"],
    "月夜忆舍弟": ["思乡怀人"],
    "登楼": ["政治讽喻", "咏史怀古"],
    "旅夜书怀": ["羁旅", "人生感怀"],
    "登岳阳楼": ["羁旅", "人生感怀"],
    "兵车行": ["政治讽喻", "边塞征战"],
    "终南别业": ["山水田园"],
    "积雨辋川庄作": ["山水田园"],
    "老将行": ["边塞征战"],
    "桃源行": ["山水田园", "咏史怀古"],
    "自河南经乱关内阻饥兄弟离散各在一处因望月有感聊书所怀寄上浮梁大兄于潜七兄乌江十五兄兼示符离及下邽弟妹": ["思乡怀人", "政治讽喻"],
    "大林寺桃花": ["山水田园"],
    "卖炭翁": ["政治讽喻"],
    "暮江吟": ["山水田园"],
    "花非花": ["爱情闺怨", "人生感怀"],
    "蝉": ["咏物"],
    "风雨": ["人生感怀"],
    "隋宫": ["咏史怀古", "政治讽喻"],
    "无题二首 一": ["爱情闺怨"],
    "落花": ["咏物", "人生感怀"],
    "山行": ["山水田园"],
    "江南春绝句": ["山水田园", "咏史怀古"],
    "题乌江亭": ["咏史怀古"],
    "金谷园": ["咏史怀古"],
    "旅宿": ["羁旅"],
    "秋登兰山寄张五": ["山水田园", "思乡怀人"],
    "夏日南亭怀辛大": ["山水田园", "思乡怀人"],
    "宿业师山房期丁大不至": ["山水田园", "思乡怀人"],
    "与诸子登岘山": ["山水田园", "咏史怀古"],
    "岁暮归南山": ["人生感怀"],
    "塞下曲四首 二": ["边塞征战"],
    "同从弟销南斋玩月忆山阴崔少府": ["思乡怀人", "山水田园"],
    "春宫曲": ["爱情闺怨"],
    "从军行 三": ["边塞征战"],
    "采莲曲三首 二": ["山水田园", "爱情闺怨"],
    "碛中作": ["边塞征战"],
    "山房春事二首 一": ["山水田园"],
    "山房春事二首 二": ["山水田园"],
    "暮秋山行": ["山水田园", "羁旅"],
    "武威春暮闻宇文判官西使还已到晋昌": ["边塞征战", "思乡怀人"],
    "别董大二首 一": ["送别"],
    "别董大二首 二": ["送别"],
    "封丘作": ["人生感怀", "政治讽喻"],
    "塞上": ["边塞征战"],
    "金城北楼": ["边塞征战", "山水田园"],
    "古大梁行": ["咏史怀古", "人生感怀"],
    "人日寄杜二拾遗": ["思乡怀人"],
    "除夜作": ["羁旅", "思乡怀人"],
    "秋词二首 一": ["人生感怀"],
    "酬乐天扬州初逢席上见赠": ["人生感怀", "思乡怀人"],
    "竹枝词二首 一": ["山水田园", "爱情闺怨"],
    "石头城": ["咏史怀古"],
    "望洞庭": ["山水田园"],
    "再游玄都观": ["咏史怀古", "人生感怀"],
    "赋得暮雨送李胄": ["送别"],
    "送杨氏女": ["送别"],
    "长安遇冯著": ["思乡怀人"],
    "夕次盱眙县": ["羁旅"],
    "东郊": ["山水田园"],
    "自夏口至鹦鹉洲夕望岳阳寄源中丞": ["羁旅", "思乡怀人"],
    "将进酒": ["人生感怀"],
    "长相思": ["思乡怀人"],
    "金陵酒肆留别": ["送别"],
    "月夜": ["思乡怀人"],
    "天末忆李白": ["思乡怀人"],
    "送别": ["送别"],
    "青谿": ["山水田园"],
    "韩碑": ["咏史怀古", "政治讽喻"],
    "寄令狐郎中": ["思乡怀人"],
    "将赴吴兴登乐游原一绝": ["人生感怀"],
    "赠别二首 一": ["送别"],
    "子夜吴歌 春歌": ["爱情闺怨"],
    "夜归鹿门山歌": ["山水田园"],
    "秦中感秋寄远上人": ["羁旅", "思乡怀人"],
    "相和歌辞 长信怨 二": ["爱情闺怨"],
    "寄左省杜拾遗": ["政治讽喻", "思乡怀人"],
    "奉和中书舍人贾至早朝大明宫": ["人生感怀"],
    "赋得": ["爱情闺怨", "边塞征战"],
    "终南山": ["山水田园"],
    "初发扬子寄元大校书": ["送别", "羁旅"],
}


TECHNIQUES = {
    "行路难三首·其一": ["比喻", "夸张"], "黄鹤楼送孟浩然之广陵": ["借景抒情"],
    "早发白帝城": ["夸张", "借景抒情"], "月下独酌四首·其一": ["拟人"],
    "闻官军收河南河北": ["夸张", "对比"], "蜀相": ["用典", "借景抒情"],
    "鹿柴": ["衬托", "借景抒情"], "竹里馆": ["衬托", "借景抒情"],
    "相思": ["借景抒情"], "九月九日忆山东兄弟": ["对比", "借景抒情"],
    "长恨歌": ["对比", "用典"], "问刘十九": ["借景抒情"],
    "后宫词": ["对比", "借景抒情"], "无题": ["比喻", "用典"],
    "乐游原": ["借景抒情", "对比"], "嫦娥": ["用典", "对比"],
    "赤壁": ["用典", "对比"], "秋夕": ["借景抒情", "对比"],
    "赠别": ["对比", "借景抒情"], "遣怀": ["对比", "用典"],
    "过故人庄": ["借景抒情"], "宿建德江": ["借景抒情", "衬托"],
    "望洞庭湖赠张丞相": ["比喻", "借景抒情"], "早寒江上有怀": ["借景抒情"],
    "塞下曲": ["对比", "夸张"], "闺怨": ["对比"], "长信秋词": ["对比", "借景抒情"],
    "逢入京使": ["对比", "夸张"], "走马川行奉送出师西征": ["比喻", "夸张"],
    "轮台歌奉送封大夫出师西征": ["比喻", "夸张"], "与高适薛据慈恩寺浮图": ["比喻", "夸张"],
    "秋夜寄丘二十二员外": ["借景抒情"], "寄全椒山中道士": ["借景抒情"],
    "寄李儋元锡": ["借景抒情", "对比"], "淮上喜会梁川故人": ["对比", "借景抒情"],
    "送李少府贬峡中王少府贬长沙": ["对比", "借景抒情"], "蜀先主庙": ["用典", "对比"],
    "西塞山怀古": ["用典", "对比"], "和乐天春词": ["对比"], "听弹琴": ["衬托", "借景抒情"],
    "送方外上人": ["借景抒情"], "新年作": ["对比", "借景抒情"],
    "秋日登吴公台上寺远眺": ["用典", "借景抒情"], "寻南溪常山道人隐居": ["借景抒情"],
    "饯别王十一南游": ["借景抒情", "对比"], "江州重别薛六柳八二员外": ["对比", "借景抒情"],
    "长沙过贾谊宅": ["用典", "借景抒情"], "梦游天姥吟留别": ["比喻", "夸张", "用典"],
    "宣州谢朓楼饯别校书叔云": ["夸张", "对比"], "渡荆门送别": ["比喻", "借景抒情"],
    "登金陵凤凰台": ["用典", "对比"], "月夜忆舍弟": ["对比", "借景抒情"],
    "登楼": ["借景抒情", "用典"], "旅夜书怀": ["借景抒情", "对比"],
    "登岳阳楼": ["对比", "借景抒情"], "兵车行": ["对比", "夸张"],
    "终南别业": ["借景抒情"], "积雨辋川庄作": ["借景抒情", "衬托"],
    "老将行": ["对比", "夸张"], "桃源行": ["用典", "借景抒情"],
    "卖炭翁": ["对比"], "暮江吟": ["对比", "借景抒情"], "花非花": ["比喻"],
    "蝉": ["托物言志", "对比"], "风雨": ["借景抒情"], "隋宫": ["用典", "对比"],
    "无题二首 一": ["比喻", "用典"], "落花": ["托物言志", "对比"], "山行": ["借景抒情", "对比"],
    "江南春绝句": ["对比", "借景抒情"], "题乌江亭": ["用典", "对比"], "金谷园": ["用典", "对比"],
    "旅宿": ["借景抒情"], "秋登兰山寄张五": ["借景抒情"], "夏日南亭怀辛大": ["借景抒情"],
    "宿业师山房期丁大不至": ["借景抒情", "衬托"], "与诸子登岘山": ["用典", "借景抒情"],
    "岁暮归南山": ["对比"], "塞下曲四首 二": ["对比", "夸张"],
    "同从弟销南斋玩月忆山阴崔少府": ["借景抒情"], "春宫曲": ["对比"],
    "从军行 三": ["夸张", "对比"], "采莲曲三首 二": ["借景抒情"], "碛中作": ["夸张", "借景抒情"],
    "山房春事二首 一": ["对比", "借景抒情"], "山房春事二首 二": ["对比", "借景抒情"],
    "暮秋山行": ["借景抒情"], "武威春暮闻宇文判官西使还已到晋昌": ["对比", "借景抒情"],
    "别董大二首 一": ["夸张", "对比"], "别董大二首 二": ["对比"],
    "封丘作": ["对比", "借景抒情"], "塞上": ["对比", "夸张"], "金城北楼": ["借景抒情"],
    "古大梁行": ["用典", "对比"], "人日寄杜二拾遗": ["借景抒情"], "除夜作": ["对比", "借景抒情"],
    "秋词二首 一": ["对比", "借景抒情"], "酬乐天扬州初逢席上见赠": ["对比", "用典"],
    "竹枝词二首 一": ["借景抒情"], "石头城": ["对比", "用典"], "望洞庭": ["比喻", "借景抒情"],
    "再游玄都观": ["对比", "用典"], "赋得暮雨送李胄": ["借景抒情"], "送杨氏女": ["借景抒情"],
    "长安遇冯著": ["借景抒情"], "夕次盱眙县": ["借景抒情"], "东郊": ["借景抒情"],
    "自夏口至鹦鹉洲夕望岳阳寄源中丞": ["借景抒情", "对比"], "将进酒": ["夸张", "比喻"],
    "长相思": ["借景抒情"], "金陵酒肆留别": ["借景抒情"], "月夜": ["对比", "借景抒情"],
    "天末忆李白": ["借景抒情"], "送别": ["借景抒情"], "青谿": ["借景抒情"],
    "韩碑": ["用典", "对比"], "寄令狐郎中": ["借景抒情"], "将赴吴兴登乐游原一绝": ["借景抒情"],
    "赠别二首 一": ["对比", "借景抒情"], "子夜吴歌 春歌": ["对比", "借景抒情"],
    "夜归鹿门山歌": ["借景抒情", "衬托"], "秦中感秋寄远上人": ["借景抒情"],
    "相和歌辞 长信怨 二": ["对比", "借景抒情"], "寄左省杜拾遗": ["对比"],
    "奉和中书舍人贾至早朝大明宫": ["对比", "借景抒情"], "赋得": ["对比", "用典"],
    "终南山": ["借景抒情"], "初发扬子寄元大校书": ["借景抒情", "对比"],
}


# 只录入有相对清晰历史背景或学界常用系年的条目；其余年份留空。
DATING = {
    "行路难三首·其一": (742, 744, "李白出长安前后，常系于天宝三载前后；具体篇年仍有争议"),
    "黄鹤楼送孟浩然之广陵": (728, 730, "李白寓居安陆、送孟浩然东下阶段；常用系年范围"),
    "早发白帝城": (759, 759, "乾元二年遇赦东归途中；教材与通行年谱常系759年"),
    "月下独酌四首·其一": (744, 744, "天宝三载前后在长安；通行编年范围"),
    "闻官军收河南河北": (763, 763, "广德元年春，梓州闻官军收复河南河北"),
    "蜀相": (760, 760, "上元元年在成都草堂；杜诗编年常系此年"),
    "长恨歌": (806, 806, "元和元年游仙游寺后创作背景，通行系年"),
    "问刘十九": (815, 815, "元和十年以后洛阳闲适诗阶段；常用系年"),
    "赤壁": (842, 842, "会昌二年前后创作；通行编年常系842年"),
    "赠别": (835, 835, "杜牧在扬州时期，通行编年常系835年前后"),
    "遣怀": (835, 835, "杜牧扬州时期回忆性作品，通行编年常系835年前后"),
    "闻官军收河南河北": (763, 763, "广德元年春；杜诗系年常用结论"),
    "月夜忆舍弟": (759, 759, "乾元二年秦州时期；杜诗编年常系此年"),
    "登楼": (764, 764, "广德二年成都时期；杜诗编年常系此年"),
    "旅夜书怀": (765, 765, "永泰元年离成都南下途中；杜诗编年常系此年"),
    "登岳阳楼": (768, 768, "大历三年由夔州出峡至岳阳时期；通行编年"),
    "兵车行": (751, 751, "天宝十载前后；杜诗早期现实题材通行系年"),
    "月夜": (756, 756, "至德元载长安陷落后；杜诗编年常系此年"),
    "天末忆李白": (758, 758, "乾元元年秦州时期；杜诗编年常系此年"),
    "梦游天姥吟留别": (744, 744, "天宝三载离长安后；教材与通行年谱常系744年"),
    "渡荆门送别": (725, 725, "开元十三年前后出蜀远游阶段；通行系年"),
    "宣州谢朓楼饯别校书叔云": (753, 753, "天宝十二载宣城时期；通行编年"),
    "将进酒": (752, 752, "天宝十一载前后；李白年谱常用范围"),
    "金陵酒肆留别": (726, 726, "开元十四年前后江东游历阶段；通行系年"),
    "逢入京使": (749, 749, "天宝八载入安西途中；岑参边塞诗编年常系此年"),
    "走马川行奉送出师西征": (754, 754, "天宝十三载北庭幕府阶段；通行系年"),
    "轮台歌奉送封大夫出师西征": (754, 754, "天宝十三载北庭幕府阶段；通行系年"),
    "与高适薛据慈恩寺浮图": (752, 752, "天宝十一载秋，岑参回长安与友人登塔唱和"),
    "武威春暮闻宇文判官西使还已到晋昌": (755, 755, "天宝十四载河西/武威幕府阶段"),
    "寄左省杜拾遗": (757, 758, "至德二年至乾元元年初，岑参与杜甫同朝任职"),
    "别董大二首 一": (747, 747, "天宝六载前后，高适与董庭兰交游阶段"),
    "别董大二首 二": (747, 747, "天宝六载前后，高适与董庭兰交游阶段"),
    "封丘作": (749, 749, "天宝八载任封丘尉时期；通行系年"),
    "人日寄杜二拾遗": (762, 762, "宝应元年成都时期，高适寄杜甫"),
    "除夜作": (749, 749, "高适旅居边地阶段；通行年谱常系天宝年间"),
    "秋词二首 一": (805, 805, "永贞革新后刘禹锡朗州时期；通行系年"),
    "酬乐天扬州初逢席上见赠": (826, 826, "敬宗宝历二年扬州相逢；通行系年"),
    "竹枝词二首 一": (822, 822, "长庆二年前后夔州时期；通行系年"),
    "石头城": (824, 824, "敬宗宝历年间；刘禹锡金陵怀古诗通行编年"),
    "望洞庭": (824, 824, "敬宗宝历年间；刘禹锡任和州前后通行编年"),
    "再游玄都观": (826, 826, "宝历二年回洛阳后；通行系年"),
    "大林寺桃花": (816, 816, "元和十一年江州时期；通行系年"),
    "卖炭翁": (809, 809, "元和四年《新乐府》时期；通行系年"),
    "暮江吟": (822, 822, "长庆二年前后杭州任职时期；通行系年"),
}


def infer_period(start: int, end: int) -> str:
    year = (start + end) // 2
    if year <= 713:
        return "初唐"
    if year <= 766:
        return "盛唐"
    if year <= 835:
        return "中唐"
    return "晚唐"


def make_tag(name: str, category: str, source_id: str, now: str) -> dict[str, str]:
    definitions = {
        "爱情闺怨": "项目初版主题分类；记录爱情、宫怨、闺思等题材候选，不等同单一情感结论。",
        "咏物": "项目初版主题分类；以具体物象寄托品格、身世或情感的作品候选。",
        "比喻": "以相似关系形成的明喻、暗喻或比拟性表达候选。",
        "拟人": "将非人事物赋予人的动作、情感或意志的表达候选。",
        "夸张": "有意放大、缩小或超常化的数量、空间、时间和力量表达候选。",
        "对比": "把相反、相异或今昔两面并置以形成张力的表达候选。",
        "用典": "借用历史、神话、经典或前代诗文语境的表达候选。",
        "衬托": "以动衬静、以声衬静、以景衬情等对照性表达候选。",
        "借景抒情": "借自然或环境景象承载、转折或反衬情感的表达候选。",
        "托物言志": "借具体物象表达品格、志向或身世感的表达候选。",
    }
    return {
        "tag_id": sid("tag", f"{category}:{name}"), "tag_name": name, "category": category,
        "parent_tag_id": "", "definition": definitions.get(name, "项目候选标签；待人工复核。"),
        "source_id": source_id, "source_locator": "docs/tang_poem_evidence_protocol_v1.md; 初版定义",
        "review_status": "pending", "created_by": "evidence_protocol_v1", "created_at": now,
        "updated_at": now, "notes": "新增标签；未完成双人复核。",
    }


def line_lookup(lines: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    output: dict[str, list[dict[str, str]]] = {}
    for row in lines:
        output.setdefault(row["poem_id"], []).append(row)
    return output


def first_evidence_line(poem_lines: list[dict[str, str]], technique: str) -> dict[str, str] | None:
    cues = {
        "比喻": ("如", "若", "似", "疑是"),
        "拟人": ("邀", "迎", "报", "笑", "问", "劝", "怨"),
        "夸张": ("千里", "万重", "九天", "三千", "一日", "几千", "上青天"),
        "对比": ("不", "却", "独", "无", "还", "更", "今", "昔"),
    }
    for row in poem_lines:
        if any(cue in row["line_text"] for cue in cues.get(technique, ())):
            return row
    return None


def build(root: pathlib.Path) -> dict[str, int]:
    data = root / "data"
    reports = root / "reports"
    now = NOW
    source_fields, sources = read_csv(data / "sources.csv")
    source_ids = {row["source_id"] for row in sources}
    added_sources = [row for row in source_rows(now) if row["source_id"] not in source_ids]
    sources.extend(added_sources)
    write_csv(data / "sources.csv", source_fields, sources)

    poem_fields, poems = read_csv(data / "poems.csv")
    line_fields, lines = read_csv(data / "poem_lines.csv")
    poet_fields, poets = read_csv(data / "poets.csv")
    poet_name = {row["poet_id"]: row["name"] for row in poets}
    manifest_fields, manifest = read_csv(reports / "tang_poem_expansion_manifest_v1.csv")
    new_ids = {row["poem_id"] for row in manifest}
    poems_by_id = {row["poem_id"]: row for row in poems}
    lines_by_poem = line_lookup(lines)

    source_map = {key: sid("src", key) for key in (
        "ctext_tangshi_beicai", "pep_zh_jingdian", "cssn_dufu_dating",
        "cssn_digital_humanities_dating", "pku_moon_imagery", "snnu_tang_poetry_changan"
    )}
    tags_fields, tags = read_csv(data / "tags.csv")
    tag_by_name = {row["tag_name"]: row for row in tags}
    requested_tags = set(name for values in THEMES.values() for name in values)
    requested_tags.update(name for values in TECHNIQUES.values() for name in values)
    for name in sorted(requested_tags):
        category = "theme" if name in {"山水田园", "边塞征战", "送别", "思乡怀人", "羁旅", "咏史怀古", "咏物", "爱情闺怨", "政治讽喻", "人生感怀"} else "technique"
        if name not in tag_by_name:
            row = make_tag(name, category, source_map["pep_zh_jingdian"], now)
            tags.append(row); tag_by_name[name] = row
    write_csv(data / "tags.csv", tags_fields, tags)

    poem_tags_fields, poem_tags = read_csv(data / "poem_tags.csv")
    existing_poem_tags = {(row["poem_id"], row["tag_id"]) for row in poem_tags}
    imagery_fields, imagery = read_csv(data / "imagery.csv")
    imagery_by_name = {row["canonical_name"]: row for row in imagery}
    imagery_names = sorted(imagery_by_name, key=len, reverse=True)
    pimg_fields, poem_imagery = read_csv(data / "poem_imagery.csv")
    color_fields, colors = read_csv(data / "color_occurrences.csv")
    tech_fields, techniques = read_csv(data / "technique_annotations.csv")
    existing_tech = {(row["poem_id"], row["technique_tag_id"], row.get("quote", "")) for row in techniques}
    existing_img = {(row["poem_id"], row["imagery_id"], row["start_line_id"], row["start_offset"]) for row in poem_imagery}
    existing_color = {(row["poem_id"], row["color_term"], row["start_line_id"], row["start_offset"]) for row in colors}

    evidence_fields = [
        "evidence_id", "poem_id", "title", "poet", "dimension", "candidate_value", "quote",
        "authority_grade", "source_id", "source_url", "source_locator", "evidence_summary",
        "annotation_method", "dating_status", "review_status", "notes",
    ]
    evidence = []
    added = {"poem_tags": 0, "poem_imagery": 0, "colors": 0, "techniques": 0, "dating": 0}

    # validator requires technique annotations to point to a line or span.
    # Earlier candidate rows used poem scope; preserve their wording but attach
    # them to the first line as an explicit review anchor.
    for row in techniques:
        if row.get("scope") == "poem":
            first = lines_by_poem.get(row["poem_id"], [None])[0]
            if first:
                row["scope"] = "line"
                row["start_line_id"] = first["line_id"]
                row["end_line_id"] = first["line_id"]
                row["quote"] = first["line_text"]
                row["updated_at"] = now
                row["notes"] = (row.get("notes", "") + "; scope_repaired_to_first_line_for_validation=true").strip("; ")
    existing_tech = {(row["poem_id"], row["technique_tag_id"], row.get("quote", "")) for row in techniques}

    for poem_id in sorted(new_ids):
        poem = poems_by_id[poem_id]
        title = poem["title"]
        poet = poet_name.get(poem["poet_id"], "")
        poem_lines = lines_by_poem.get(poem_id, [])
        # 年份只回填有明确候选的条目；其余保留空值并写入登记表。
        if title in DATING:
            start, end, basis = DATING[title]
            poem["year_start"], poem["year_end"] = str(start), str(end)
            poem["period"] = infer_period(start, end)
            poem["dating_basis"] = basis + "；依据见 evidence_register，待双人复核"
            poem["updated_at"] = now
            added["dating"] += 1
            evidence.append({
                "evidence_id": sid("evidence", f"{poem_id}:dating"), "poem_id": poem_id, "title": title,
                "poet": poet, "dimension": "dating", "candidate_value": f"{start}-{end}", "quote": "",
                "authority_grade": "A/B", "source_id": source_map["cssn_dufu_dating"],
                "source_url": "https://www.cssn.cn/wx/wx_zggdwx/202208/t20220802_5442818.shtml",
                "source_locator": "系年方法与相关诗人年谱讨论；逐篇年谱定位待补",
                "evidence_summary": basis,
                "annotation_method": "学界常用系年候选，非模型推断；范围仍需逐篇复核",
                "dating_status": "provisional", "review_status": "pending",
                "notes": "仅在来源明确或通行系年较一致时回填；如出现新证据应改为范围或留空。",
            })
        else:
            evidence.append({
                "evidence_id": sid("evidence", f"{poem_id}:dating"), "poem_id": poem_id, "title": title,
                "poet": poet, "dimension": "dating", "candidate_value": "", "quote": "",
                "authority_grade": "A", "source_id": source_map["cssn_dufu_dating"],
                "source_url": "https://www.cssn.cn/wx/wx_zggdwx/202208/t20220802_5442818.shtml",
                "source_locator": "系年方法：需结合年谱、编年本、历史事件和版本",
                "evidence_summary": "当前未找到足够明确的逐篇创作年份，保留空值",
                "annotation_method": "不以作者生卒年替代作品创作年",
                "dating_status": "undetermined", "review_status": "pending",
                "notes": "后续优先查年谱、题下注、交游和历史地理证据。",
            })

        for theme in THEMES.get(title, []):
            tag = tag_by_name[theme]
            key = (poem_id, tag["tag_id"])
            if key not in existing_poem_tags:
                poem_tags.append({
                    "poem_tag_id": sid("ptag", f"{poem_id}:theme:{theme}"), "tag_id": tag["tag_id"], "poem_id": poem_id,
                    "scope": "poem", "start_line_id": "", "end_line_id": "", "start_offset": "", "end_offset": "", "quote": "",
                    "explanation": "项目文本分析候选：结合题材、语义和选本/教材常见解读；未将专家评价直接等同于标签。",
                    "confidence": "0.68", "source_id": source_map["pep_zh_jingdian"],
                    "source_locator": "中华经典资源库/通行选本作为文本与解读参考；具体诗篇定位待补",
                    "review_status": "pending", "created_by": "evidence_enrichment_v1", "created_at": now, "updated_at": now,
                    "notes": "new130; candidate_only=true; human_double_review_required=true",
                })
                existing_poem_tags.add(key); added["poem_tags"] += 1
            evidence.append({
                "evidence_id": sid("evidence", f"{poem_id}:theme:{theme}"), "poem_id": poem_id, "title": title,
                "poet": poet, "dimension": "theme", "candidate_value": theme, "quote": poem["full_text"],
                "authority_grade": "B/C", "source_id": source_map["pep_zh_jingdian"],
                "source_url": "https://www.pep.com.cn/products/zhytu/gjshnj/zhyxdb/202004/t20200419_1950891.shtml",
                "source_locator": "通行文本和经典解读参考；本项目按文本语义形成候选",
                "evidence_summary": "教材/选本提供通行文本和解读语境；标签为项目分析口径",
                "annotation_method": "manual_topic_map_v1", "dating_status": "", "review_status": "pending",
                "notes": "不声称逐篇专家定论；需人工复核主次主题。",
            })

        for line in poem_lines:
            text = line["line_text"]
            for canonical in imagery_names:
                start = 0
                while True:
                    offset = text.find(canonical, start)
                    if offset < 0:
                        break
                    key = (poem_id, imagery_by_name[canonical]["imagery_id"], line["line_id"], str(offset))
                    if key not in existing_img:
                        poem_imagery.append({
                            "poem_imagery_id": sid("pimg", f"{poem_id}:{line['line_id']}:{canonical}:{offset}"),
                            "imagery_id": imagery_by_name[canonical]["imagery_id"], "poem_id": poem_id, "scope": "span",
                            "start_line_id": line["line_id"], "end_line_id": line["line_id"], "start_offset": str(offset),
                            "end_offset": str(offset + len(canonical)), "quote": canonical,
                            "explanation": "规则候选：词面命中；意象义和语境功能待人工复核。",
                            "confidence": "0.55", "surface_form": canonical, "contextual_meaning": "",
                            "source_id": source_map["ctext_tangshi_beicai"],
                            "source_locator": "原文逐字匹配；传统选本作为语境参考",
                            "review_status": "pending", "created_by": "evidence_enrichment_v1", "created_at": now,
                            "updated_at": now, "notes": "new130; lexical_candidate=true; human_double_review_required=true",
                        })
                        existing_img.add(key); added["poem_imagery"] += 1
                    evidence.append({
                        "evidence_id": sid("evidence", f"{poem_id}:imagery:{line['line_id']}:{canonical}:{offset}"),
                        "poem_id": poem_id, "title": title, "poet": poet, "dimension": "imagery",
                        "candidate_value": canonical, "quote": canonical, "authority_grade": "C",
                        "source_id": source_map["ctext_tangshi_beicai"],
                        "source_url": "https://ctext.org/datawiki.pl?if=gb&remap=gb&res=683058",
                        "source_locator": f"句号={line['line_no']}; 字符偏移={offset}",
                        "evidence_summary": "原文词面命中；传统选本仅作语境参考，不替代人工判断",
                        "annotation_method": "imagery_lexicon_v1", "dating_status": "", "review_status": "pending",
                        "notes": "单字词可能是普通词或专名，需人工排除误报。",
                    })
                    start = offset + len(canonical)

            for color in ("白", "红", "黄", "金", "青", "朱"):
                start = 0
                while True:
                    offset = text.find(color, start)
                    if offset < 0:
                        break
                    key = (poem_id, color, line["line_id"], str(offset))
                    if key not in existing_color:
                        colors.append({
                            "color_occurrence_id": sid("color", f"{poem_id}:{line['line_id']}:{color}:{offset}"),
                            "poem_id": poem_id, "scope": "span", "start_line_id": line["line_id"], "end_line_id": line["line_id"],
                            "start_offset": str(offset), "end_offset": str(offset + 1), "quote": color,
                            "explanation": "规则候选：颜色词面命中；字面、借代、姓氏或专名用法待人工复核。",
                            "confidence": "0.50", "color_term": color,
                            "normalized_color": {"白": "白色", "红": "红色", "黄": "黄色", "金": "金色", "青": "青色", "朱": "朱红色"}[color],
                            "color_hex": "", "usage_type": "ambiguous", "mapping_basis": "仅保留词面，不赋现代色值",
                            "source_id": source_map["ctext_tangshi_beicai"], "source_locator": f"句号={line['line_no']}; 字符偏移={offset}",
                            "review_status": "pending", "created_by": "evidence_enrichment_v1", "created_at": now, "updated_at": now,
                            "notes": "new130; lexical_candidate=true; human_double_review_required=true",
                        })
                        existing_color.add(key); added["colors"] += 1
                    evidence.append({
                        "evidence_id": sid("evidence", f"{poem_id}:color:{line['line_id']}:{color}:{offset}"),
                        "poem_id": poem_id, "title": title, "poet": poet, "dimension": "color",
                        "candidate_value": color, "quote": color, "authority_grade": "C",
                        "source_id": source_map["ctext_tangshi_beicai"],
                        "source_url": "https://ctext.org/datawiki.pl?if=gb&remap=gb&res=683058",
                        "source_locator": f"句号={line['line_no']}; 字符偏移={offset}",
                        "evidence_summary": "原文颜色词面命中；借代、姓氏、金属和专名用法需人工排除",
                        "annotation_method": "color_lexicon_v1", "dating_status": "", "review_status": "pending",
                        "notes": "颜色值不自动映射；单字词需人工复核。",
                    })
                    start = offset + 1

        for technique in TECHNIQUES.get(title, []):
            tag = tag_by_name[technique]
            line = first_evidence_line(poem_lines, technique)
            if line:
                scope, start_line_id, end_line_id, start_offset, end_offset, quote = "line", line["line_id"], line["line_id"], "", "", line["line_text"]
            else:
                # A provisional technique still needs a review anchor. The
                # first line is not claimed as the sole evidence; the note
                # records that the whole-poem interpretation remains pending.
                anchor = poem_lines[0] if poem_lines else None
                scope = "line" if anchor else "poem"
                start_line_id = anchor["line_id"] if anchor else ""
                end_line_id = anchor["line_id"] if anchor else ""
                start_offset = end_offset = ""
                quote = anchor["line_text"] if anchor else ""
            key = (poem_id, tag["tag_id"], quote)
            if key not in existing_tech:
                techniques.append({
                    "technique_annotation_id": sid("tech", f"{poem_id}:technique:{technique}:{quote}"),
                    "technique_tag_id": tag["tag_id"], "poem_id": poem_id, "scope": scope,
                    "start_line_id": start_line_id, "end_line_id": end_line_id, "start_offset": start_offset,
                    "end_offset": end_offset, "quote": quote,
                    "explanation": "项目表现手法候选：根据文本结构和常见鉴赏术语标注；若无单句证据则保留整诗候选。",
                    "confidence": "0.55", "effect": "待人工复核表达效果及是否应改为其他术语。",
                    "source_id": source_map["ctext_tangshi_beicai"],
                    "source_locator": "传统选本/文本语境参考；未将普通网站赏析作为唯一依据",
                    "review_status": "pending", "created_by": "evidence_enrichment_v1", "created_at": now, "updated_at": now,
                    "notes": "new130; candidate_only=true; human_double_review_required=true",
                })
                existing_tech.add(key); added["techniques"] += 1
            evidence.append({
                "evidence_id": sid("evidence", f"{poem_id}:technique:{technique}:{quote}"),
                "poem_id": poem_id, "title": title, "poet": poet, "dimension": "technique",
                "candidate_value": technique, "quote": quote, "authority_grade": "B/C",
                "source_id": source_map["ctext_tangshi_beicai"],
                "source_url": "https://ctext.org/datawiki.pl?if=gb&remap=gb&res=683058",
                "source_locator": "传统选本与文本结构参考；逐句表达效果待人工复核",
                "evidence_summary": "项目分析候选，不把普通网站赏析当作专家定论",
                "annotation_method": "technique_map_v1", "dating_status": "", "review_status": "pending",
                "notes": "有单句引文时可定位；无引文时保留整诗候选。",
            })

    write_csv(data / "poems.csv", poem_fields, poems)
    write_csv(data / "poem_tags.csv", poem_tags_fields, poem_tags)
    write_csv(data / "poem_imagery.csv", pimg_fields, poem_imagery)
    write_csv(data / "color_occurrences.csv", color_fields, colors)
    write_csv(data / "technique_annotations.csv", tech_fields, techniques)
    write_csv(reports / "tang_poem_evidence_register_v1.csv", evidence_fields, evidence)
    return {"new_poems": len(new_ids), "evidence_rows": len(evidence), **added}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    counts = build(args.root)
    print(counts)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import raw from './generated/researchedPoets.json';
import type { JournalPoet, JournalWork } from '../sections/journal/journalData';
import type { Period } from '../types/domain';
import { researchedRelations } from '../sections/poets/supplementalPoets';
import originalCorpus from './generated/tang-poem.json';

export type ResearchedAuthor = {
  name: string; poetId: string; period: Period; dates?: string;
  biography?: string; biographySource?: string; biographyUrl?: string;
  sourceUrl?: string; authorId?: number;
  works?: (JournalWork & { id: string })[];
};
export const researchedAuthors = raw as Record<string, ResearchedAuthor>;
const briefBiographies: Record<string, [string, string]> = {
  '严武': ['严武，字季鹰，华州华阴人。唐代官员、诗人，曾任成都尹、剑南节度使，与杜甫有诗文往来。', 'https://zh.wikipedia.org/wiki/严武_(唐朝)'],
  '崔兴宗': ['崔兴宗，唐代诗人，与王维、裴迪等人有唱和往来。存诗有《留别王维》《酬王维卢象见过林亭》等。', 'https://www.guoxuedashi.com/shici/bk431i/'],
  '崔护': ['崔护，字殷功，博陵人。贞元十二年进士，官至岭南节度使，以《题都城南庄》传世。', 'https://zh.wikisource.org/zh-hans/Author:崔護'],
  '张九龄': ['张九龄，字子寿，韶州曲江人。唐代宰相、诗人，诗作有《感遇》《望月怀远》等。', 'https://zh.wikipedia.org/wiki/张九龄'],
  '张旭': ['张旭，唐代书法家、诗人，以草书著称。与贺知章、张若虚、包融并称吴中四士，诗作有《桃花溪》等。', 'https://zh.wikipedia.org/wiki/張旭'],
  '张若虚': ['张若虚，唐代诗人，与贺知章、张旭、包融并称吴中四士。传世作品有《春江花月夜》《代答闺梦还》。', 'https://zh.wikipedia.org/wiki/张若虚'],
  '李冶': ['李冶，字季兰，唐代女道士、诗人。长期寓居江浙，与刘长卿、陆羽、皎然等有诗歌往来，善弹琴。', 'https://www.sou-yun.cn/KnowledgeGraph.aspx?id=20818&pageNo=1&resourcePath=&resourceType=Author&type=People'],
  '李邕': ['李邕，字泰和，扬州江都人，李善之子。唐代文学家、书法家，曾任北海太守，世称李北海。', 'https://pedia.cloud.edu.tw/Entry/Detail/?search=李邕&title=李邕'],
  '苏颋': ['苏颋，字廷硕，唐代大臣、文学家。开元年间任宰相，参与修国史，诗文有应制、送别等篇。', 'https://zh.wikisource.org/zh-hans/Author:蘇頲'],
  '裴迪': ['裴迪，唐代山水田园诗人，与王维有辋川唱和，作品多为五言绝句，存《送崔九》等诗。', 'https://www.quanxue.cn/ct_rujia/tangsh/tangsh96.html'],
  '郑昈': ['郑昈，唐代诗人，传世作品有五言律诗《落花》。', 'https://www.sou-yun.cn/Query.aspx?type=poem1&id=39392'],
};
for (const [name, [biography, biographyUrl]] of Object.entries(briefBiographies)) {
  Object.assign(researchedAuthors[name], { biography, biographySource: '人物小传', biographyUrl });
}

// Dates with competing reconstructions remain approximate, rather than becoming chart facts.
const journalMetadata: Record<string, [string, string, string, string, string]> = {
  'wang-ji': ['约585—644', '字无功，号东皋子', '质朴自然', '绛州龙门（今山西河津）', '以田园景物、饮酒与归隐生活入诗，语言疏朗，情感真率。'],
  'wang-bo': ['约650—676', '字子安', '清新俊逸', '绛州龙门（今山西河津）', '诗与骈文并擅，以开阔的胸襟和精警的对句拓展初唐诗境。'],
  'yang-jiong': ['650—约693', '世称杨盈川', '雄健明朗', '华阴（今属陕西）', '五言律诗多写从军报国之志，篇幅凝练，声律整饬。'],
  'lu-zhaolin': ['约634—约689', '字升之，号幽忧子', '铺陈流丽', '幽州范阳（今河北涿州）', '七言歌行铺叙都市生活，兼写荣华与失意，《长安古意》最具代表性。'],
  'luo-binwang': ['约619—684后', '字观光', '慷慨清峻', '婺州义乌（今属浙江）', '工于五律与七言歌行，善以比兴寄托身世，诗文常见慷慨之气。'],
  'chen-ziang': ['661—702', '字伯玉', '古朴雄浑', '梓州射洪（今属四川）', '倡导汉魏风骨和风雅兴寄，以《感遇》等作品推动初唐诗风转变。'],
  'meng-haoran': ['689—740', '世称孟襄阳', '清淡自然', '襄州襄阳（今属湖北）', '多写山水、田园、行旅与隐居生活，于平淡景物中寄寓真情。'],
  'wang-wei': ['约701—761', '字摩诘', '清幽空灵', '河东蒲州（今山西永济）', '诗画兼长，善写山水田园的光色与声息，也有雄浑的边塞篇章。'],
  'wang-changling': ['约698—约757', '字少伯', '深情雄健', '籍贯有太原、京兆等说', '以七言绝句见长，边塞、闺怨与送别诗兼具深情和含蓄的余味。'],
  'gao-shi': ['约704—765', '字达夫，一字仲武', '慷慨悲壮', '渤海蓨（今河北景县）', '边塞诗兼写建功抱负与士卒处境，古体歌行质实雄健。'],
  'cen-shen': ['约715—770', '世称岑嘉州', '奇峭壮丽', '先世南阳，后居江陵', '两度出塞，善将西域风物、军旅生活与奇特想象写入七言歌行。'],
  'wei-yingwu': ['约737—约792', '字义博', '澄淡闲远', '京兆杜陵（今陕西西安）', '擅长五言古诗，山水闲居诗澄淡，亦有体察民生疾苦之作。'],
  'meng-jiao': ['751—814', '字东野', '瘦硬深切', '湖州武康（今浙江德清）', '作诗锤炼字句，以古体见长，多写贫困、不遇与骨肉亲情。'],
  'han-yu': ['768—824', '字退之，世称韩昌黎', '雄奇险劲', '河南河阳（今河南孟州）', '倡导古文，诗歌以议论、奇险与散文句法开拓新的表现方式。'],
  'liu-zongyuan': ['773—819', '字子厚', '清峭深远', '祖籍河东（今山西永济）', '古文、寓言和山水游记成就突出，诗歌常以清寂景物写谪居心境。'],
  'li-he': ['790—816', '字长吉', '瑰奇幽峭', '福昌昌谷（今河南宜阳）', '歌行多用奇异意象、浓丽色彩与神话想象，形成独特的长吉诗风。'],
  'du-mu': ['803—852', '字牧之', '俊爽清丽', '京兆万年（今陕西西安）', '七绝与咏史诗见长，善从历史兴亡与眼前景物中寄寓感慨。'],
  'xu-hun': ['约788—约858', '字用晦，一字仲晦', '整密清丽', '长期居润州丁卯，籍贯有异说', '擅长近体诗，登临怀古与山水行旅之作较多，诗集以丁卯为名。'],
  'li-shangyin': ['约813—858', '字义山，号玉谿生', '深婉精密', '怀州河内（今河南沁阳）', '近体诗善用典故、象征与曲折的意象，咏史和无题诗尤有影响。'],
  'wen-tingyun': ['约812—约866', '字飞卿，本名岐', '秾丽细密', '太原祁（今山西祁县）', '诗词兼工，词作精于声律与细密意象，在花间词的发展中占有重要地位。'],
  'wei-zhuang': ['约836—910', '字端己', '清丽疏朗', '京兆杜陵（今陕西西安）', '诗写乱离与漂泊，词风清丽疏朗，传世诗集为《浣花集》。'],
};

const courtesyNames: Record<string, string> = {
  王绩: '无功', 王勃: '子安', 卢照邻: '升之', 骆宾王: '观光', 陈子昂: '伯玉',
  王昌龄: '少伯', 高适: '达夫', 韦应物: '义博', 孟郊: '东野', 韩愈: '退之',
  柳宗元: '子厚', 李贺: '长吉', 杜牧: '牧之', 许浑: '用晦', 李商隐: '义山',
  温庭筠: '飞卿', 韦庄: '端己',
};

export function researchedCourtesyName(name: string) {
  return courtesyNames[name];
}

const additionalBiographies: Record<string, string> = {
  王绩: '王绩，字无功，号东皋子。曾在隋、唐任职，后归隐乡里，以饮酒、田园与归隐为诗歌的重要题材，传世有《野望》等作品。',
  卢照邻: '卢照邻，字升之，号幽忧子，初唐四杰之一。曾任邓王府典签、新都尉，后因病离职。诗文兼擅，以七言歌行《长安古意》著称。',
  孟郊: '孟郊，字东野，湖州武康人。贞元十二年登进士第，曾任溧阳尉，与韩愈友善。诗作讲究锤炼，常写贫困、不遇与亲情。',
  韩愈: '韩愈，字退之，世称韩昌黎。曾任监察御史、刑部侍郎、潮州刺史、吏部侍郎等职，与柳宗元共同倡导古文，诗歌亦自成面目。',
  柳宗元: '柳宗元，字子厚，祖籍河东。参与永贞革新，后贬永州司马，继任柳州刺史。散文、寓言、山水游记与诗歌均有重要成就。',
  李贺: '李贺，字长吉，昌谷人。曾任太常寺奉礼郎。诗歌富于奇异想象，擅以浓丽色彩和新颖意象抒写抱负与不遇，传世有《李长吉歌诗》。',
  许浑: '许浑，字用晦，一字仲晦。大和六年进士，历任县令、监察御史、虞部员外郎及州刺史等职，后居丁卯。以近体诗见长，有《丁卯集》。',
  温庭筠: '温庭筠，本名岐，字飞卿，太原祁人。诗词兼工，精于音律，词作多以浓丽意象表现人物情态，对花间词的发展有重要影响。',
  韦庄: '韦庄，字端己，京兆杜陵人。早年经历晚唐战乱，后中进士，入蜀任王建幕职，前蜀时任宰相。诗词兼工，传世有《浣花集》。',
};
const additionalConnections: Record<string, string[]> = {
  陈子昂: ['王适：赏识其《感遇》诗，见《唐才子传》本传。'],
  高适: ['李白、杜甫：同游汴州，登吹台唱和，见《唐才子传》本传。'],
  柳宗元: ['刘禹锡：同遭贬谪，柳宗元曾请求以柳州任职与之相易，见《唐才子传》本传。'],
  李贺: ['韩愈：赏识其诗才，并作《讳辩》讨论李贺应举之事。'],
  许浑: ['杜牧：有《横江裴使君见迎，李、赵二秀才同来，因书四韵，兼寄江南许浑先辈》等寄赠诗。'],
  李商隐: ['令狐楚：曾予以提携，李商隐从其学习骈文，见《唐才子传》本传。'],
  韦庄: ['王建（前蜀）：聘为掌书记，后参与前蜀政事，见《唐才子传》本传。'],
};

export function researchedJournalPoet(id: string, name: string): JournalPoet {
  const author = researchedAuthors[name];
  const [dates, alias, school, hometown, description] = journalMetadata[id];
  const biography = author.biography ?? '';
  const sentences = biography.match(/[^。！？]+[。！？]/g) ?? [];
  const works = author.works ?? [];
  const connections = researchedRelations.filter(r => r.from === name || r.to === name)
    .map(r => `${r.from === name ? r.to : r.from}：${r.label}，见${r.work.startsWith('《') ? r.work : `《${r.work}》`}。`);
  return {
    id, name, count: 0, dates: `唐 · ${dates}`, alias, school, description,
    quote: works[0]?.excerpt?.match(/^.*?[。！？]/)?.[0] ?? '', works,
    profile: {
      hometown,
      biography: additionalBiographies[name] ?? originalCorpus.poets.find(poet => poet.name === name)?.biography ?? description,
      milestones: name === '孟浩然' ? ['隐居鹿门山。', '四十岁左右赴长安求仕。', '曾入张九龄幕府。'] : sentences.filter(s => /授|迁|贬|擢|进士|为.*(?:尉|令|刺史|郎)|归隐/.test(s)).slice(0, 5),
      connections: connections.length ? connections : additionalConnections[name] ?? [],
      achievements: description,
      status: ['wang-bo','yang-jiong','lu-zhaolin','luo-binwang'].includes(id) ? '初唐四杰之一。' : `${author.period}诗人，作品见《全唐诗》。`,
    },
    sources: [
      ...(author.biographyUrl ? [{title: `${author.biographySource}·${name}`, url: author.biographyUrl}] : []),
      ...(author.sourceUrl ? [{title: `搜韵·${name}诗文`, url: author.sourceUrl}] : []),
      ...(name === '许浑' ? [{ title: '杜牧寄许浑诗·《历代诗家》卷44', url: 'https://www.shidianguji.com/book/HY1017/chapter/1kmsbgeazngui' }] : []),
    ],
  };
}

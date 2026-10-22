import type { JournalPoet } from './journalData';

type ReviewedProfile = Pick<JournalPoet, 'alias' | 'school' | 'description' | 'quote' | 'profile' | 'sources'>;
const index = (author: number) => `https://www.sou-yun.cn/PoemIndex.aspx?author=${author}&dynasty=Tang`;
// Modern summaries, checked against the named primary biographies and dictionary entries.
// Literary labels describe style; they are not claims that the poets joined modern schools.
export const reviewedProfiles: Record<string, ReviewedProfile> = {
  'li-bai': {
    alias: '字太白，号青莲居士', school: '飘逸豪放',
    description: '善用想象、夸张和乐府歌行抒写抱负，也以清新自然的绝句见长。',
    quote: '天生我材必有用，千金散尽还复来。',
    profile: {
      hometown: '祖籍陇西成纪；少时居蜀中青莲乡。出生地有异说。',
      biography: '李白（701—762），唐代诗人。早年在蜀中生活，后长期漫游。天宝初供奉翰林，离京后继续游历。安史之乱中入永王李璘幕府，因事获罪，流放途中遇赦。晚年寓居当涂。',
      milestones: ['742年：奉诏入长安，供奉翰林。', '744年：离开长安，在洛阳与杜甫相识。', '759年：流放夜郎途中遇赦。', '762年：卒于当涂。'],
      connections: ['杜甫：744年相识，二人有唱和、赠答与怀人诗。', '孟浩然：有《赠孟浩然》《黄鹤楼送孟浩然之广陵》等赠别诗。', '李阳冰：当涂县令，受托编定李白诗集。'],
      achievements: '乐府歌行、古体诗和绝句均有重要成就，传世诗文集有《李太白文集》。',
      status: '后世尊称“诗仙”，与杜甫并称“李杜”。',
    },
    sources: [{ title: '《新唐书》卷202·李白传', url: 'https://zh.wikisource.org/wiki/新唐書/卷202#李白' }, { title: '《唐诗大辞典》修订本·李白（搜韵引录）', url: index(15188) }],
  },
  'du-fu': {
    alias: '字子美，自号少陵野老', school: '沉郁顿挫',
    description: '以诗记录战乱、民生和个人漂泊，在律诗与叙事诗中形成沉郁顿挫的风格。',
    quote: '安得广厦千万间，大庇天下寒士俱欢颜。',
    profile: {
      hometown: '河南巩县（今河南巩义）；祖籍襄阳。',
      biography: '杜甫（712—770），唐代诗人。曾游历吴越、齐赵，后困居长安。安史之乱中辗转流离，曾任左拾遗、华州司功参军。入蜀后居成都草堂，又寓居夔州，晚年漂泊荆湘。',
      milestones: ['744年：在洛阳与李白相识。', '757年：任左拾遗。', '759年：离华州，经秦州、同谷入蜀。', '766年：寓居夔州。', '770年：卒于荆湘漂泊途中。'],
      connections: ['李白：相识后同游梁宋、齐鲁，后有多首怀李白诗。', '高适：曾与李白、杜甫同游梁宋。', '严武：在成都给予杜甫资助，并表荐入幕。'],
      achievements: '在古体、近体与叙事诗方面成就突出，“三吏”“三别”等作品反映战乱中的社会生活。',
      status: '后世尊称“诗圣”，诗作被称为“诗史”，与李白并称“李杜”。',
    },
    sources: [{ title: '《旧唐书》卷190下·杜甫传', url: 'https://zh.wikisource.org/wiki/舊唐書/卷190下#杜甫' }, { title: '《唐诗大辞典》修订本·杜甫（搜韵引录）', url: index(17270) }],
  },
  'bai-juyi': {
    alias: '字乐天，晚号香山居士、醉吟先生', school: '平易讽谕',
    description: '主张诗歌关切现实，语言平易，以讽谕诗、叙事长篇和闲适诗著称。',
    quote: '文章合为时而著，歌诗合为事而作。',
    profile: {
      hometown: '华州下邽（今陕西渭南），祖籍太原。',
      biography: '白居易（772—846），唐代诗人。贞元十六年进士，曾任翰林学士、左拾遗。元和十年贬江州司马，后任忠州、杭州、苏州刺史。晚年居洛阳，与元稹、刘禹锡均有长期诗文往来。',
      milestones: ['800年：登进士第。', '815年：贬江州司马。', '822年：出任杭州刺史。', '825年：出任苏州刺史。', '846年：卒于洛阳。'],
      connections: ['元稹：长期酬唱，世称“元白”，共同倡导新乐府。', '刘禹锡：晚年唱和密切，世称“刘白”。'],
      achievements: '倡导新乐府，著有《新乐府》五十首，叙事长诗《长恨歌》《琵琶行》影响深远；有《白氏长庆集》。',
      status: '中唐重要诗人与文学理论家，“元白”诗风对后世及东亚汉诗产生影响。',
    },
    sources: [{ title: '《旧唐书》卷166·白居易传', url: 'https://zh.wikisource.org/wiki/舊唐書/卷166#白居易' }, { title: '《唐诗大辞典》修订本·白居易（搜韵引录）', url: index(18804) }],
  },
  'yuan-zhen': {
    alias: '字微之，别字威明', school: '元白诗派',
    description: '乐府诗关切时事，悼亡诗情意深挚，与白居易齐名。',
    quote: '曾经沧海难为水，除却巫山不是云。',
    profile: {
      hometown: '河南洛阳。',
      biography: '元稹（779—831），唐代诗人与文学家。早年明经及第，后登制科，任监察御史。曾贬江陵、通州，长庆二年短暂入相，后任浙东观察使、武昌军节度使等。与白居易往还酬唱，世称“元白”。',
      milestones: ['793年：明经及第。', '803年：登书判拔萃科，与白居易相识。', '810年：贬江陵府士曹参军。', '815年：转通州司马。', '822年：短暂入相，随后罢相。', '831年：卒于武昌军节度使任上。'],
      connections: ['白居易：同科登第、长期酬唱与通信，世称“元白”。', '李绅：与元稹、白居易的乐府创作有联系。'],
      achievements: '参与新乐府创作，悼亡诗与爱情诗著名，有《元氏长庆集》。',
      status: '中唐“元白”诗风的代表作家，也是唐代传奇的重要作者。',
    },
    sources: [{ title: '《旧唐书》卷166·元稹传', url: 'https://zh.wikisource.org/wiki/舊唐書/卷166#元稹' }, { title: '《唐诗大辞典》修订本·元稹（搜韵引录）', url: index(14615) }],
  },
  'liu-yuxi': {
    alias: '字梦得，世称刘宾客', school: '雄健含蓄',
    description: '善于咏史与托物寄意，也吸收民歌形式，语言明朗而富有哲思。',
    quote: '沉舟侧畔千帆过，病树前头万木春。',
    profile: {
      hometown: '占籍洛阳，少时居江南；史籍亦有彭城之说。',
      biography: '刘禹锡（772—842），唐代诗人、文学家。贞元九年进士。参与永贞革新，失败后贬朗州司马，此后历任连州、夔州、和州等地刺史。晚年以太子宾客分司东都，与白居易唱和。',
      milestones: ['793年：进士及第，又登宏辞科。', '805年：参与永贞革新，失败后贬朗州司马。', '815年：返京后再度出任地方官。', '826年：在扬州与白居易相逢酬唱。', '836年：以太子宾客分司东都。', '842年：卒。'],
      connections: ['柳宗元：同为永贞革新参与者，诗文往来密切，世称“刘柳”。', '白居易：诗歌唱和频繁，世称“刘白”。'],
      achievements: '咏史怀古与绝句成就突出，《竹枝词》等吸收民歌形式；著有《天论》，传世集有《刘宾客文集》。',
      status: '中唐重要诗人与思想家，白居易誉之为“诗豪”。',
    },
    sources: [{ title: '《旧唐书》卷160·刘禹锡传', url: 'https://zh.wikisource.org/wiki/舊唐書/卷160#劉禹錫' }, { title: '《唐诗大辞典》修订本·刘禹锡（搜韵引录）', url: index(14603) }],
  },
};

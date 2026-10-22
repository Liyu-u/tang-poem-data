export type ThemeVerse = { author: string; title: string; lines: string[]; subtheme?: string };

// Dark ink drawn from each scene: forest, sunset, bamboo, moonlit blue,
// desert ochre and autumn vermilion. Independent of statistical chart colors.
export const themeVerseInk: Record<string, string> = {
  'landscape-pastoral': '#426454',
  farewell: '#985748',
  objects: '#657144',
  homesick: '#4e6080',
  war: '#956737',
  other: '#a34f35',
};

// Representative reading excerpts only; these do not alter the topic counts.
export const themeVerses: Record<string, ThemeVerse> = {
  homesick: { author: '李白', title: '静夜思》《春夜洛城闻笛', lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡', '谁家玉笛暗飞声', '散入春风满洛城', '此夜曲中闻折柳', '何人不起故园情'] },
  farewell: { author: '王勃', title: '送杜少府之任蜀州', lines: ['海内存知己', '天涯若比邻', '无为在歧路', '儿女共沾巾', '城阙辅三秦', '风烟望五津', '与君离别意', '同是宦游人'] },
  war: { author: '王昌龄', title: '出塞二首·其一》《从军行七首·其四', lines: ['秦时明月汉时关', '万里长征人未还', '但使龙城飞将在', '不教胡马度阴山', '青海长云暗雪山', '孤城遥望玉门关', '黄沙百战穿金甲', '不破楼兰终不还'] },
  objects: { author: '李商隐', title: '蝉', lines: ['本以高难饱', '徒劳恨费声', '五更疏欲断', '一树碧无情', '薄宦梗犹泛', '故园芜已平', '烦君最相警', '我亦举家清'] },
  'landscape-pastoral': { author: '王维', title: '山居秋暝', lines: ['明月松间照', '清泉石上流', '竹喧归浣女', '莲动下渔舟', '空山新雨后', '天气晚来秋', '随意春芳歇', '王孙自可留'] },
  other: { author: '李商隐', title: '夜雨寄北》《无题·相见时难别亦难', subtheme: '怀人', lines: ['君问归期未有期', '巴山夜雨涨秋池', '何当共剪西窗烛', '却话巴山夜雨时', '相见时难别亦难', '东风无力百花残', '春蚕到死丝方尽', '蜡炬成灰泪始干'] },
};

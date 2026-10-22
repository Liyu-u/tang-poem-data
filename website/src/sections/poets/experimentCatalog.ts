export const experimentNames = [
  "李白",
  "杜甫",
  "王维",
  "李商隐",
  "元稹",
] as const;
export type ExperimentalPoet = (typeof experimentNames)[number];
export const isExperimentalPoet = (name: string): name is ExperimentalPoet =>
  (experimentNames as readonly string[]).includes(name);
export const experimentNotes: Record<ExperimentalPoet, string> = {
  李白: "银蓝等离子表面与两道偏斜耀斑；收敛光晕，让球核的流动纹理清晰可见。",
  杜甫: "琥珀颗粒缓慢翻涌，较宽的星核与厚薄分明的日冕呈现沉稳的重量感。",
  王维: "小星核隐在疏透的翡翠雾壳中，青绿薄雾之间留下空隙与暗部。",
  李商隐: "不对称的蔷紫星尘分成前后多层，旋涡与暗带交叠，呈现朦胧的纵深。",
  元稹: "两个大小不同的桃金球核缓慢互绕；双星属于艺术设定，不表示历史关系。",
};

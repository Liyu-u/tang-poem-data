/** The two reading scenes frame, but never count as, the eleven poems. */
export const timelineBookends = {
  prologue: {
    label: '序章', year: '公元618年', marker: '序',
    heading: ['大唐初启', '万千诗声将起'],
    paragraphs: [
      '一个王朝，从战火后的土地上生长。\n一代代人，把理想、离别与山河写进诗里。',
      '他们曾相信长风能够破浪，也曾在烽火中等待一封家书。\n他们看见盛世的光，也亲历山河的伤。',
      '循着十一首诗，走过大唐的盛衰。\n听那些远去的人，如何留下至今仍能击中我们的声音。',
    ],
    caption: '618—907', detail: '289年 · 十一首诗 · 一部大唐兴衰史',
    action: '循诗入唐 →', hint: '向前滚动，从第一声昂扬开始。',
  },
  epilogue: {
    label: '尾声', year: '公元907年', marker: '终',
    heading: ['大唐已远', '诗声未息'],
    paragraphs: [
      '宫阙会倾覆，旌旗会落下。\n一个王朝，终究走到了它的尽头。',
      '可那些写下离别、困顿与不甘的人，并未完全远去。\n当我们再次读到他们的诗，仍会为一次相逢欢喜，为一场离散心痛，为一个未竟的理想久久沉默。',
      '大唐止于907年。\n它留在诗里的生命，却仍在我们心中继续。',
    ],
    caption: '历史走向终点，诗歌抵达我们。', detail: '',
    action: '重返公元618年 ↺', hint: '重返开篇，让第一声诗再次响起。',
  },
} as const;

export type TimelineBookendKind = keyof typeof timelineBookends;

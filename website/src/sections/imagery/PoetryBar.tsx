const verses: Record<string, string[]> = {
  山: ['空山不见人', '但闻人语响', '会当凌绝顶', '一览众山小', '白日依山尽', '远上寒山石径斜', '两岸青山相对出'],
  风: ['春风又绿江南岸', '夜来风雨声', '风急天高猿啸哀', '野火烧不尽', '春风吹又生', '春风不度玉门关'],
  日: ['日照香炉生紫烟', '白日依山尽', '长河落日圆', '日出江花红胜火', '锄禾日当午', '海日生残夜'],
  云: ['只在此山中', '云深不知处', '朝辞白帝彩云间', '行到水穷处', '坐看云起时', '白云回望合'],
  天: ['天门中断楚江开', '碧水东流至此回', '天生我材必有用', '天阶夜色凉如水', '星垂平野阔', '天涯若比邻'],
  花: ['花落知多少', '感时花溅泪', '桃花潭水深千尺', '唯有牡丹真国色', '人面桃花相映红', '黄四娘家花满蹊'],
  水: ['黄河之水天上来', '春江潮水连海平', '水光潋滟晴方好', '江流天地外', '水落鱼梁浅', '清泉石上流'],
  月: ['海上生明月', '床前明月光', '举头望明月', '月落乌啼霜满天', '月出惊山鸟', '明月松间照'],
  春: ['好雨知时节', '当春乃发生', '春眠不觉晓', '春江花月夜', '红豆生南国', '春来发几枝'],
  秋: ['空山新雨后', '天气晚来秋', '秋月春风等闲度', '秋水共长天一色', '停车坐爱枫林晚', '长安一片月'],
};

/** A clipped, proportional text silhouette; the artwork remains a separate hover layer. */
export function PoetryBar({ name, count, axisMax }: { name: string; count: number; axisMax: number }) {
  const width = Math.max(1, count / axisMax * 680);
  const lines = verses[name] ?? [name];
  const blocks = [];
  let x = 0;
  let block = 0;
  while (x < width) {
    const phrase = lines[block % lines.length];
    const prominent = block % 3 !== 1;
    const size = prominent ? 17 : 11;
    const textWidth = phrase.length * size * 0.94;
    const blockWidth = textWidth + 1;
    blocks.push(<g key={block} transform={`translate(${x} 0)`}><g className={`imagery-ranking__fragment imagery-ranking__fragment--${block % 4}`}>
      {prominent ? <>
        <text y="23" fontSize={size} fill="#414943" textLength={textWidth} lengthAdjust="spacingAndGlyphs">{phrase}</text>
        <text y="32" fontSize="9" fill="#56635e" textLength={textWidth} lengthAdjust="spacingAndGlyphs">{lines[(block + 1) % lines.length]}</text>
        <text y="41" fontSize="9" fill="#657064" textLength={textWidth} lengthAdjust="spacingAndGlyphs">{lines[(block + 2) % lines.length]}</text>
        <text y="7" fontSize="7" fill="#657064" textLength={textWidth} lengthAdjust="spacingAndGlyphs">{lines[(block + 3) % lines.length]}{lines[(block + 4) % lines.length]}</text>
      </> : [0, 1, 2, 3].map((row) => <text key={row} y={10 + row * 10.3} fontSize="10" fill={row % 2 ? '#657064' : '#4e5b55'} textLength={textWidth} lengthAdjust="spacingAndGlyphs">{lines[(block + row) % lines.length]}</text>)}
    </g></g>);
    x += blockWidth;
    block += 1;
  }
  return <>
    <svg className="imagery-ranking__poetry" viewBox={`0 0 ${width} 42`} preserveAspectRatio="none" aria-hidden="true" focusable="false">{blocks}</svg>
    <svg className="imagery-ranking__dust" viewBox={`0 0 ${width} 42`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {Array.from({ length: Math.max(24, Math.round(width / 6)) }, (_, i) => <circle key={i} className={`imagery-ranking__grain imagery-ranking__grain--${i % 4}`} cx={((i * 73 + 11) % 997) / 997 * width} cy={4 + (i * 17 % 35)} r={0.45 + (i % 3) * 0.3} />)}
    </svg>
  </>;
}

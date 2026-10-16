"""只读数据检查；Python 3.10+；不修改CSV或报告。"""
import argparse, csv, datetime as dt, json, math, pathlib, re, tempfile

def validate(root):
    root=pathlib.Path(root)
    schema=json.loads((root/'schema.json').read_text(encoding='utf-8'))['tables']
    data={}; errors=[]
    def err(t,i,msg): errors.append(f'{t} 记录{i}: {msg}')
    for t,s in schema.items():
        data[t]=[]
        try:
            path=root/'data'/f'{t}.csv'
            if not path.read_bytes().startswith(b'\xef\xbb\xbf'): err(t,1,'缺少 UTF-8 BOM')
            with path.open(encoding='utf-8-sig',newline='') as h:
                reader=csv.DictReader(h,strict=True)
                if reader.fieldnames != [f['name'] for f in s['fields']]:
                    err(t,1,'表头或列顺序与schema不一致'); continue
                data[t]=list(reader)
        except (OSError,UnicodeError,csv.Error) as e: err(t,0,str(e))
    indices={t:{r.get(s['pk']):r for r in data[t]} for t,s in schema.items()}
    for t,s in schema.items():
        seen=set(); uniques=[set() for _ in s['unique']]
        for i,r in enumerate(data[t],2):
            if None in r or any(v is None for v in r.values()): err(t,i,'CSV字段数错误'); continue
            pk=r[s['pk']]
            if pk in seen: err(t,i,'重复主键')
            seen.add(pk)
            for k,cols in enumerate(s['unique']):
                key=tuple(r[c] for c in cols)
                if key in uniques[k]: err(t,i,'重复组合键 '+','.join(cols))
                uniques[k].add(key)
            for f in s['fields']:
                n=f['name']; v=r.get(n,'')
                if not v:
                    if f['required']: err(t,i,'必填为空 '+n)
                    continue
                if v!=v.strip() and n not in ('full_text','line_text','quote','evidence_quote'): err(t,i,'字段首尾空白 '+n)
                if f['enum'] and v not in f['enum']: err(t,i,'非法枚举 '+n)
                if f['ref'] and v not in indices[f['ref']]: err(t,i,'外键不存在 '+n)
                if n==s['pk'] and not re.fullmatch(re.escape(s['prefix'])+r'_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',v): err(t,i,'主键格式错误')
                if f['type'] in ('integer','decimal'):
                    try:
                        if f['type']=='integer' and not re.fullmatch(r'-?\d+',v): raise ValueError()
                        value=float(v)
                        if not math.isfinite(value): raise ValueError()
                        limits={'confidence':(0,1),'longitude':(-180,180),'latitude':(-90,90),'line_no':(1,math.inf),'couplet_no':(1,math.inf),'start_offset':(0,math.inf),'end_offset':(0,math.inf)}
                        if n in limits and not limits[n][0]<=value<=limits[n][1]: raise ValueError()
                    except ValueError: err(t,i,'数字类型或范围错误 '+n)
                if f['type']=='datetime':
                    try:
                        if dt.datetime.fromisoformat(v.replace('Z','+00:00')).tzinfo is None: raise ValueError()
                    except ValueError: err(t,i,'时间须为带时区ISO8601 '+n)
            for lo,hi in [('year_start','year_end'),('birth_year','death_year'),('created_at','updated_at')]:
                if r.get(lo) and r.get(hi):
                    try:
                        a,b=(dt.datetime.fromisoformat(r[x].replace('Z','+00:00')) for x in (lo,hi)) if lo=='created_at' else (int(r[x]) for x in (lo,hi))
                        if a>b: err(t,i,'时间顺序错误 '+lo+'/'+hi)
                    except (ValueError,TypeError): pass
            if t=='sources' and r.get('accessed_on'):
                try: dt.date.fromisoformat(r['accessed_on'])
                except ValueError: err(t,i,'访问日期格式错误')
            if t=='places':
                if bool(r['longitude'])!=bool(r['latitude']): err(t,i,'经纬度必须同时填写或同时为空')
                if r['longitude'] and not r['coordinate_precision']: err(t,i,'坐标须说明精度')
            if t=='poet_relations' and r['from_poet_id']==r['to_poet_id']: err(t,i,'诗人关系不可指向自身')
            if t=='color_occurrences' and r['color_hex'] and not re.fullmatch(r'#[0-9A-Fa-f]{6}',r['color_hex']): err(t,i,'色值格式错误')
            if t=='color_occurrences' and r['color_hex'] and not r['mapping_basis']: err(t,i,'展示色值须有映射依据')
            for col,category in [('technique_tag_id','technique'),('school_tag_id','school')]:
                if col in r and indices['tags'].get(r[col],{}).get('category')!=category: err(t,i,'标签类别错误 '+col)
    # Hierarchical dictionaries must not form cycles.
    for t,parent in [('tags','parent_tag_id'),('places','parent_place_id')]:
        for key in indices[t]:
            seen=set(); cur=key
            while cur in indices[t]:
                if cur in seen: errors.append(f'{t}: 父级循环 {key}'); break
                seen.add(cur); cur=indices[t][cur].get(parent)
    lines=indices['poem_lines']; by_poem={}
    for r in data['poem_lines']:
        try: by_poem.setdefault(r['poem_id'],[]).append((int(r['line_no']),r))
        except (ValueError,TypeError): pass
        if '\n' in r.get('line_text','') or '\r' in r.get('line_text',''): errors.append('poem_lines: 单句文本不得含换行')
    for pid,p in indices['poems'].items():
        seq=sorted(by_poem.get(pid,[]),key=lambda x:x[0])
        if [n for n,_ in seq]!=list(range(1,len(seq)+1)) or not seq: errors.append(f'poems: {pid} 缺句或句序不连续')
        if '\n'.join(r['line_text'] for _,r in seq)!=p.get('full_text'): errors.append(f'poems: {pid} full_text与分句不一致')
    for t,s in schema.items():
        if not any(f['name']=='scope' for f in s['fields']): continue
        for i,r in enumerate(data[t],2):
            scope=r.get('scope'); ids=[r.get('start_line_id'),r.get('end_line_id')]; offs=[r.get('start_offset'),r.get('end_offset')]
            if t in ('poem_imagery','technique_annotations','color_occurrences') and scope=='poem': err(t,i,'此类标注必须精确到句或片段')
            if scope=='poem':
                if any(ids+offs+[r.get('quote')]): err(t,i,'整诗标注不可带句/片段坐标或引文')
                continue
            if scope not in ('line','span'): continue
            if not all(ids) or any(x not in lines for x in ids): err(t,i,'缺少有效起止句'); continue
            start,end=[lines[x] for x in ids]
            if any(x['poem_id']!=r.get('poem_id') for x in (start,end)): err(t,i,'标注句不属于该诗'); continue
            try:
                a,b=int(start['line_no']),int(end['line_no'])
                if a>b: raise ValueError()
                if scope=='line':
                    if ids[0]!=ids[1] or any(offs): raise ValueError()
                    expected=start['line_text']
                else:
                    x,y=map(int,offs)
                    if not (0<=x<len(start['line_text']) and 0<y<=len(end['line_text'])) or (a==b and x>=y): raise ValueError()
                    if a==b: expected=start['line_text'][x:y]
                    else:
                        middle=[rr['line_text'] for n,rr in sorted(by_poem[r['poem_id']],key=lambda v:v[0]) if a<n<b]
                        expected='\n'.join([start['line_text'][x:]]+middle+[end['line_text'][:y]])
                if expected!=r.get('quote'): err(t,i,'引文与原文范围不匹配')
                word=r.get('surface_form') or r.get('color_term')
                if word and word not in expected: err(t,i,'意象/颜色词不在引文中')
            except (ValueError,TypeError,KeyError): err(t,i,'标注范围无效')
    # Audit history: polymorphic FK, target version and approval freshness.
    audit={}
    for i,r in enumerate(data['annotation_reviews'],2):
        t=r.get('target_table'); target=indices.get(t,{}).get(r.get('target_id'))
        if not target: err('annotation_reviews',i,'审核目标不存在'); continue
        try:
            reviewed=dt.datetime.fromisoformat(r['reviewed_at'].replace('Z','+00:00'))
            version=dt.datetime.fromisoformat(r['target_updated_at'].replace('Z','+00:00'))
            if reviewed.tzinfo is None or version.tzinfo is None or reviewed<version: raise ValueError()
            audit.setdefault((t,r['target_id'],r['target_updated_at']),[]).append((reviewed,r['decision']))
        except (ValueError,TypeError): err('annotation_reviews',i,'审核时间/版本时间错误')
        previous=indices['annotation_reviews'].get(r.get('previous_review_id'))
        if previous and (previous['target_table'],previous['target_id'])!=(t,r['target_id']): err('annotation_reviews',i,'前次审核目标不一致')
    for t,records in data.items():
        if t=='annotation_reviews': continue
        for i,r in enumerate(records,2):
            if r.get('review_status')=='approved':
                reviews=audit.get((t,r.get(schema[t]['pk']),r.get('updated_at')),[])
                latest=max((time for time,_ in reviews),default=None)
                decisions={decision for time,decision in reviews if time==latest}
                if decisions!={'approved'}: err(t,i,'approved缺少当前版本最新一致通过审核')
    return errors,{t:len(r) for t,r in data.items()}

def self_test():
    """合成数据仅在自动清理的临时目录内，不进入正式CSV。"""
    import copy, uuid
    original=pathlib.Path(__file__).resolve().parents[1]
    schema=json.loads((original/'schema.json').read_text(encoding='utf-8'))
    def uid(t): return schema['tables'][t]['prefix']+'_'+str(uuid.uuid4())
    now='2026-10-16T15:00:00+08:00'
    def row(t,**kw):
        r={f['name']:'' for f in schema['tables'][t]['fields']}
        r.update({schema['tables'][t]['pk']:uid(t),'review_status':'draft','created_by':'SYNTHETIC_TEST','created_at':now,'updated_at':now})
        r.update(kw); return r
    src=row('sources',source_type='other',title='SYNTHETIC TEST ONLY')
    common={'source_id':src['source_id'],'source_locator':'SYNTHETIC'}
    poet=row('poets',name='测试实体',**common)
    poem=row('poems',title='合成字符测试',poet_id=poet['poet_id'],poetic_form='待考',yuefu_type='待考',full_text='甲乙。\n丙丁。',**common)
    l1=row('poem_lines',poem_id=poem['poem_id'],line_no='1',line_text='甲乙。',**common)
    l2=row('poem_lines',poem_id=poem['poem_id'],line_no='2',line_text='丙丁。',**common)
    tag=row('tags',tag_name='测试手法',category='technique',definition='合成测试',**common)
    ann=row('technique_annotations',technique_tag_id=tag['tag_id'],poem_id=poem['poem_id'],scope='span',start_line_id=l1['line_id'],end_line_id=l2['line_id'],start_offset='1',end_offset='1',quote='乙。\n丙',explanation='合成',effect='合成',confidence='0.5',**common)
    base={t:[] for t in schema['tables']}
    for t,r in [('sources',src),('poets',poet),('poems',poem),('poem_lines',l1),('poem_lines',l2),('tags',tag),('technique_annotations',ann)]: base[t].append(r)
    cases=[('valid',None,None,None,False),('fk','poems','poet_id','missing',True),('enum','poems','poetic_form','theme',True),('quote','technique_annotations','quote','错',True),('offset','technique_annotations','end_offset','99',True),('negative','technique_annotations','start_offset','-1',True),('nan','technique_annotations','confidence','NaN',True),('line','poem_lines','line_no','3',True),('text','poems','full_text','错',True),('approved','poems','review_status','approved',True),('required','poets','name','',True),('category','tags','category','school',True),('uuid','poets','poet_id','bad',True),('timezone','poets','updated_at','2026-10-16',True),('dup',None,None,None,True),('encoding',None,None,None,True)]
    with tempfile.TemporaryDirectory(prefix='wenjing_test_') as temp:
        root=pathlib.Path(temp); (root/'data').mkdir()
        (root/'schema.json').write_text(json.dumps(schema),encoding='utf-8')
        for name,t,c,v,expected in cases:
            records=copy.deepcopy(base)
            if t: records[t][0][c]=v
            if name=='dup': records['poem_lines'].append(copy.deepcopy(l1))
            for table,s in schema['tables'].items():
                with (root/'data'/f'{table}.csv').open('w',encoding='utf-8' if name=='encoding' else 'utf-8-sig',newline='') as h:
                    writer=csv.DictWriter(h,fieldnames=[f['name'] for f in s['fields']]); writer.writeheader(); writer.writerows(records[table])
            errors,_=validate(root)
            assert bool(errors)==expected,(name,errors)
    return len(cases)

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]); p.add_argument('--self-test',action='store_true'); a=p.parse_args()
    if a.self_test:
        print(f'SELF-TEST PASS: {self_test()} cases'); return 0
    try: errors,counts=validate(a.root)
    except (OSError,ValueError,KeyError,TypeError) as e: print('配置/读取错误:',e); return 1
    print(json.dumps({'table_count':len(counts),'record_count':sum(counts.values()),'counts':counts,'error_count':len(errors),'errors':errors,'notice':'空模板仅验证结构；尚未采集或审核真实数据' if not sum(counts.values()) else '结构校验不代替学术审核'},ensure_ascii=False,indent=2))
    return 1 if errors else 0
if __name__=='__main__': raise SystemExit(main())

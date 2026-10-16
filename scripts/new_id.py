import argparse, json, pathlib, uuid
p=argparse.ArgumentParser(description='生成稳定ID，不写数据文件')
p.add_argument('prefix')
a=p.parse_args()
s=json.loads((pathlib.Path(__file__).resolve().parents[1]/'schema.json').read_text(encoding='utf-8'))
if a.prefix not in {t['prefix'] for t in s['tables'].values()}: p.error('未知前缀')
print(a.prefix+'_'+str(uuid.uuid4()))

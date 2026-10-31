#!/usr/bin/env python3
"""Search local resources and print a grounded AI implementation brief."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load():return json.loads((ROOT/'shared/lab-kit/registry.json').read_text())
def ordered(data,ids,engine=None):
    assets={a['id']:a for a in data['resources']};result=[];active=set();done=set()
    def visit(id):
        if id not in assets:raise ValueError('Unknown callable resource: '+id)
        if id in active:raise ValueError('Dependency cycle: '+id)
        if id in done:return
        a=assets[id]
        if engine and engine not in a['engine'] and 'engine-neutral' not in a['engine']:raise ValueError(id+' incompatible with '+engine)
        active.add(id)
        for dep in a['requires']:visit(dep)
        active.remove(id);done.add(id);result.append(a)
    for id in ids:visit(id)
    return result
def validate(data):
    errors=[]
    if len({a['id'] for a in data['resources']})!=len(data['resources']):errors.append('Duplicate resource IDs')
    for a in data['resources']:
        for f in ['version','status','engine','files','api','parameters','example','limits','acceptance']:
            if not a.get(f):errors.append(a['id']+': missing '+f)
        for p in a['files']:
            if not (ROOT/p).is_file():errors.append('Missing '+p)
        if not (ROOT/a['documentation'].split('#')[0]).is_file():errors.append('Missing API docs')
    for a in data['resources']+data['references']:
        for s in a['sources']:
            p=ROOT/s['path']
            if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=s['sha256']:errors.append('Source changed: '+s['path'])
    try:ordered(data,[a['id'] for a in data['resources']])
    except ValueError as e:errors.append(str(e))
    return errors
def match(a,q):return any(t.casefold() in q.casefold() for t in [a['id'],a['name']]+a['aliases'])
def brief(data,q,explicit,engine):
    selected=explicit+[a['id'] for a in data['resources'] if q and match(a,q) and (not engine or engine in a['engine'] or 'engine-neutral' in a['engine'])]
    assets=ordered(data,selected,engine)
    lines=['# 本次案例的AI复用上下文','需求：'+(q or '按ID选择'),'先读AGENTS.md和docs/reuse/DETAIL-PATTERNS.md。单位m/N/s/rad；连接点是资源根坐标。','已提取/已实现不等于所有场景已获用户验收。参考候选不可当作现成API。','读取/加载顺序（同文件只加载一次）：']
    if any(a['engine']==['three-r160'] for a in assets):lines.append('shared/vendor/three-r160.min.js — 只加载一个Three.js实例')
    lines+=list(dict.fromkeys(p for a in assets for p in a['files']))
    for a in assets:
        lines += ['',f"## {a['name']} [{a['id']}@{a['version']}]",'接口：'+', '.join(a['api']),'参数：'+json.dumps(a['parameters'],ensure_ascii=False),'连接点：'+json.dumps(a['anchors'],ensure_ascii=False),'```js',a['example'],'```','限制：'+'；'.join(a['limits']),'验收：'+'；'.join(a['acceptance']),'说明：'+a['documentation'],'来源：'+('；'.join(s['path']+' :: '+s['locator'] for s in a['sources']) or '新实现的公共组件或规范')]
    if not assets:lines.append('没有匹配的兼容资源；尝试同义词、--list或--asset。禁止编造API。')
    for a in data['references']:
        if q and match(a,q):lines.append('参考候选（尚不可调用）：'+a['name']+'；'+a['notes'])
    lines+=['','制作前列明资源版本、连接关系、物理公式、新增内容与待核验结构。制作后检查极限状态、切换、读数、镜头、离线请求和清理。']
    return '\n'.join(lines)+'\n'
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--query',default='');p.add_argument('--asset',action='append',default=[]);p.add_argument('--engine');p.add_argument('--validate',action='store_true');p.add_argument('--list',action='store_true');a=p.parse_args();d=load()
    if a.validate:
        errors=validate(d);print('\n'.join(errors) if errors else f"PASS: {len(d['resources'])} resources, dependencies and source hashes");return int(bool(errors))
    if a.list:
        for r in d['resources']+d['references']:print(r['id'],r['status'],r['name'],sep='\t')
        return 0
    try:print(brief(d,a.query,a.asset,a.engine),end='')
    except ValueError as e:p.error(str(e))
    return 0
if __name__=='__main__':raise SystemExit(main())

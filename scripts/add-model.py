#!/usr/bin/env python3
"""Add a standalone 3D HTML demo to this portfolio.

Example:
  python scripts/add-model.py ./新案例.html --id new-demo --category 电学元件 --tags 电阻,结构

The script copies the HTML to models/<id>.html, replaces an embedded Three.js r144
bundle with the shared CDN reference when detected, and appends metadata to catalog.js.
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog.js"
MODELS = ROOT / "models"
THREE_CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.144.0/build/three.min.js"></script>'

class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.title=''; self.h1=''; self.desc=''; self._tag=None; self._in_head_div=False; self._head_depth=0
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='title': self._tag='title'
        elif tag=='h1' and not self.h1: self._tag='h1'
        elif tag=='div' and 'head' in attrs.get('class','').split(): self._in_head_div=True; self._head_depth=1
        elif self._in_head_div and tag=='div': self._head_depth += 1
        elif self._in_head_div and tag=='p' and not self.desc: self._tag='p'
    def handle_endtag(self, tag):
        if self._tag==tag: self._tag=None
        if self._in_head_div and tag=='div':
            self._head_depth -= 1
            if self._head_depth<=0: self._in_head_div=False
    def handle_data(self, data):
        s=' '.join(data.split())
        if not s: return
        if self._tag=='title': self.title += (' ' if self.title else '') + s
        elif self._tag=='h1': self.h1 += (' ' if self.h1 else '') + s
        elif self._tag=='p' and self._in_head_div: self.desc += (' ' if self.desc else '') + s

def clean_title(s:str)->str:
    return re.sub(r'\s*[·|｜]\s*3D.*$','',s).strip()

def optimize_html(text:str)->tuple[str,bool]:
    pat=re.compile(r'<script>\s*/\*\*\s*\n \* @license\s*\n \* Copyright 2010-2022 Three\.js Authors\s*\n \* SPDX-License-Identifier: MIT\s*\n \*/.*?</script>',re.S)
    new,n=pat.subn(THREE_CDN,text,count=1)
    return new,bool(n)

def load_catalog():
    text=CATALOG.read_text(encoding='utf-8')
    m=re.search(r'window\.MODEL_CATALOG\s*=\s*(\[.*\])\s*;\s*$',text,re.S)
    if not m: raise RuntimeError('catalog.js format not recognized')
    return json.loads(m.group(1))

def save_catalog(data):
    CATALOG.write_text('window.MODEL_CATALOG = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('source',type=Path); ap.add_argument('--id',required=True,help='ASCII slug, e.g. ammeter')
    ap.add_argument('--category',default='未分类'); ap.add_argument('--tags',default='')
    ap.add_argument('--title'); ap.add_argument('--subtitle',default='3D 交互演示'); ap.add_argument('--symbol',default='3D'); ap.add_argument('--accent',default='blue')
    args=ap.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*',args.id): raise SystemExit('--id must use lowercase ASCII letters, digits and hyphens')
    text=args.source.read_text(encoding='utf-8')
    p=MetaParser(); p.feed(text)
    title=args.title or clean_title(p.h1 or p.title or args.source.stem)
    text,optimized=optimize_html(text)
    MODELS.mkdir(exist_ok=True); target=MODELS/f'{args.id}.html'
    if target.exists(): raise SystemExit(f'already exists: {target}')
    target.write_text(text,encoding='utf-8')
    data=load_catalog()
    if any(x.get('id')==args.id for x in data): raise SystemExit(f'id already exists in catalog: {args.id}')
    data.append({"id":args.id,"title":title,"subtitle":args.subtitle,"category":args.category,"summary":p.desc[:150],"tags":[x.strip() for x in args.tags.split(',') if x.strip()],"path":f'models/{args.id}.html',"symbol":args.symbol,"accent":args.accent})
    save_catalog(data)
    print(f'Added {title} -> {target.relative_to(ROOT)}')
    print('Embedded Three.js replaced with CDN.' if optimized else 'No embedded Three.js bundle detected; HTML kept as-is.')

if __name__=='__main__':
    main()

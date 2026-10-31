#!/usr/bin/env python3
"""Inline local scripts and styles into a standalone offline LabKit example."""
import argparse
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def bundle(source):
    text=source.read_text(encoding='utf-8')
    def asset(name):
        p=(source.parent/name).resolve()
        if not p.is_relative_to(ROOT):raise ValueError('Asset outside repository')
        return p.read_text(encoding='utf-8')
    def script(m):return '<script>\n'+re.sub(r'</script',r'<\\/script',asset(m[1]),flags=re.I)+'\n</script>'
    text=re.sub(r'<script src="([^"]+)" data-kit-inline></script>',script,text)
    text=re.sub(r'<link rel="stylesheet" href="([^"]+)" data-kit-inline>',lambda m:'<style>\n'+asset(m[1])+'\n</style>',text)
    text=text.replace('<a href="../docs/reuse/README.md">查看资源说明</a>','<span class="lab-note">离线单文件 · 资源复用验证</span>')
    if re.search(r'<script[^>]+src=|<link[^>]+rel="stylesheet"',text):raise ValueError('Unbundled dependency')
    return text
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,default=ROOT/'examples/reuse-lab.html');p.add_argument('--output',type=Path,default=ROOT/'examples/reuse-lab-offline.html');a=p.parse_args();a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(bundle(a.source.resolve()),encoding='utf-8');print(a.output)

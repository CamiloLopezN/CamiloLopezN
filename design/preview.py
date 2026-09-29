# Local preview of the README as GitHub renders it: uses GitHub's own Markdown API (no auth)
# and wraps it in the profile layout. Usage: python3 design/preview.py → .preview/index.html
import json, re, urllib.request, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
md = (root / 'README.md').read_text()
# With the `context` of a real repo GitHub keeps the <img> inside the <picture>; without it the image is
# moved out and dark mode appears broken.
req = urllib.request.Request('https://api.github.com/markdown',
    data=json.dumps({'text': md, 'mode': 'gfm', 'context': 'CamiloLopezN/CamiloLopezN'}).encode(),
    headers={'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
html = urllib.request.urlopen(req).read().decode()
html = re.sub(r'(src|srcset)="assets/', r'\1="../assets/', html)
css = urllib.request.urlopen('https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.css').read().decode()
(root / '.preview').mkdir(exist_ok=True)
(root / '.preview' / 'index.html').write_text(f'''<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile preview</title>
<style>{css}
body {{ margin: 0; background: #fff; }} @media (prefers-color-scheme: dark) {{ body {{ background: #0d1117; }} }}
.layout {{ max-width: 1280px; margin: 0 auto; padding: 24px 16px; display: flex; gap: 24px; }}
.side {{ width: 296px; flex: none; }} .side img {{ width: 296px; height: 296px; border-radius: 50%; }}
.box {{ flex: 1; min-width: 0; border: 1px solid #d0d7de; border-radius: 6px; padding: 24px; }}
@media (prefers-color-scheme: dark) {{ .box {{ border-color: #30363d; }} }}
@media (max-width: 767px) {{ .layout {{ flex-direction: column; }} .side {{ display: none; }} }}
.path {{ font: 12px ui-monospace, monospace; color: #8b949e; margin-bottom: 12px; }}
</style></head><body><div class="layout">
<div class="side"><img src="https://avatars.githubusercontent.com/u/99927458?v=4" alt=""></div>
<div class="box"><div class="path">CamiloLopezN / README.md</div><article class="markdown-body">{html}</article></div>
</div></body></html>''')
print('ok .preview/index.html')

#!/usr/bin/env python3
"""Indexador de contexto do METEORO (stdlib pura, zero deps).

Gera um mapa navegável do código para humanos e agentes não precisarem
ler os ~3800 linhas do game.js inteiro.

  python3 tools/codeindex.py             # (re)gera CODEMAP.md + .codeindex.json
  python3 tools/codeindex.py check       # sai 1 se o índice estiver desatualizado
  python3 tools/codeindex.py find <re>   # procura símbolos (função, seção, var, state, dados)
  python3 tools/codeindex.py show <fn>   # imprime só o corpo de uma função (com nº de linha)
  python3 tools/codeindex.py refs <nome> # todas as linhas que usam <nome> (palavra inteira)
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_FILES = ['game.js', 'data-stages.js', 'data-tree.js', 'data-wtree.js', 'data-meta.js']
EXTRA_FILES = ['index.html']
OUT_MD = 'CODEMAP.md'
OUT_JSON = '.codeindex.json'

SECTION_RE = re.compile(r'^\s*// -{3,} (.+?) -{3,}\s*$')
FUNC_RE = re.compile(r'^(\s*)function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)')
VAR_RE = re.compile(r'^  var\s+([A-Z_][A-Z0-9_]*)\s*=')  # constantes no topo do IIFE (2 espaços)
HASH_RE = re.compile(r"location\.hash\s*===\s*'(#[\w-]+)'")
STORAGE_RE = re.compile(r"localStorage\.(?:get|set|remove)Item\(\s*'([^']+)'")
DOMID_RE = re.compile(r"getElementById\('([\w-]+)'\)")
HTML_ID_RE = re.compile(r'id="([\w-]+)"')
STATE_FIELD_RE = re.compile(r'\bstate\.([A-Za-z_$][\w$]*)\s*=(?!=)')
DATA_ID_RE = re.compile(r"\b(?:id|key|name):\s*'([^']+)'")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def digest(rels):
    h = hashlib.sha1()
    for rel in rels:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            h.update(rel.encode())
            with open(p, 'rb') as f:
                h.update(f.read())
    return h.hexdigest()[:16]


def block_end(lines, start):
    """Linha (0-based) onde fecha o primeiro bloco {...} que começa em lines[start].
    Scanner leve: ignora strings, comentários e regex literais simples."""
    depth, seen = 0, False
    in_block_comment = False
    for i in range(start, len(lines)):
        s, j, n = lines[i], 0, len(lines[i])
        prev = ''
        while j < n:
            c = s[j]
            if in_block_comment:
                if s.startswith('*/', j):
                    in_block_comment = False
                    j += 1
            elif s.startswith('//', j):
                break
            elif s.startswith('/*', j):
                in_block_comment = True
                j += 1
            elif c in '\'"`':
                j += 1
                while j < n and s[j] != c:
                    j += 2 if s[j] == '\\' else 1
            elif c == '/' and prev in '(,=:!&|?{};' :
                j += 1
                while j < n and s[j] != '/':
                    j += 2 if s[j] == '\\' else 1
            elif c == '{':
                depth += 1
                seen = True
            elif c == '}':
                depth -= 1
                if seen and depth == 0:
                    return i
            if not c.isspace():
                prev = c
            j += 1
    return len(lines) - 1


def index_js(rel):
    lines = read(rel).split('\n')
    sections, funcs, consts = [], [], []
    hashes, storage, domids, state_fields = set(), set(), set(), {}
    cur = None
    for i, line in enumerate(lines):
        ln = i + 1
        m = SECTION_RE.match(line)
        if m:
            cur = m.group(1).strip()
            sections.append({'name': cur, 'line': ln})
        m = FUNC_RE.match(line)
        if m:
            end = block_end(lines, i) + 1
            funcs.append({'name': m.group(2), 'args': m.group(3).strip(), 'line': ln, 'end': end,
                          'depth': len(m.group(1)) // 2, 'section': cur})
        m = VAR_RE.match(line)
        if m:
            consts.append({'name': m.group(1), 'line': ln, 'section': cur})
        hashes.update(HASH_RE.findall(line))
        storage.update(STORAGE_RE.findall(line))
        domids.update(DOMID_RE.findall(line))
        for f in STATE_FIELD_RE.findall(line):
            state_fields.setdefault(f, ln)
    for k, s in enumerate(sections):
        s['end'] = sections[k + 1]['line'] - 1 if k + 1 < len(sections) else len(lines)
    return {'file': rel, 'lines': len(lines), 'sections': sections, 'functions': funcs, 'consts': consts,
            'hash_modes': sorted(hashes), 'storage_keys': sorted(storage), 'dom_ids': sorted(domids),
            'state_fields': state_fields}


def public_api(src):
    m = re.search(r'\n  return \{(.*?)\n  \};', src, re.S)
    if not m:
        return []
    return sorted(set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*:', m.group(1))))


def data_summary(rel):
    src = read(rel)
    head = src.split('\n')[1].strip() if '\n' in src else ''
    glob = re.search(r'window\.(\w+)\s*=', src)
    ids = DATA_ID_RE.findall(src)
    return {'file': rel, 'global': glob.group(1) if glob else None, 'doc': head.strip('/* ').strip(),
            'sample_ids': ids[:12], 'id_count': len(ids)}


def build():
    files = [index_js(r) for r in JS_FILES if os.path.exists(os.path.join(ROOT, r))]
    game = files[0]
    html = read('index.html') if os.path.exists(os.path.join(ROOT, 'index.html')) else ''
    html_ids = sorted(set(HTML_ID_RE.findall(html)))
    idx = {
        'digest': digest(JS_FILES + EXTRA_FILES),
        'files': files,
        'api': public_api(read('game.js')),
        'data': [data_summary(r) for r in JS_FILES[1:]],
        'html_ids': html_ids,
        'dom_ids_missing_in_html': sorted(set(game['dom_ids']) - set(html_ids)),
        'sprites': sorted(os.listdir(os.path.join(ROOT, 'sprites'))) if os.path.isdir(os.path.join(ROOT, 'sprites')) else [],
        'icons': sorted(os.listdir(os.path.join(ROOT, 'icons'))) if os.path.isdir(os.path.join(ROOT, 'icons')) else [],
    }
    with open(os.path.join(ROOT, OUT_JSON), 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, OUT_MD), 'w', encoding='utf-8') as f:
        f.write(render_md(idx))
    nf = sum(len(x['functions']) for x in files)
    print(f'{OUT_MD} + {OUT_JSON}: {len(files)} arquivos JS, {nf} funções, digest {idx["digest"]}')


def render_md(idx):
    game = idx['files'][0]
    out = ['# CODEMAP — METEORO',
           '',
           '> Gerado por `python3 tools/codeindex.py` — **não edite à mão**. '
           f'Digest `{idx["digest"]}`. Rode `python3 tools/codeindex.py check` para saber se está atualizado.',
           '',
           '**Como usar (agentes):** ache o símbolo aqui → leia só o intervalo de linhas '
           '(`python3 tools/codeindex.py show <função>`), em vez de abrir o `game.js` inteiro.',
           '']
    out += ['## Arquivos', '', '| Arquivo | Linhas | Funções | Papel |', '|---|---:|---:|---|']
    roles = {'game.js': 'motor inteiro (IIFE `window.__game`): estado, spawn, combate, render, UI, bot, selftest'}
    for d in idx['data']:
        roles[d['file']] = f'`window.{d["global"]}` — {d["doc"]}'
    for fi in idx['files']:
        out.append(f'| `{fi["file"]}` | {fi["lines"]} | {len(fi["functions"])} | {roles.get(fi["file"], "")} |')
    out += ['', f'## `game.js` por seção', '']
    for s in game['sections']:
        fns = [f for f in game['functions'] if f['section'] == s['name'] and f['depth'] == 1]
        out.append(f'### {s["name"]}  ·  L{s["line"]}–{s["end"]}')
        out.append('')
        if fns:
            out.append(' · '.join(f'`{f["name"]}` L{f["line"]}–{f["end"]}' for f in fns))
        cs = [c for c in game['consts'] if c['section'] == s['name']]
        if cs:
            out.append('')
            out.append('consts: ' + ' · '.join(f'`{c["name"]}` L{c["line"]}' for c in cs))
        out.append('')
    out += ['## API pública (`window.__game`)', '', ' · '.join(f'`{a}`' for a in idx['api']), '']
    out += ['## Modos por URL hash', '', ' · '.join(f'`{h}`' for h in game['hash_modes']), '']
    out += ['## localStorage', '', ' · '.join(f'`{k}`' for k in game['storage_keys']) + ' (+ `META_KEY`, ver seção meta)', '']
    sf = sorted(game['state_fields'].items(), key=lambda kv: kv[1])
    out += ['## Campos de `state` (1ª atribuição)', '', ' · '.join(f'`{k}` L{v}' for k, v in sf), '']
    out += ['## Dados', '']
    for d in idx['data']:
        out.append(f'- `{d["file"]}` → `window.{d["global"]}` ({d["id_count"]} ids/nomes). Ex.: '
                   + ', '.join(f'`{x}`' for x in d['sample_ids'][:8]))
    out += ['', '## Assets', '',
            f'- `sprites/` ({len(idx["sprites"])}): ' + ', '.join(f'`{s}`' for s in idx['sprites']),
            f'- `icons/`: ' + ', '.join(f'`{s}`' for s in idx['icons']), '']
    if idx['dom_ids_missing_in_html']:
        out += ['## ⚠ IDs usados no JS e ausentes no index.html', '',
                ', '.join(f'`{x}`' for x in idx['dom_ids_missing_in_html']), '']
    return '\n'.join(out)


def load():
    p = os.path.join(ROOT, OUT_JSON)
    if not os.path.exists(p):
        build()
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def cmd_check():
    p = os.path.join(ROOT, OUT_JSON)
    if not os.path.exists(p):
        print('sem índice — rode: python3 tools/codeindex.py'); return 1
    with open(p, encoding='utf-8') as f:
        old = json.load(f)['digest']
    if old != digest(JS_FILES + EXTRA_FILES):
        print('índice DESATUALIZADO — rode: python3 tools/codeindex.py'); return 1
    print('índice ok'); return 0


def cmd_find(pat):
    rx = re.compile(pat, re.I)
    idx = load()
    hits = []
    for fi in idx['files']:
        for s in fi['sections']:
            if rx.search(s['name']):
                hits.append((fi['file'], s['line'], 'seção', f'{s["name"]} (até L{s["end"]})'))
        for f in fi['functions']:
            if rx.search(f['name']):
                hits.append((fi['file'], f['line'], 'função', f'{f["name"]}({f["args"]}) até L{f["end"]} [{f["section"]}]'))
        for c in fi['consts']:
            if rx.search(c['name']):
                hits.append((fi['file'], c['line'], 'const', c['name']))
        for k, ln in fi['state_fields'].items():
            if rx.search(k):
                hits.append((fi['file'], ln, 'state', 'state.' + k))
    for rel in JS_FILES[1:]:
        for i, line in enumerate(read(rel).split('\n'), 1):
            for m in DATA_ID_RE.finditer(line):
                if rx.search(m.group(1)):
                    hits.append((rel, i, 'dado', m.group(1)))
    for h in sorted(hits, key=lambda x: (x[2] != 'função', x[0], x[1])):
        print(f'{h[0]}:{h[1]}  {h[2]:<6} {h[3]}')
    if not hits:
        print('nada — tente: python3 tools/codeindex.py refs <nome>')
    return 0 if hits else 1


def cmd_show(name):
    idx = load()
    for fi in idx['files']:
        for f in fi['functions']:
            if f['name'] == name:
                lines = read(fi['file']).split('\n')
                print(f'// {fi["file"]}:{f["line"]}-{f["end"]}')
                for k in range(f['line'] - 1, f['end']):
                    print(f'{k + 1:5}  {lines[k]}')
                return 0
    print(f'função {name!r} não encontrada'); return 1


def cmd_refs(name):
    rx = re.compile(r'(?<![\w$])' + re.escape(name) + r'(?![\w$])')
    n = 0
    for rel in JS_FILES + EXTRA_FILES:
        if not os.path.exists(os.path.join(ROOT, rel)):
            continue
        for i, line in enumerate(read(rel).split('\n'), 1):
            if rx.search(line):
                print(f'{rel}:{i}  {line.strip()[:140]}'); n += 1
    print(f'-- {n} ocorrências')
    return 0 if n else 1


def main(argv):
    if not argv:
        build(); return 0
    cmd, rest = argv[0], argv[1:]
    if cmd == 'check':
        return cmd_check()
    if cmd in ('find', 'show', 'refs') and rest:
        return {'find': cmd_find, 'show': cmd_show, 'refs': cmd_refs}[cmd](rest[0])
    print(__doc__); return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

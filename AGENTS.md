# AGENTS.md — METEORO (survivors incremental)

Regras do projeto para agentes (Claude Code, Muse Code e afins). O `CLAUDE.md` importa este arquivo; edite **aqui**.

## O que é

Jogo survivors incremental no navegador: um mago sob chuva de meteoros, armas automáticas, 10 fases com chefe,
árvore passiva de 126 nodos, mini-árvores por arma, 6 magos, 8 artefatos e modo infinito.
**Vanilla JS + canvas 2D, zero dependências, sem build.** Abre com `index.html` direto.

## Regras inegociáveis

- **Zero deps, zero build.** Nada de npm, bundler, framework ou CDN no jogo. Ferramentas em `tools/` usam só Python stdlib / bash.
- **ES5 puro no `game.js` e `data-*.js`**: `var`, `function`, sem arrow, sem `let/const`, sem classes, `'use strict'`. Aspas simples, 2 espaços.
- **Texto do jogo em pt-BR.** Comentários em pt-BR, curtos.
- **Arte visual ≠ gameplay.** Raio de colisão (`e.r`, `p.r`) nunca muda por causa de arte; `MAGNIFY` (1.3) é só visual.
- **Fallback procedural obrigatório.** Todo sprite tem desenho em código como reserva: o harness headless (gjs) não tem `Image`,
  e imagens podem não ter carregado. Nunca apague o desenho procedural de `drawEnemy`/`drawPlayer`.
- **Balanceamento se mede com bot**, não no olho: rode `tools/test.sh full` antes e depois e compare.
- Não commitar sem pedido do usuário. Nunca reescrever histórico.

## Navegação rápida (use antes de abrir o game.js)

`game.js` tem ~3800 linhas num IIFE só. **Não leia inteiro.** Use o índice:

```bash
python3 tools/codeindex.py find 'boss|spawn'   # acha funções, seções, consts, state.*, ids de dados
python3 tools/codeindex.py show drawEnemy      # imprime só o corpo da função, com nº de linha
python3 tools/codeindex.py refs MAGNIFY        # todas as linhas que usam o nome
python3 tools/codeindex.py check               # índice atualizado?
python3 tools/codeindex.py                     # regenera CODEMAP.md + .codeindex.json
```

`CODEMAP.md` é o mapa navegável (seções → funções → linhas). É **gerado**: não edite à mão; regenere após mudar JS.

## Comandos

| Para | Rodar |
|---|---|
| Jogar | `python3 -m http.server 8000` → http://localhost:8000 (ou abrir `index.html`) |
| Teste rápido (~5s) | `tools/test.sh` → `GLUE PASS` |
| Teste de balanceamento (~8min) | `tools/test.sh full` → resumo de 100 sessões |
| Selftest no navegador | abrir `index.html#selftest` → `SELFTEST PASS ...` (UI real, 0 erros JS) |
| Ver o bot jogar | `index.html#bot` |
| Prints da árvore | `index.html#shot-tree` / `#shot-wtree` |
| Atualizar índice | `python3 tools/codeindex.py` |

Os harnesses em `ml/` têm `ROOT = '/home/wellington/meteoro/'` fixo; `tools/test.sh` copia e reaponta. Não há Node na máquina; o JS headless roda com **gjs**.

## Arquitetura

```
index.html      DOM do HUD/menus/overlays + CSS; carrega data-*.js e game.js
data-stages.js  window.StageData  — 10 fases: tema, elenco, chefe {name, base, tint, hp, patterns}
data-tree.js    window.TreeData   — árvore passiva gerada (setores, nodos, adjacência)
data-wtree.js   window.WTreeData  — 10 mini-árvores (13 nodos) + evoluções
data-meta.js    window.MetaData   — MAGES (id, cloak, mods), ARTIFACTS (mods + marco)
game.js         window.__game     — tudo: state, meta/save, spawn, combate, update, render, UI, bot, selftest
sprites/        PNG por personagem (inimigos 128px, chefes 192px, magos 128px) + ground_1..10.png (chão 512px, repete sem emenda)
icons/          weapons.png (5x2) e tree-stats.png (6x2), células de 128px
tools/          codeindex.py (índice), test.sh (testes headless)
ml/             laboratório de bots (GA, neuroevolução, backprop) — ver ml/README.md
```

Fluxo do `game.js` (seções marcadas com `// ---------- nome ----------`):
`config` → `meta v2` (save em localStorage, migra v1) → `state` → bônus agregados (árvore + armas + mago + artefato → `treeBonuses`)
→ `audio` → `helpers` → `spawn` → `combat` (10 armas) → `upgrades` → `update` → `flow` → `HUD` → `render` → UI das árvores → `bot` → `selftest` → `boot`.

- **Mods**: tudo é um dicionário de bônus (`boltDmg`, `maxhp`, `critC`…) somado em `treeBonuses()`. Mago/artefato/nodos só declaram `mods`.
- **Chefes**: `spawnBoss()` cria um inimigo com `type = boss.base`, `boss: true`, `bname`. O sprite vem de `BOSS_SPRITE[bname]`
  (renomeou chefe em `data-stages.js`? atualize o mapa).
- **Sprites**: `spriteFor(name)` carrega `sprites/<name>.png` (cache, `null` se não carregou). `drawEnemySprite` anima por código
  (squash / flap / float / balanço, grupos `SPR_*`) e espelha para olhar o jogador. Mago: `spriteFor(meta.mage)`.
- **Chão**: `groundPattern(g)` usa `sprites/ground_<fase>.png` como `createPattern` ancorado no mundo. Sem imagem → cor `bg` + estrelas.
  Não há mais grade (`theme.grid` em `data-stages.js` ficou sem uso).
- **RNG determinístico**: `mulberry32`; `__game.debug.seed(n)` para reproduzir.
- **API de teste**: `__game.debug.{spawn, hurt, boss, seed}`, `startRun`, `botFrame`, `state`, `meta()`.

## Arte (pipeline)

Estilo: **pixel art 16-bit**, contorno escuro de 1px, paleta limitada, fundo transparente.
Gerada no Magnific (MCP) com **GPT 2.5 (`gpt-2-mini`), `quality: low`, 1k, `transparentBackground`** (~15 créditos/imagem),
em **grades 2x2 (personagens) ou 3x2 (ícones)** numa imagem só — barato e consistente — usando a primeira grade aprovada
como referência `style`. Depois: recorte por célula (bbox do alfa), redimensiona (128/192px), quantiza a 128 cores.
Chão: 1 textura por fase → `tools/seamless.py` (offset de meia tela + blend em máscara), 512px, brilho
normalizado (~40 de luminância, menos no Vulcão/Vazio) e saturação reduzida para os sprites destacarem.
Ao adicionar inimigo/chefe/mago novo: gere no mesmo estilo, salve em `sprites/<id>.png`, e o fallback procedural continua valendo.

## Armadilhas conhecidas

- O bot do GA não passa da **F5** (limite de balanceamento já conhecido, não é bug de código).
- `meta` é persistido: testes no navegador mudam o save (`localStorage`). Use aba anônima ou limpe a chave `META_KEY`.
- `#selftest` altera o save (compra árvore, troca mago) — esperado.
- Imagens só funcionam servidas por HTTP ou `file://` no Firefox; no Chrome via `file://` o canvas pode recusar.

## Trabalho em dupla (Claude + Muse)

Claude Code orquestra e revisa; Muse Code (`muse exec --workspace . --prompt-file tarefa.md`) pega tarefas isoladas e bem
especificadas. Toda tarefa delegada termina com `tools/test.sh` verde e diff revisado antes de juntar.

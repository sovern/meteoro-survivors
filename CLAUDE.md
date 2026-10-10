@AGENTS.md

## Notas só para o Claude Code

- Comece por `CODEMAP.md` / `python3 tools/codeindex.py find …` em vez de ler o `game.js` inteiro.
- Depois de editar JS: `tools/test.sh` e `python3 tools/codeindex.py` (regenera o índice).
- Para delegar ao Muse: escreva a tarefa num arquivo (contexto, o que mudar, o que NÃO tocar, como verificar) e rode
  `muse exec --workspace . --prompt-file <arquivo>` em background; revise o diff antes de aceitar.
- Teste no navegador real: `python3 -m http.server` + `geckodriver` (WebDriver por HTTP, sem selenium) abrindo `#selftest`.

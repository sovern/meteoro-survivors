# ML lab — bots que aprendem a jogar METEORO

Tudo roda headless em cima do jogo real (`gjs` + Python stdlib, zero deps).
O jogo expõe o bot parametrizável (`botTick`, `botSpend`, `botConfig` — 31 genes).

## Arquivos

| Arquivo | O quê |
|---|---|
| `ga.py` | GA pai: seleção por torneio, crossover uniforme, mutação gaussiana, evals em paralelo (`GAW=` workers) |
| `evalA.js` | Fitness: 1 run fresh (stage×2000 + tempo + abates + chefes) |
| `evalB.js` | Fitness: N sessões com progressão de meta (fases máximas + vitórias + chefes) |
| `evalN.js` | Mesmo harness da fase A, mas a política é a rede 12-8-3 (131 pesos) |
| `record.js` | Grava dataset (estado12, ação3) do bot heurístico em JSONL |
| `recordD.js` | DAgger: rede executa, heurístico rotula |
| `train.py` | Backprop em Python puro (MLP 12-8-3, SGD, early stop) |
| `bot100.js` | 100 sessões com progressão (validação rápida) |
| `bot_meteoro.js` | Bot original de 1 run (histórico) |
| `botglue.js` | Testa `botFrame`/`endBotSession` no gjs |
| `best_*.json` | Melhores genomas/pesos até aqui |

## Rodar

```bash
cd ml
python3 ga.py A   # fase A: 1 run, currículo 100s→200s→333s, até limpar a F1
python3 ga.py B   # fase B: full-loop (40 sessões), até a vitória (lê best_B.json, retoma)
python3 ga.py N   # neuroevolução da rede 12-8-3 no harness A

# clonagem comportamental:
gjs record.js data.jsonl 77 30
python3 train.py data.jsonl            # -> best_NN.json
gjs evalN.js best_NN.json 7 20000     # avalia a rede
```

## Placar até aqui

- **GA heurístico (31 genes):** fase A limpa a F1 no gen 8; fase B chegou na **F5** (120+ chefes, árvore cheia).
- **Neuroevolução (131 pesos):** atravessa o portal (F2, chefe morto).
- **Backprop/clonagem + DAgger:** joga (até ~150s) mas pior que a evoluída — representation gap nas 12 entradas.

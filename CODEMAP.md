# CODEMAP — METEORO

> Gerado por `python3 tools/codeindex.py` — **não edite à mão**. Digest `5b3441f338f9022e`. Rode `python3 tools/codeindex.py check` para saber se está atualizado.

**Como usar (agentes):** ache o símbolo aqui → leia só o intervalo de linhas (`python3 tools/codeindex.py show <função>`), em vez de abrir o `game.js` inteiro.

## Arquivos

| Arquivo | Linhas | Funções | Papel |
|---|---:|---:|---|
| `game.js` | 3856 | 168 | motor inteiro (IIFE `window.__game`): estado, spawn, combate, render, UI, bot, selftest |
| `data-stages.js` | 124 | 0 | `window.StageData` — 10 fases: tema visual, elenco de inimigos, chefe com padrões, escalada. |
| `data-tree.js` | 230 | 9 | `window.TreeData` — Árvore passiva: 100 normais + 16 notables + 10 gateways de arma, 13 setores. |
| `data-wtree.js` | 146 | 5 | `window.WTreeData` — Mini-árvores por arma: 13 nodos cada (raiz + 4 + 4 + 3 + evolução). |
| `data-meta.js` | 34 | 0 | `window.MetaData` — Magos jogáveis + artefatos + marcos (desafios persistentes). |

## `game.js` por seção

### config  ·  L26–50

`stageDef` L45–48 · `endlessLoops` L49–49

consts: `WORLD` L27 · `ENEMIES` L28 · `MAXE` L43

### meta v2 (migra v1)  ·  L51–106

`metaLoad` L60–99 · `metaSave` L100–105

consts: `META_KEY` L52

### state  ·  L107–132


### meta: bônus agregados (árvore + armas + mago + artefato)  ·  L133–332

`gateOpen` L135–135 · `wtreeOwnedList` L136–139 · `wtreeHas` L140–140 · `wtreeSpent` L141–141 · `wtreeAvail` L142–151 · `wtreeBuy` L152–161 · `wtreeRespec` L162–171 · `applyModsInto` L172–174 · `treeBonuses` L175–200 · `evoOwned` L201–201 · `applyEvo` L202–215 · `checkMiles` L216–230 · `treeSpent` L231–231 · `treeBuy` L232–245 · `treeRespec` L246–250 · `pointCost` L251–251 · `buyPoint` L252–260 · `newPlayer` L262–273 · `resetRun` L274–314 · `dmgMul` L315–315 · `emul` L316–316 · `applyTheme` L318–331

consts: `ALL_WEAPONS` L134

### audio  ·  L333–407

`audio` L335–349 · `beep` L350–363 · `noise` L364–380 · `toggleMute` L401–406

consts: `AC` L334

### helpers  ·  L408–447

`toast` L409–414 · `banner` L415–420 · `addShake` L421–421 · `floater` L422–425 · `burst` L426–435 · `nearestEnemy` L436–446

### spawn  ·  L448–544

`threat` L449–449 · `pickType` L450–459 · `spawnEnemy` L460–491 · `spawnBoss` L492–519 · `updateSpawns` L520–543

### combat  ·  L545–904

`damageEnemy` L546–555 · `killEnemy` L556–586 · `bossDown` L587–607 · `dropGems` L608–618 · `fireBolt` L619–638 · `meteorTarget` L639–651 · `callMeteor` L652–664 · `explodeMeteor` L665–687 · `fireChain` L688–708 · `fireNova` L709–728 · `fireRailOne` L729–746 · `fireRail` L747–760 · `fireMiss` L761–779 · `explodeMiss` L780–792 · `frostTick` L793–811 · `layMine` L812–836 · `explodeMine` L837–856 · `updateMines` L857–876 · `updateRang` L877–897 · `spitGlob` L898–904

### upgrades (run)  ·  L905–1065

`shuffleUnlocks` L963–971 · `rollChoices` L972–1018 · `isUnlockCard` L1019–1019 · `weaponsUnlocked` L1020–1024 · `chooseUpgrade` L1025–1037 · `openLevelUp` L1038–1045 · `closeLevelUp` L1046–1048 · `renderCards` L1049–1064

consts: `UPS` L906 · `RAR_W` L958 · `UNLOCK_IDS` L960 · `UNLOCK_MINS` L961

### update  ·  L1066–1580

`updatePlayer` L1067–1101 · `tryDash` L1102–1117 · `hurtPlayer` L1118–1161 · `updateWeapons` L1162–1205 · `updateShots` L1206–1253 · `bossPattern` L1254–1294 · `updateEnemies` L1295–1418 · `updateOrbs` L1419–1439 · `updateStrikes` L1440–1451 · `updateGems` L1452–1487 · `updatePortal` L1488–1500 · `updateFx` L1501–1551 · `update` L1553–1579

### flow  ·  L1581–1730

`bankCoins` L1582–1596 · `favWeapon` L1597–1604 · `gameOver` L1605–1620 · `victory` L1621–1634 · `hideRunUI` L1635–1641 · `showRunUI` L1642–1647 · `startRun` L1648–1668 · `nextStage` L1669–1697 · `continueEndless` L1698–1705 · `toShop` L1706–1718 · `quitToShop` L1719–1723 · `togglePause` L1724–1729

### HUD / menus  ·  L1731–1895

`weaponOwned` L1732–1737 · `weaponLv` L1738–1742 · `buildHTML` L1743–1750 · `refreshBuild` L1751–1763 · `updateHUD` L1764–1802 · `renderMinimap` L1803–1839 · `renderBank` L1840–1849 · `buildMageRow` L1850–1866 · `buildArtRow` L1867–1894

### render  ·  L1896–1896


### art magnify: sprites maiores e mais detalhados (só visual; raios de gameplay intactos)  ·  L1897–2671

`hexA` L1899–1905 · `drawEyes` L1906–1925 · `drawCrown` L1926–1938 · `drawSlimeBody` L1939–1946 · `drawEnemy` L1947–2208 · `drawPlayer` L2209–2305 · `drawProp` L2306–2407 · `render` L2409–2670

consts: `MAGNIFY` L1898

### árvore (UI)  ·  L2672–2983

`nodeIcon` L2682–2695 · `drawGlyph` L2696–2703 · `nodeWeapon` L2709–2720 · `nodeStat` L2726–2737 · `sheetFor` L2739–2752 · `spriteFor` L2754–2763 · `groundPattern` L2765–2771 · `drawEnemySprite` L2781–2809 · `drawSheetCell` L2810–2816 · `drawNodeImg` L2817–2827 · `treeIsOwned` L2828–2828 · `treeAvail` L2829–2837 · `openTree` L2838–2846 · `closeTree` L2847–2852 · `renderTreePanel` L2853–2877 · `renderTree` L2878–2941 · `drawDiamond` L2942–2954 · `treeEventPos` L2955–2959 · `treeNodeAt` L2960–2967 · `treeBuySelected` L2968–2977 · `treeOpenWTree` L2978–2982

consts: `WGLYPH` L2674 · `SGLYPH` L2675 · `NGLYPH` L2676 · `NWEP` L2704 · `WPOS` L2721 · `SPOS` L2722 · `SHEETS` L2738 · `SPRITES` L2753 · `GROUND_PATS` L2764 · `BOSS_SPRITE` L2772 · `SPR_SQUASH` L2778 · `SPR_FLAP` L2779 · `SPR_FLOAT` L2780

### mini-árvore de arma (UI)  ·  L2984–3101

`openWTree` L2986–2995 · `closeWTree` L2996–3003 · `renderWTreePanel` L3004–3025 · `renderWTree` L3026–3078 · `wtreeEventPos` L3079–3082 · `wtreeNodeAt` L3083–3090 · `wtreeBuySelected` L3091–3100

### bot jogável (#bot): foge, pega XP, dashea, progride sozinho  ·  L3102–3321

`botPrio` L3112–3112 · `botCat` L3121–3129 · `botTick` L3130–3240 · `botNodeScore` L3241–3249 · `botSpend` L3250–3290 · `botFrame` L3291–3308 · `endBotSession` L3309–3320

consts: `BOT` L3103 · `BOT_MAX_SESSIONS` L3105 · `BOT_PRIO` L3106

### selftest (#selftest): página real, entradas reais, 1 passada  ·  L3322–3557

`runShot` L3326–3350 · `runSelftest` L3351–3556

consts: `SELFTEST` L3323 · `SHOT` L3324

### boot  ·  L3558–3856

`resize` L3559–3569 · `buildChips` L3570–3605 · `frame` L3607–3621 · `init` L3622–3805

## API pública (`window.__game`)

`bankCoins` · `boss` · `botConfig` · `botFrame` · `botSpend` · `botTick` · `buyPoint` · `checkMiles` · `chooseUpgrade` · `closeTree` · `closeWTree` · `continueEndless` · `debug` · `endBotSession` · `hurt` · `init` · `keys` · `meta` · `nextStage` · `openTree` · `openWTree` · `quitToShop` · `render` · `renderTree` · `renderWTree` · `seed` · `spawn` · `startRun` · `state` · `togglePause` · `treeBuy` · `treeRespec` · `tryDash` · `update` · `version` · `wtreeBuy` · `wtreeRespec`

## Modos por URL hash

`#bot` · `#selftest` · `#shot-tree` · `#shot-wtree`

## localStorage

`meteoro_meta_v1` (+ `META_KEY`, ver seção meta)

## Campos de `state` (1ª atribuição)

`time` L276 · `kills` L276 · `runCoins` L276 · `runBanked` L276 · `over` L277 · `won` L277 · `paused` L277 · `stage` L278 · `stageT` L278 · `endless` L278 · `bossSpawned` L279 · `stageWarned` L279 · `portal` L279 · `bossDown` L279 · `bossDownPos` L279 · `shake` L280 · `hurtFlash` L280 · `bannerT` L280 · `bolt` L285 · `meteor` L286 · `orb` L287 · `chain` L288 · `nova` L289 · `rail` L290 · `miss` L291 · `frost` L292 · `mine` L293 · `rang` L294 · `cloak` L299 · `crit` L300 · `magnet` L301 · `regen` L302 · `armor` L303 · `dodge` L304 · `allDmg` L305 · `thorns` L306 · `greed` L306 · `wis` L306 · `exec` L306 · `sw` L307 · `swUsed` L307 · `spawnT` L308 · `levelPending` L308 · `choices` L308 · `dashCdMax` L309 · `buildDirty` L309 · `boss` L310 · `bossNum` L310 · `prevThreat` L310 · `stats` L311 · `player` L312 · `theme` L320 · `props` L322 · `muted` L402 · `toastTimer` L413 · `sndPop` L585 · `sndShoot` L636 · `gemCombo` L1471 · `gemComboT` L1473 · `sndGem` L1474 · `started` L1655 · `shopOpen` L1656

## Dados

- `data-stages.js` → `window.StageData` (20 ids/nomes). Ex.: `Vale Verde`, `REI GOSMA`, `Cavernas Cinzentas`, `RAINHA MORCEGO`, `Pântano Fétido`, `COGUMELO ANCIÃO`, `Deserto Uivante`, `IMPERATRIZ VESPA`
- `data-tree.js` → `window.TreeData` (45 ids/nomes). Ex.: `bolt`, `Lâminas`, `meteor`, `Fogo`, `chain`, `Tempestade`, `nova`, `Arcano`
- `data-wtree.js` → `window.WTreeData` (11 ids/nomes). Ex.: `Tempestade de Lâminas`, `Chuva Ígnea`, `Julgamento Final`, `Big Bang`, `Canhão Orbital`, `Sistema Planetário`, `Tempestade de Mísseis`, `Era do Gelo`
- `data-meta.js` → `window.MetaData` (28 ids/nomes). Ex.: `mago`, `Mago`, `piro`, `Piromante`, `eng`, `Engenheiro`, `cac`, `Caçador`

## Assets

- `sprites/` (39): `bat.png`, `boss_banshee.png`, `boss_bat.png`, `boss_devourer.png`, `boss_golem.png`, `boss_meteor.png`, `boss_shroom.png`, `boss_skull.png`, `boss_slime.png`, `boss_treant.png`, `boss_wasp.png`, `brute.png`, `cac.png`, `cav.png`, `eng.png`, `ghost.png`, `golem.png`, `ground_1.png`, `ground_10.png`, `ground_2.png`, `ground_3.png`, `ground_4.png`, `ground_5.png`, `ground_6.png`, `ground_7.png`, `ground_8.png`, `ground_9.png`, `imp.png`, `lad.png`, `mago.png`, `mama.png`, `phantom.png`, `piro.png`, `shroom.png`, `skull.png`, `slime.png`, `spitter.png`, `wasp.png`, `wisp.png`
- `icons/`: `tree-stats.png`, `weapons.png`

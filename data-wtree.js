'use strict';
/* Mini-árvores por arma: 13 nodos cada (raiz + 4 + 4 + 3 + evolução).
   Desbloqueadas pelo gateway na árvore principal. */
window.WTreeData = (function () {
  var W = 900, H = 660;
  var DEFS = {
    bolt: {
      t1: [['boltDmg', 0.12], ['boltRate', 0.10], ['boltDmg', 0.12], ['boltRate', 0.10]],
      t2: [['boltDmg', 0.20], ['boltRate', 0.15], ['boltPierce', 1], ['boltDmg', 0.20]],
      t3: [['boltCount', 1], ['boltDmg', 0.30], ['boltRate', 0.25]],
      root: ['boltDmg', 0.10],
      evo: { name: 'Tempestade de Lâminas', desc: 'EVOLUÇÃO: +2 projéteis, dano ×2, +2 perfuração' }
    },
    meteor: {
      t1: [['meteorDmg', 0.12], ['meteorRate', 0.08], ['meteorR', 0.08], ['meteorDmg', 0.12]],
      t2: [['meteorDmg', 0.20], ['meteorRate', 0.12], ['meteorR', 0.15], ['meteorDmg', 0.20]],
      t3: [['meteorCount', 1], ['meteorDmg', 0.30], ['meteorR', 0.30]],
      root: ['meteorDmg', 0.10],
      evo: { name: 'Chuva Ígnea', desc: 'EVOLUÇÃO: +2 meteoros, dano ×1.8, raio +30%, chão em chamas' }
    },
    chain: {
      t1: [['chainDmg', 0.12], ['chainRate', 0.10], ['chainDmg', 0.12], ['chainRate', 0.10]],
      t2: [['chainDmg', 0.20], ['chainRate', 0.15], ['chainJump', 1], ['chainDmg', 0.20]],
      t3: [['chainJump', 1], ['chainDmg', 0.30], ['chainRate', 0.25]],
      root: ['chainDmg', 0.10],
      evo: { name: 'Julgamento Final', desc: 'EVOLUÇÃO: +4 pulos, dano ×2, alcance +30%' }
    },
    nova: {
      t1: [['novaDmg', 0.12], ['novaRate', 0.10], ['novaR', 0.10], ['novaDmg', 0.12]],
      t2: [['novaDmg', 0.20], ['novaRate', 0.15], ['novaR', 0.20], ['novaDmg', 0.20]],
      t3: [['novaDmg', 0.35], ['novaR', 0.30], ['novaRate', 0.25]],
      root: ['novaDmg', 0.10],
      evo: { name: 'Big Bang', desc: 'EVOLUÇÃO: raio +60%, dano ×2, recarga ×0.7' }
    },
    rail: {
      t1: [['railDmg', 0.12], ['railRate', 0.10], ['railDmg', 0.12], ['railRate', 0.10]],
      t2: [['railDmg', 0.20], ['railRate', 0.15], ['railDmg', 0.20], ['railRate', 0.15]],
      t3: [['railCount', 1], ['railDmg', 0.35], ['railRate', 0.25]],
      root: ['railDmg', 0.10],
      evo: { name: 'Canhão Orbital', desc: 'EVOLUÇÃO: +2 feixes, largura ×1.8, dano ×1.8' }
    },
    orb: {
      t1: [['orbDmg', 0.12], ['orbR', 0.10], ['orbDmg', 0.12], ['orbR', 0.10]],
      t2: [['orbDmg', 0.20], ['orbR', 0.15], ['orbDmg', 0.20], ['orbR', 0.15]],
      t3: [['orbCount', 1], ['orbDmg', 0.30], ['orbR', 0.25]],
      root: ['orbDmg', 0.10],
      evo: { name: 'Sistema Planetário', desc: 'EVOLUÇÃO: +2 orbes, dano ×2, raio +40%' }
    },
    miss: {
      t1: [['missDmg', 0.12], ['missRate', 0.10], ['missDmg', 0.12], ['missRate', 0.10]],
      t2: [['missDmg', 0.20], ['missRate', 0.15], ['missCount', 1], ['missDmg', 0.20]],
      t3: [['missCount', 1], ['missDmg', 0.30], ['missRate', 0.25]],
      root: ['missDmg', 0.10],
      evo: { name: 'Tempestade de Mísseis', desc: 'EVOLUÇÃO: +3 mísseis, dano ×2, cada um explode em área' }
    },
    frost: {
      t1: [['frostDmg', 0.12], ['frostR', 0.10], ['frostDmg', 0.12], ['frostR', 0.10]],
      t2: [['frostDmg', 0.20], ['frostR', 0.18], ['frostSlow', 0.08], ['frostDmg', 0.20]],
      t3: [['frostDmg', 0.30], ['frostR', 0.30], ['frostSlow', 0.12]],
      root: ['frostDmg', 0.10],
      evo: { name: 'Era do Gelo', desc: 'EVOLUÇÃO: raio +50%, dano ×2, lentidão brutal, tick ×0.7' }
    },
    mine: {
      t1: [['mineDmg', 0.12], ['mineRate', 0.10], ['mineR', 0.10], ['mineDmg', 0.12]],
      t2: [['mineDmg', 0.20], ['mineRate', 0.15], ['mineR', 0.20], ['mineCount', 1]],
      t3: [['mineCount', 1], ['mineDmg', 0.35], ['mineR', 0.30]],
      root: ['mineDmg', 0.10],
      evo: { name: 'Terra Arrasada', desc: 'EVOLUÇÃO: +2 minas, dano ×2, raio +40%, recarga ×0.7' }
    },
    rang: {
      t1: [['rangDmg', 0.12], ['rangRate', 0.10], ['rangDmg', 0.12], ['rangRate', 0.10]],
      t2: [['rangDmg', 0.20], ['rangRate', 0.15], ['rangCount', 1], ['rangDmg', 0.20]],
      t3: [['rangCount', 1], ['rangDmg', 0.30], ['rangRate', 0.25]],
      root: ['rangDmg', 0.10],
      evo: { name: 'Lâminas do Vendaval', desc: 'EVOLUÇÃO: +2 bumerangues, dano ×2, cadência ×0.8' }
    }
  };
  var FRACT = { boltDmg: 1, boltRate: 1, meteorDmg: 1, meteorRate: 1, meteorR: 1, chainDmg: 1, chainRate: 1, novaDmg: 1, novaRate: 1, novaR: 1, railDmg: 1, railRate: 1, orbDmg: 1, orbR: 1, missDmg: 1, missRate: 1, frostDmg: 1, frostR: 1, frostSlow: 1, mineDmg: 1, mineRate: 1, mineR: 1, rangDmg: 1, rangRate: 1 };
  var NAMES = {
    boltDmg: 'dano', boltRate: 'cadência', boltCount: 'projéteis', boltPierce: 'perfuração',
    meteorDmg: 'dano', meteorRate: 'recarga', meteorR: 'raio', meteorCount: 'meteoros',
    orbDmg: 'dano', orbR: 'raio', orbCount: 'orbes',
    chainDmg: 'dano', chainRate: 'recarga', chainJump: 'pulos',
    novaDmg: 'dano', novaRate: 'recarga', novaR: 'raio',
    railDmg: 'dano', railRate: 'recarga', railCount: 'feixes',
    missDmg: 'dano', missRate: 'cadência', missCount: 'mísseis',
    frostDmg: 'dano', frostR: 'raio', frostSlow: 'lentidão',
    mineDmg: 'dano', mineRate: 'recarga', mineCount: 'minas', mineR: 'raio',
    rangDmg: 'dano', rangRate: 'cadência', rangCount: 'bumerangues'
  };
  function fmt(k, v) {
    if (FRACT[k]) return '+' + Math.round(v * 100) + '% ' + (NAMES[k] || k);
    return '+' + v + ' ' + (NAMES[k] || k);
  }
  var TIERS = ['Fagulha', 'Ascensão', 'Maestria'];
  var ROMAN = ['I', 'II', 'III', 'IV'];

  function buildOne(w) {
    var D = DEFS[w];
    var nodes = [], adj = {};
    function add(n) { nodes.push(n); adj[n.id] = []; return n; }
    function link(a, b) {
      if (adj[a].indexOf(b) < 0) adj[a].push(b);
      if (adj[b].indexOf(a) < 0) adj[b].push(a);
    }
    function mk(id, x, y, tier, mod, val) {
      var mods = {};
      mods[mod] = val;
      return add({ id: id, x: x, y: y, notable: false, name: TIERS[tier] + ' ' + ROMAN[nodes.length % 4], mods: mods, desc: fmt(mod, val), cost: 1 });
    }
    var rm = {};
    rm[D.root[0]] = D.root[1];
    add({ id: w + '-root', x: 450, y: 52, notable: false, root: true, name: 'Despertar', mods: rm, desc: fmt(D.root[0], D.root[1]), cost: 1 });
    var xs = [210, 370, 530, 690], t1 = [], t2 = [], t3 = [], i;
    for (i = 0; i < 4; i++) {
      t1.push(mk(w + '-t1-' + i, xs[i], 190, 0, D.t1[i][0], D.t1[i][1]).id);
      link(w + '-root', t1[i]);
    }
    for (i = 0; i < 4; i++) {
      t2.push(mk(w + '-t2-' + i, xs[i], 330, 1, D.t2[i][0], D.t2[i][1]).id);
      link(t1[i], t2[i]);
    }
    var xs3 = [300, 450, 600];
    for (i = 0; i < 3; i++) {
      t3.push(mk(w + '-t3-' + i, xs3[i], 470, 2, D.t3[i][0], D.t3[i][1]).id);
      link(t2[i], t3[i]);
      link(t2[i + 1], t3[i]);
    }
    add({ id: w + '-evo', x: 450, y: 590, notable: true, evo: w, name: D.evo.name, mods: {}, desc: D.evo.desc, cost: 3, reqCount: 8 });
    for (i = 0; i < 3; i++) link(t3[i], w + '-evo');
    return { nodes: nodes, adj: adj, w: W, h: H };
  }

  var trees = {}, w;
  for (w in DEFS) trees[w] = buildOne(w);

  return {
    trees: trees, w: W, h: H,
    byId: function (w, id) {
      var ns = trees[w].nodes;
      for (var i = 0; i < ns.length; i++) if (ns[i].id === id) return ns[i];
      return null;
    }
  };
})();

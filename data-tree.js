'use strict';
/* Árvore passiva: 100 normais + 16 notables + 10 gateways de arma, 13 setores. */
window.TreeData = (function () {
  var TAU = Math.PI * 2;
  var W = 1700, H = 1050, CX = 850, CY = 500;

  var SECTORS = [
    { key: 'bolt', name: 'Lâminas', color: '#ffcf6e', mods: [['boltDmg', 0.08], ['boltRate', 0.05]], tiers: ['Lâmina', 'Fio', 'Gume', 'Frenesi'] },
    { key: 'meteor', name: 'Fogo', color: '#ff9f1c', mods: [['meteorDmg', 0.09], ['meteorRate', 0.04], ['meteorR', 0.05]], tiers: ['Brasa', 'Chama', 'Fornalha', 'Inferno'] },
    { key: 'chain', name: 'Tempestade', color: '#bfe9ff', mods: [['chainDmg', 0.09], ['chainRate', 0.05]], tiers: ['Faísca', 'Raio', 'Tormenta', 'Cataclismo Elétrico'] },
    { key: 'nova', name: 'Arcano', color: '#fd79a8', mods: [['novaDmg', 0.09], ['novaRate', 0.05], ['novaR', 0.06]], tiers: ['Eco', 'Pulso', 'Ressonância', 'Supernova Menor'] },
    { key: 'rail', name: 'Feixe', color: '#7CFC00', mods: [['railDmg', 0.10], ['railRate', 0.05]], tiers: ['Facho', 'Lente', 'Prisma', 'Canhão Solar'] },
    { key: 'orb', name: 'Órbita', color: '#4da3ff', mods: [['orbDmg', 0.10], ['orbR', 0.06]], tiers: ['Satélite', 'Lua', 'Sistema', 'Constelação Menor'] },
    { key: 'miss', name: 'Enxame', color: '#ff7b54', mods: [['missDmg', 0.09], ['missRate', 0.05]], tiers: ['Ferrão', 'Vespeiro', 'Enxame', 'Apocalipse'] },
    { key: 'frost', name: 'Gelo', color: '#9fd4e8', mods: [['frostDmg', 0.09], ['frostR', 0.06]], tiers: ['Geada', 'Nevasca', 'Glaciar', 'Era do Gelo'] },
    { key: 'mine', name: 'Pólvora', color: '#c9a86a', mods: [['mineDmg', 0.10], ['mineRate', 0.05], ['mineR', 0.06]], tiers: ['Pólvora', 'Armadilha', 'Campo', 'Terra Arrasada'] },
    { key: 'rang', name: 'Vendaval', color: '#7bed9f', mods: [['rangDmg', 0.10], ['rangRate', 0.05]], tiers: ['Retorno', 'Giro', 'Vendaval', 'Furacão'] },
    { key: 'blood', name: 'Sangue', color: '#e63946', mods: [['maxhp', 18], ['regen', 0.5], ['armor', 1.5]], tiers: ['Sangue', 'Carne', 'Osso', 'Coração'] },
    { key: 'shadow', name: 'Sombra', color: '#b8c4d8', mods: [['critC', 0.02], ['dodge', 0.015], ['speed', 0.03]], tiers: ['Vulto', 'Passo', 'Sussurro', 'Assassino'] },
    { key: 'fortune', name: 'Fortuna', color: '#ffd700', mods: [['greed', 0.06], ['wis', 0.06], ['magnet', 12]], tiers: ['Cobre', 'Prata', 'Ouro', 'Midas Menor'] }
  ];
  var FRACT = { boltDmg: 1, boltRate: 1, meteorDmg: 1, meteorRate: 1, meteorR: 1, chainDmg: 1, chainRate: 1, novaDmg: 1, novaRate: 1, novaR: 1, railDmg: 1, railRate: 1, orbDmg: 1, orbR: 1, missDmg: 1, missRate: 1, frostDmg: 1, frostR: 1, frostSlow: 1, mineDmg: 1, mineRate: 1, mineR: 1, rangDmg: 1, rangRate: 1, critC: 1, dodge: 1, speed: 1, greed: 1, wis: 1, allDmg: 1, allHp: 1 };
  var NAMES = {
    boltDmg: 'dano do raio', boltRate: 'velocidade do raio', boltCount: 'projéteis', boltPierce: 'perfuração',
    meteorDmg: 'dano do meteoro', meteorRate: 'recarga do meteoro', meteorR: 'raio do meteoro', meteorCount: 'meteoros por chuva',
    orbDmg: 'dano dos orbes', orbR: 'raio dos orbes', orbCount: 'orbes',
    chainDmg: 'dano da cadeia', chainRate: 'recarga da cadeia', chainJump: 'pulos da cadeia',
    novaDmg: 'dano da nova', novaRate: 'recarga da nova', novaR: 'raio da nova',
    railDmg: 'dano do feixe', railRate: 'recarga do feixe', railCount: 'feixes',
    missDmg: 'dano dos mísseis', missRate: 'cadência dos mísseis', missCount: 'mísseis',
    frostDmg: 'dano da aura', frostR: 'raio da aura', frostSlow: 'lentidão da aura',
    mineDmg: 'dano das minas', mineRate: 'recarga das minas', mineCount: 'minas ativas', mineR: 'raio das minas',
    rangDmg: 'dano do bumerangue', rangRate: 'cadência do bumerangue', rangCount: 'bumerangues',
    maxhp: 'vida máxima', regen: 'vida por segundo', armor: 'armadura', speed: 'velocidade de movimento',
    critC: 'chance de crítico', dodge: 'chance de esquiva', magnet: 'alcance do ímã',
    greed: 'moedas', wis: 'experiência', allDmg: 'TODO o dano', allHp: 'vida máxima'
  };
  function fmtMod(k, v) {
    var sign = v >= 0 ? '+' : '';
    if (FRACT[k]) return sign + Math.round(v * 100) + '% ' + (NAMES[k] || k);
    if (Number.isInteger(v)) return sign + v + ' ' + (NAMES[k] || k);
    return sign + v.toFixed(1) + ' ' + (NAMES[k] || k);
  }
  function descOf(mods) {
    var out = [], k;
    for (k in mods) out.push(fmtMod(k, mods[k]));
    return out.join(' · ');
  }

  var NOTABLES = [
    { name: 'Chuva de Lâminas', mods: { boltCount: 1, boltDmg: 0.20 } },
    { name: 'Cataclismo', mods: { meteorCount: 1, meteorDmg: 0.25 } },
    { name: 'Tempestade Infinita', mods: { chainJump: 2, chainDmg: 0.20 } },
    { name: 'Supernova', mods: { novaR: 0.40, novaDmg: 0.30 } },
    { name: 'Feixe Duplo', mods: { railCount: 1, railDmg: 0.30 } },
    { name: 'Constelação', mods: { orbCount: 1, orbDmg: 0.25, orbR: 0.15 } },
    { name: 'Enxame Implacável', mods: { missCount: 2, missDmg: 0.25 } },
    { name: 'Coração Glacial', mods: { frostR: 0.40, frostDmg: 0.30, frostSlow: 0.10 } },
    { name: 'Campo Minado', mods: { mineCount: 2, mineDmg: 0.30, mineR: 0.25 } },
    { name: 'Vendaval', mods: { rangCount: 1, rangDmg: 0.30 } },
    { name: 'Coração Ancestral', mods: { maxhp: 150, regen: 2, armor: 6 } },
    { name: 'Mago Supremo', reqPoints: 25, mods: { allDmg: 0.12, allHp: 0.10 } }
  ];
  var OUTER_NOTABLES = [
    { name: 'Midas', sector: 12, mods: { greed: 0.50, wis: 0.30 } },
    { name: 'Dança das Sombras', sector: 11, mods: { dodge: 0.12, speed: 0.15, critC: 0.10 } },
    { name: 'Corpo Fechado', sector: 10, mods: { armor: 10, dodge: 0.05, maxhp: 80 } },
    { name: 'Arsenal Completo', sector: 12, mods: { allDmg: 0.10, speed: 0.05 } }
  ];
  var WEAPONS = ['bolt', 'meteor', 'chain', 'nova', 'rail', 'orb', 'miss', 'frost', 'mine', 'rang'];
  var WNAMES = { bolt: 'Raio', meteor: 'Meteoro', chain: 'Cadeia', nova: 'Nova', rail: 'Feixe', orb: 'Orbe', miss: 'Mísseis', frost: 'Aura de Gelo', mine: 'Minas', rang: 'Bumerangue' };

  var RINGS = [
    { n: 12, r: 150 },
    { n: 26, r: 290 },
    { n: 36, r: 440 },
    { n: 38, r: 590 }
  ];
  var RY = 0.78;

  function sectorOf(ang) {
    var a = ((ang % TAU) + TAU) % TAU;
    return Math.floor(a / (TAU / SECTORS.length)) % SECTORS.length;
  }
  function angDiff(a, b) {
    var d = Math.abs(a - b) % TAU;
    return d > Math.PI ? TAU - d : d;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var jrand = mulberry32(4242);

  function build() {
    var nodes = [], adj = {};
    function link(a, b) {
      if (!adj[a]) adj[a] = [];
      if (!adj[b]) adj[b] = [];
      if (adj[a].indexOf(b) < 0) adj[a].push(b);
      if (adj[b].indexOf(a) < 0) adj[b].push(a);
    }
    nodes.push({ id: 'start', x: CX, y: CY, start: true, notable: false, sector: -1, name: 'Despertar', desc: '+5% TODO o dano · +20 vida máxima', mods: { allDmg: 0.05, maxhp: 20 } });
    adj.start = [];
    var ringIds = [], k, i;
    var ni = 0;
    for (k = 0; k < RINGS.length; k++) {
      var R = RINGS[k], ids = [];
      var off = (k % 2) * (Math.PI / R.n);
      for (i = 0; i < R.n; i++) {
        var ang = (i / R.n) * TAU + off + (jrand() - 0.5) * (TAU / R.n) * 0.7;
        var rad = R.r * (0.9 + jrand() * 0.2);
        var id = 'n' + (k + 1) + '-' + i;
        var sector = sectorOf(ang);
        var node = {
          id: id,
          x: Math.max(30, Math.min(W - 30, Math.round(CX + Math.cos(ang) * rad))),
          y: Math.max(30, Math.min(H - 30, Math.round(CY + Math.sin(ang) * rad * RY))),
          notable: false, sector: sector, ring: k + 1
        };
        if (k === 2 && i % 3 === 0) {
          var NB = NOTABLES[ni++];
          node.notable = true;
          node.name = NB.name;
          node.mods = NB.mods;
          if (NB.reqPoints) node.reqPoints = NB.reqPoints;
          node.desc = descOf(NB.mods) + (NB.reqPoints ? ' (requer ' + NB.reqPoints + ' pontos gastos)' : '');
        } else {
          var S = SECTORS[sector];
          var pick = S.mods[(i + k) % S.mods.length];
          var mag = pick[1] * (1 + 0.25 * (k + 1));
          if (!FRACT[pick[0]]) mag = Math.round(mag * 10) / 10;
          var mods = {};
          mods[pick[0]] = mag;
          node.name = S.name + ' ' + ['I', 'II', 'III', 'IV'][k];
          node.mods = mods;
          node.desc = descOf(mods);
        }
        nodes.push(node);
        ids.push(id);
      }
      ringIds.push(ids);
    }
    for (k = 0; k < ringIds.length; k++) {
      var ids2 = ringIds[k];
      for (i = 0; i < ids2.length; i++) {
        link(ids2[i], ids2[(i + 1) % ids2.length]);
        if (k === 0) link(ids2[i], 'start');
        else {
          var prev = ringIds[k - 1];
          link(ids2[i], prev[Math.floor((i * prev.length) / ids2.length) % prev.length]);
        }
      }
    }
    // Notables externos + gateways: âncoras no anel 4 por setor
    var usedAnchors = {};
    function anchorFor(sector) {
      var center = (sector + 0.5) * (TAU / SECTORS.length);
      var best = null, bd = 1e9, i;
      for (i = 0; i < ringIds[3].length; i++) {
        if (usedAnchors[ringIds[3][i]]) continue;
        var nd = null, j;
        for (j = 0; j < nodes.length; j++) if (nodes[j].id === ringIds[3][i]) { nd = nodes[j]; break; }
        var a = Math.atan2((nd.y - CY) / RY, nd.x - CX);
        var d = angDiff(a, center);
        if (d < bd) { bd = d; best = nd; }
      }
      if (!best) {
        for (i = 0; i < nodes.length; i++) if (nodes[i].id === ringIds[3][0]) best = nodes[i];
      }
      usedAnchors[best.id] = 1;
      return best;
    }
    function outerPos(anchor) {
      var a = Math.atan2((anchor.y - CY) / RY, anchor.x - CX);
      return {
        x: Math.round(CX + Math.cos(a) * 710),
        y: Math.max(44, Math.min(H - 44, Math.round(CY + Math.sin(a) * 710 * 0.62)))
      };
    }
    for (i = 0; i < OUTER_NOTABLES.length; i++) {
      var ON = OUTER_NOTABLES[i];
      var an = anchorFor(ON.sector);
      var pos = outerPos(an);
      var oid = 'on-' + i;
      nodes.push({ id: oid, x: pos.x, y: pos.y, notable: true, sector: ON.sector, ring: 5, name: ON.name, mods: ON.mods, desc: descOf(ON.mods) });
      link(oid, an.id);
    }
    for (i = 0; i < WEAPONS.length; i++) {
      var wsec = i; // setores 0..9 são as armas, em ordem
      var an2 = anchorFor(wsec);
      var pos2 = outerPos(an2);
      var gid = 'gate-' + WEAPONS[i];
      nodes.push({
        id: gid, x: pos2.x, y: pos2.y, notable: true, gate: WEAPONS[i], sector: wsec, ring: 5,
        name: 'Despertar: ' + WNAMES[WEAPONS[i]],
        mods: {}, desc: 'Desbloqueia a árvore de ' + WNAMES[WEAPONS[i]] + ' (evolução lá dentro)'
      });
      link(gid, an2.id);
    }
    return { nodes: nodes, adj: adj, w: W, h: H };
  }

  var data = build();
  var normals = 0, notables = 0, gates = 0, i;
  for (i = 0; i < data.nodes.length; i++) {
    if (data.nodes[i].start) continue;
    if (data.nodes[i].gate) gates++;
    else if (data.nodes[i].notable) notables++;
    else normals++;
  }

  return {
    nodes: data.nodes, adj: data.adj, w: W, h: H,
    sectors: SECTORS, weapons: WEAPONS, wnames: WNAMES,
    count: { normals: normals, notables: notables, gates: gates },
    byId: function (id) {
      for (var i = 0; i < data.nodes.length; i++) if (data.nodes[i].id === id) return data.nodes[i];
      return null;
    }
  };
})();

'use strict';
/* METEORO v4: 10 fases, árvore 100+16+10, 10 armas com mini-árvores, magos, artefatos. */
window.__game = (function () {
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
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
  var rng = mulberry32(7);
  function rr() { return rng(); }
  function fmtTime(s) {
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ---------- config ----------
  var WORLD = { w: 2600, h: 2600 };
  var ENEMIES = {
    slime:   { hp: 14, spd: 72,  dmg: 8,  r: 16, xp: 1, coins: 1 },
    bat:     { hp: 9,  spd: 152, dmg: 6,  r: 12, xp: 1, coins: 1 },
    skull:   { hp: 34, spd: 96,  dmg: 12, r: 15, xp: 2, coins: 2 },
    wasp:    { hp: 22, spd: 185, dmg: 12, r: 11, xp: 2, coins: 2 },
    shroom:  { hp: 72, spd: 56,  dmg: 14, r: 18, xp: 3, coins: 3 },
    spitter: { hp: 30, spd: 88,  dmg: 10, r: 14, xp: 3, coins: 3 },
    golem:   { hp: 260, spd: 42, dmg: 22, r: 24, xp: 6, coins: 6 },
    ghost:   { hp: 46, spd: 168, dmg: 16, r: 14, xp: 4, coins: 4 },
    mama:    { hp: 130, spd: 60, dmg: 14, r: 22, xp: 2, coins: 3 },
    imp:     { hp: 6,  spd: 205, dmg: 5,  r: 9,  xp: 1, coins: 1 },
    brute:   { hp: 200, spd: 50, dmg: 20, r: 22, xp: 5, coins: 5 },
    wisp:    { hp: 26, spd: 170, dmg: 12, r: 12, xp: 3, coins: 3 },
    phantom: { hp: 40, spd: 95,  dmg: 14, r: 14, xp: 4, coins: 4 }
  };
  var MAXE = 220, MAXG = 320, MAXP = 450, MAXF = 70, MAXS = 200;

  function stageDef() {
    var idx = (state.stage - 1) % window.StageData.count;
    return window.StageData.stages[idx];
  }
  function endlessLoops() { return Math.floor((state.stage - 1) / window.StageData.count); }

  // ---------- meta v2 (migra v1) ----------
  var META_KEY = 'meteoro_meta_v2';
  var meta = {
    coins: 0, best: { time: 0, kills: 0, level: 1, stage: 1 },
    tree: { points: 0, owned: ['start'], bought: 0 },
    wtree: { points: 0, owned: {} },
    mage: 'mago', art: null, artUnlocked: {},
    stats: { kills: 0, coins: 0, maxLevel: 1, maxStage: 1, stages: 0, bosses: 0, maxTime: 0, wins: 0 }
  };
  function metaLoad() {
    try {
      if (typeof localStorage === 'undefined') return;
      var raw = localStorage.getItem(META_KEY);
      if (raw) {
        var m = JSON.parse(raw);
        if (m && typeof m.coins === 'number') meta.coins = m.coins;
        if (m && m.best) for (var k in meta.best) if (typeof m.best[k] === 'number') meta.best[k] = m.best[k];
        if (m && m.tree) {
          if (typeof m.tree.points === 'number') meta.tree.points = m.tree.points;
          if (typeof m.tree.bought === 'number') meta.tree.bought = m.tree.bought;
          if (Array.isArray(m.tree.owned)) meta.tree.owned = m.tree.owned.filter(function (id) { return window.TreeData.byId(id); });
          if (meta.tree.owned.indexOf('start') < 0) meta.tree.owned.push('start');
        }
        if (m && m.wtree) {
          if (typeof m.wtree.points === 'number') meta.wtree.points = m.wtree.points;
          if (m.wtree.owned && typeof m.wtree.owned === 'object') {
            var WO = {};
            for (var wk in m.wtree.owned) {
              if (!window.WTreeData || !window.WTreeData.trees[wk] || !Array.isArray(m.wtree.owned[wk])) continue;
              WO[wk] = m.wtree.owned[wk].filter(function (id) { return window.WTreeData.byId(wk, id); });
            }
            meta.wtree.owned = WO;
          }
        }
        if (m && typeof m.mage === 'string' && window.MetaData && window.MetaData.mageById(m.mage)) meta.mage = m.mage;
        if (m && typeof m.art === 'string' && window.MetaData && window.MetaData.artById(m.art)) meta.art = m.art;
        if (m && m.artUnlocked && typeof m.artUnlocked === 'object') meta.artUnlocked = m.artUnlocked;
        if (m && m.stats) for (var sk in meta.stats) if (typeof m.stats[sk] === 'number') meta.stats[sk] = m.stats[sk];
        return;
      }
      var old = localStorage.getItem('meteoro_meta_v1');
      if (old) {
        var o = JSON.parse(old);
        if (o && typeof o.coins === 'number') meta.coins = o.coins;
        if (o && o.best) for (var k2 in meta.best) if (typeof o.best[k2] === 'number') meta.best[k2] = o.best[k2];
        metaSave();
      }
    } catch (e) { /* sem persistência, sem problema */ }
  }
  function metaSave() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) { /* noop */ }
  }

  // ---------- state ----------
  var state = {
    started: false, over: false, won: false, paused: false, shopOpen: true,
    time: 0, kills: 0, runCoins: 0, runBanked: false,
    stage: 1, stageT: 0, endless: false, bossSpawned: false, stageWarned: false,
    theme: null, props: [], portal: null,
    cam: { x: 0, y: 0 }, view: { w: 0, h: 0, dpr: 1 },
    shake: 0, hurtFlash: 0, toastTimer: 0, bannerT: 0,
    player: null, enemies: [], shots: [], eshots: [], gems: [],
    parts: [], floats: [], strikes: [], scorch: [], ghosts: [],
    zaps: [], beams: [], rings: [], mines: [],
    bolt: null, meteor: null, orb: null, chain: null, nova: null, rail: null,
    miss: null, frost: null, mine: null, rang: null, cloak: '#1d4e89',
    crit: 0.03, magnet: 90, regen: 0, thorns: 0, greed: 0, wis: 0, exec: 0,
    armor: 0, dodge: 0, allDmg: 0,
    sw: false, swUsed: false,
    spawnT: 0, levelPending: 0, choices: [],
    dashCdMax: 3, muted: false, buildDirty: true,
    boss: null, bossNum: 0, prevThreat: 1,
    stats: null,
    sndShoot: 0, sndPop: 0, sndGem: 0, gemCombo: 0, gemComboT: 0
  };
  var keys = {};
  var el = {}, ctx = null, mm = null, tctx = null, stars = [];
  var chips = [];

  // ---------- meta: bônus agregados (árvore + armas + mago + artefato) ----------
  var ALL_WEAPONS = ['bolt', 'meteor', 'orb', 'chain', 'nova', 'rail', 'miss', 'frost', 'mine', 'rang'];
  function gateOpen(w) { return meta.tree.owned.indexOf('gate-' + w) >= 0; }
  function wtreeOwnedList(w) {
    if (!meta.wtree.owned[w]) meta.wtree.owned[w] = [];
    return meta.wtree.owned[w];
  }
  function wtreeHas(w, id) { return wtreeOwnedList(w).indexOf(id) >= 0; }
  function wtreeSpent(w) { return wtreeOwnedList(w).length; }
  function wtreeAvail(w, id) {
    if (!gateOpen(w) || wtreeHas(w, id)) return false;
    var n = window.WTreeData.byId(w, id);
    if (!n) return false;
    if (n.reqCount && wtreeSpent(w) < n.reqCount) return false;
    var adj = window.WTreeData.trees[w].adj[id] || [], i;
    if (n.root) return true;
    for (i = 0; i < adj.length; i++) if (wtreeHas(w, adj[i])) return true;
    return false;
  }
  function wtreeBuy(w, id) {
    if (!wtreeAvail(w, id) || meta.wtree.points <= 0) return false;
    var n = window.WTreeData.byId(w, id);
    var cost = (n && n.cost) || 1;
    if (meta.wtree.points < cost) return false;
    meta.wtree.points -= cost;
    wtreeOwnedList(w).push(id);
    metaSave();
    return true;
  }
  function wtreeRespec(w) {
    var list = wtreeOwnedList(w), refund = 0, i;
    for (i = 0; i < list.length; i++) {
      var n = window.WTreeData.byId(w, list[i]);
      refund += (n && n.cost) || 1;
    }
    meta.wtree.points += refund;
    meta.wtree.owned[w] = [];
    metaSave();
  }
  function applyModsInto(b, mods) {
    for (var k in mods) if (k in b) b[k] += mods[k];
  }
  function treeBonuses() {
    var b = { boltDmg: 0, boltRate: 0, boltCount: 0, boltPierce: 0, meteorDmg: 0, meteorRate: 0, meteorR: 0, meteorCount: 0, orbDmg: 0, orbR: 0, orbCount: 0, chainDmg: 0, chainRate: 0, chainJump: 0, novaDmg: 0, novaRate: 0, novaR: 0, railDmg: 0, railRate: 0, railCount: 0, missDmg: 0, missRate: 0, missCount: 0, frostDmg: 0, frostR: 0, frostSlow: 0, mineDmg: 0, mineRate: 0, mineCount: 0, mineR: 0, rangDmg: 0, rangRate: 0, rangCount: 0, maxhp: 0, regen: 0, armor: 0, speed: 0, critC: 0, dodge: 0, magnet: 0, greed: 0, wis: 0, allDmg: 0, allHp: 0 };
    var i, n;
    for (i = 0; i < meta.tree.owned.length; i++) {
      n = window.TreeData.byId(meta.tree.owned[i]);
      if (n) applyModsInto(b, n.mods);
    }
    if (window.WTreeData) {
      for (var wi = 0; wi < ALL_WEAPONS.length; wi++) {
        var w = ALL_WEAPONS[wi], list = meta.wtree.owned[w] || [];
        for (i = 0; i < list.length; i++) {
          n = window.WTreeData.byId(w, list[i]);
          if (n) applyModsInto(b, n.mods);
        }
      }
    }
    if (window.MetaData) {
      var mg = window.MetaData.mageById(meta.mage);
      if (mg) applyModsInto(b, mg.mods);
      if (meta.art && meta.artUnlocked[meta.art]) {
        var at = window.MetaData.artById(meta.art);
        if (at) applyModsInto(b, at.mods);
      }
    }
    return b;
  }
  function evoOwned(w) { return wtreeHas(w, w + '-evo'); }
  function applyEvo(w) {
    var S = state[w];
    if (!S || !evoOwned(w)) return;
    if (w === 'bolt') { S.count += 2; S.dmg *= 2; S.pierce += 2; }
    else if (w === 'meteor') { S.count += 2; S.dmg *= 1.8; S.radius *= 1.3; S.burn = true; }
    else if (w === 'chain') { S.jumps += 4; S.dmg *= 2; S.range *= 1.3; }
    else if (w === 'nova') { S.radius *= 1.6; S.dmg *= 2; S.cdMax *= 0.7; }
    else if (w === 'rail') { S.count += 2; S.width *= 1.8; S.dmg *= 1.8; }
    else if (w === 'orb') { S.count += 2; S.dmg *= 2; S.radius *= 1.4; }
    else if (w === 'miss') { S.count += 3; S.dmg *= 2; S.aoe = 90; }
    else if (w === 'frost') { S.radius *= 1.5; S.dmg *= 2; S.slowMul = 0.25; S.cdMax = Math.max(0.3, S.cdMax * 0.7); }
    else if (w === 'mine') { S.count += 2; S.dmg *= 2; S.radius *= 1.4; S.cdMax *= 0.7; }
    else if (w === 'rang') { S.count += 2; S.dmg *= 2; S.rate *= 1.25; }
  }
  function checkMiles() {
    if (!window.MetaData) return;
    var arts = window.MetaData.artifacts, i, ch = false;
    for (i = 0; i < arts.length; i++) {
      if (meta.artUnlocked[arts[i].id]) continue;
      if ((meta.stats[arts[i].mile.stat] || 0) >= arts[i].mile.need) {
        meta.artUnlocked[arts[i].id] = true;
        ch = true;
      }
    }
    if (ch) {
      metaSave();
      if (state.started && !state.over) toast('Marco batido! Artefato novo na loja.');
    }
  }
  function treeSpent() { return Math.max(0, meta.tree.owned.length - 1); }
  function treeBuy(id) {
    var n = window.TreeData.byId(id);
    if (!n || n.start) return false;
    if (meta.tree.owned.indexOf(id) >= 0) return false;
    if (meta.tree.points <= 0) return false;
    if (n.reqPoints && treeSpent() < n.reqPoints) return false;
    var adj = window.TreeData.adj[id] || [], ok = false, i;
    for (i = 0; i < adj.length; i++) if (meta.tree.owned.indexOf(adj[i]) >= 0) { ok = true; break; }
    if (!ok) return false;
    meta.tree.points--;
    meta.tree.owned.push(id);
    metaSave();
    return true;
  }
  function treeRespec() {
    meta.tree.points += treeSpent();
    meta.tree.owned = ['start'];
    metaSave();
  }
  function pointCost() { return Math.round(150 * Math.pow(1.6, meta.tree.bought)); }
  function buyPoint() {
    var c = pointCost();
    if (meta.coins < c) return false;
    meta.coins -= c;
    meta.tree.bought++;
    meta.tree.points++;
    metaSave();
    return true;
  }

  function newPlayer(tb) {
    var maxhp = Math.round((100 + tb.maxhp) * (1 + tb.allHp));
    return {
      x: WORLD.w / 2, y: WORLD.h / 2, r: 14,
      hp: maxhp, maxhp: maxhp,
      speed: 232 * (1 + tb.speed),
      level: 1, xp: 0, xpnext: 6,
      face: -Math.PI / 2, aim: 0, aimX: 1, aimY: 0,
      inv: 0, dashT: 0, dashCd: 0, dashX: 1, dashY: 0,
      walkT: 0, moving: false
    };
  }
  function resetRun() {
    var tb = treeBonuses();
    state.time = 0; state.kills = 0; state.runCoins = 0; state.runBanked = false;
    state.over = false; state.won = false; state.paused = false;
    state.stage = 1; state.stageT = 0; state.endless = false;
    state.bossSpawned = false; state.stageWarned = false; state.portal = null;
    state.shake = 0; state.hurtFlash = 0; state.bannerT = 0;
    state.enemies.length = 0; state.shots.length = 0; state.eshots.length = 0;
    state.gems.length = 0; state.parts.length = 0; state.floats.length = 0;
    state.strikes.length = 0; state.scorch.length = 0; state.ghosts.length = 0;
    state.zaps.length = 0; state.beams.length = 0; state.rings.length = 0;
    state.bolt = { dmg: 10 * (1 + tb.boltDmg), rate: 2.2 * (1 + tb.boltRate), cd: 0, count: 1 + tb.boltCount, pierce: tb.boltPierce, speed: 560 };
    state.meteor = { unlocked: false, dmg: 46 * (1 + tb.meteorDmg), cdMax: Math.max(1.2, 4.5 * (1 - tb.meteorRate)), cd: 2.5, radius: 112 * (1 + tb.meteorR), count: 1 + (tb.meteorCount || 0) };
    state.orb = { unlocked: false, count: tb.orbCount, dmg: 14 * (1 + tb.orbDmg), radius: 80 * (1 + tb.orbR), angle: 0 };
    state.chain = { unlocked: false, dmg: 26 * (1 + tb.chainDmg), cd: 0, cdMax: Math.max(0.8, 2.3 * (1 - tb.chainRate)), jumps: 3 + tb.chainJump, range: 520 };
    state.nova = { unlocked: false, dmg: 34 * (1 + tb.novaDmg), cd: 0, cdMax: Math.max(1.5, 5.5 * (1 - tb.novaRate)), radius: 170 * (1 + tb.novaR) };
    state.rail = { unlocked: false, dmg: 90 * (1 + tb.railDmg), cd: 0, cdMax: Math.max(1.2, 3.4 * (1 - tb.railRate)), width: 34, len: 780, count: 1 + (tb.railCount || 0) };
    state.miss = { unlocked: false, dmg: 18 * (1 + tb.missDmg), cd: 0, cdMax: Math.max(0.6, 1.8 * (1 - tb.missRate)), count: 2 + tb.missCount, speed: 460 };
    state.frost = { unlocked: false, dmg: 8 * (1 + tb.frostDmg), radius: 190 * (1 + tb.frostR), tick: 0, slowMul: Math.max(0.2, 0.5 - tb.frostSlow), cdMax: 0.5 };
    state.mine = { unlocked: false, dmg: 70 * (1 + tb.mineDmg), cd: 0, cdMax: Math.max(1, 2.6 * (1 - tb.mineRate)), count: 3 + tb.mineCount, radius: 100 * (1 + tb.mineR) };
    state.rang = { unlocked: false, dmg: 22 * (1 + tb.rangDmg), rate: 3.4 * (1 + tb.rangRate), count: 1 + tb.rangCount, radius: 130, angle: 0 };
    state.mines.length = 0;
    var wi;
    for (wi = 0; wi < ALL_WEAPONS.length; wi++) applyEvo(ALL_WEAPONS[wi]);
    var mage = window.MetaData ? window.MetaData.mageById(meta.mage) : null;
    state.cloak = (mage && mage.cloak) || '#1d4e89';
    if (mage && mage.startWeapon && state[mage.startWeapon]) {
      state[mage.startWeapon].unlocked = true;
      if (mage.startWeapon === 'orb' && state.orb.count < 1) state.orb.count = 1;
    }
    if (meta.art && meta.artUnlocked[meta.art] && window.MetaData) {
      var art = window.MetaData.artById(meta.art);
      if (art && art.startWeapon && state[art.startWeapon]) state[art.startWeapon].unlocked = true;
    }
    state.crit = 0.03 + tb.critC;
    state.magnet = 90 + tb.magnet;
    state.regen = tb.regen;
    state.armor = tb.armor;
    state.dodge = tb.dodge;
    state.allDmg = tb.allDmg;
    state.thorns = 0; state.greed = tb.greed; state.wis = tb.wis; state.exec = 0;
    state.sw = false; state.swUsed = false;
    state.spawnT = 0; state.levelPending = 0; state.choices = [];
    state.dashCdMax = 3; state.buildDirty = true;
    state.boss = null; state.bossNum = 0; state.prevThreat = 1;
    state.stats = { bolt: 0, meteor: 0, orb: 0, chain: 0, nova: 0, rail: 0, miss: 0, frost: 0, mine: 0, rang: 0 };
    state.player = newPlayer(tb);
    applyTheme();
  }
  function dmgMul() { return 1 + state.allDmg; }
  function emul(e) { return (e.elite || e.boss) && state.exec > 0 ? 1 + 0.35 * state.exec : 1; }

  function applyTheme() {
    var S = stageDef();
    state.theme = { bg: S.bg, grid: S.grid, star: S.star, accent: S.accent };
    var r2 = mulberry32(state.stage * 991 + 7), i;
    state.props = [];
    for (i = 0; i < 44; i++) {
      state.props.push({
        k: S.props[(r2() * S.props.length) | 0],
        x: 60 + r2() * (WORLD.w - 120),
        y: 60 + r2() * (WORLD.h - 120),
        s: 0.7 + r2() * 0.7
      });
    }
  }

  // ---------- audio ----------
  var AC = null, master = null, noiseBuf = null;
  function audio() {
    if (AC) return true;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      AC = new Ctor();
      master = AC.createGain();
      master.gain.value = state.muted ? 0 : 0.12;
      master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  }
  function beep(f0, f1, dur, type, delay, vol) {
    if (!AC || !master) return;
    try {
      var t = AC.currentTime + (delay || 0);
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol || 1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }
  function noise(dur, freq, type, vol, delay) {
    if (!AC || !master || !noiseBuf) return;
    try {
      var t = AC.currentTime + (delay || 0);
      var src = AC.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var f = AC.createBiquadFilter();
      f.type = type || 'lowpass';
      f.frequency.value = freq;
      var g = AC.createGain();
      g.gain.setValueAtTime(vol || 1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }
  var sfx = {
    shoot: function () { beep(720, 280, 0.08, 'square', 0, 0.5); },
    pop: function () { beep(380, 920, 0.09, 'sine', 0, 0.7); },
    gem: function (n) { beep(880 + Math.min(n, 12) * 45, 1400, 0.09, 'sine', 0, 0.5); },
    level: function () { beep(523, 523, 0.1, 'square', 0, 0.6); beep(659, 659, 0.1, 'square', 0.1, 0.6); beep(784, 784, 0.1, 'square', 0.2, 0.6); beep(1046, 1046, 0.2, 'square', 0.3, 0.6); },
    warn: function () { beep(95, 70, 0.4, 'sawtooth', 0, 0.7); },
    boom: function () { noise(0.5, 300, 'lowpass', 2.2); beep(70, 30, 0.4, 'sine', 0, 1.4); },
    hurt: function () { beep(170, 55, 0.25, 'sawtooth', 0, 0.9); },
    dash: function () { noise(0.18, 2400, 'highpass', 0.8); },
    heart: function () { beep(440, 880, 0.18, 'sine', 0, 0.8); },
    click: function () { beep(600, 900, 0.06, 'square', 0, 0.5); },
    over: function () { beep(392, 392, 0.2, 'square', 0, 0.7); beep(311, 311, 0.2, 'square', 0.2, 0.7); beep(233, 110, 0.5, 'square', 0.4, 0.7); },
    zap: function () { noise(0.12, 4000, 'highpass', 1.2); beep(1800, 200, 0.12, 'sawtooth', 0, 0.6); },
    novaSnd: function () { beep(200, 900, 0.25, 'sine', 0, 0.8); noise(0.3, 800, 'lowpass', 1.2); },
    rail: function () { beep(1400, 100, 0.3, 'sawtooth', 0, 0.8); },
    spit: function () { beep(300, 120, 0.12, 'sine', 0, 0.5); },
    wind: function () { beep(523, 1046, 0.4, 'sine', 0, 0.9); beep(784, 1568, 0.4, 'sine', 0.15, 0.7); },
    portal: function () { beep(300, 1200, 0.5, 'sine', 0, 0.8); },
    victory: function () { var n = [523, 659, 784, 1046, 784, 1046, 1318]; for (var i = 0; i < n.length; i++) beep(n[i], n[i], 0.16, 'square', i * 0.15, 0.6); }
  };
  function toggleMute() {
    state.muted = !state.muted;
    if (master) { try { master.gain.value = state.muted ? 0 : 0.12; } catch (e) { /* noop */ } }
    if (el.sound) el.sound.textContent = state.muted ? 'SOM: OFF' : 'SOM: ON';
    toast(state.muted ? 'Som desligado.' : 'Som ligado.');
  }

  // ---------- helpers ----------
  function toast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.style.opacity = '1';
    state.toastTimer = 2.4;
  }
  function banner(txt) {
    if (!el.banner) return;
    el.banner.textContent = txt;
    el.banner.style.opacity = '1';
    state.bannerT = 2.6;
  }
  function addShake(n) { state.shake = Math.min(1, state.shake + n); }
  function floater(x, y, txt, color, size) {
    if (state.floats.length >= MAXF) state.floats.shift();
    state.floats.push({ x: x, y: y, txt: txt, color: color, size: size || 14, t: 0, life: 0.9 });
  }
  function burst(x, y, n, color, spd, life, r) {
    for (var i = 0; i < n; i++) {
      if (state.parts.length >= MAXP) state.parts.shift();
      var a = rr() * TAU, s = spd * (0.3 + rr() * 0.7);
      state.parts.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: life * (0.6 + rr() * 0.7), color: color, r: (r || 4) * (0.6 + rr() * 0.8)
      });
    }
  }
  function nearestEnemy(x, y, maxD, skip) {
    var best = null, bd = maxD * maxD, i, e;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.spawnT > 0 || e === skip) continue;
      if (skip && skip.set && skip.set.indexOf(e) >= 0) continue;
      var dd = d2(x, y, e.x, e.y);
      if (dd < bd) { bd = dd; best = e; }
    }
    return best;
  }

  // ---------- spawn ----------
  function threat() { return 1 + Math.floor(state.time / 60); }
  function pickType() {
    var list = stageDef().enemies, tot = 0, i;
    for (i = 0; i < list.length; i++) tot += list[i].w;
    var r = rr() * tot;
    for (i = 0; i < list.length; i++) {
      r -= list[i].w;
      if (r <= 0) return list[i].t;
    }
    return list[0].t;
  }
  function spawnEnemy(forceType, atX, atY) {
    if (state.enemies.length >= MAXE) return null;
    var type = forceType || pickType();
    var B = ENEMIES[type];
    var S = stageDef();
    var loops = endlessLoops();
    var p = state.player, x, y;
    if (atX !== undefined) { x = atX; y = atY; }
    else {
      var ang = rr() * TAU;
      var rad = Math.sqrt(state.view.w * state.view.w + state.view.h * state.view.h) / 2 + 90;
      x = clamp(p.x + Math.cos(ang) * rad, 30, WORLD.w - 30);
      y = clamp(p.y + Math.sin(ang) * rad, 30, WORLD.h - 30);
    }
    var elite = forceType === undefined && state.time > 90 && rr() < 0.05 + state.time / 5000;
    var hpm = S.hpMul * Math.pow(1.8, loops) * (1 + state.time / 95 + (threat() - 1) * 0.2) * (elite ? 9 : 1);
    var e = {
      type: type, x: x, y: y,
      hp: B.hp * hpm, maxhp: B.hp * hpm,
      speed: B.spd * (1 + S.spdAdd + Math.min(0.5, state.time / 500)) * (elite ? 0.85 : 1),
      dmg: Math.round(B.dmg * S.dmgMul * Math.pow(1.4, loops) * (1 + state.time / 200) * (elite ? 1.6 : 1)),
      r: B.r * (elite ? 2.3 : 1),
      xp: Math.max(1, Math.round(B.xp * S.xpMul * (elite ? 8 : 1))),
      coins: elite ? 15 : B.coins,
      t: rr() * TAU, hurt: 0, spawnT: atX !== undefined ? 0.35 : 0.7,
      elite: elite, boss: false, orbT: 0, kbx: 0, kby: 0, weave: rr() * TAU,
      kbRes: type === 'golem' ? 0.15 : type === 'brute' ? 0.3 : type === 'mama' ? 0.7 : 1,
      mode: 'chase', modeT: 0, lx: 0, ly: 0, fireT: 1 + rr() * 1.5, blinkT: 2 + rr()
    };
    state.enemies.push(e);
    return e;
  }
  function spawnBoss() {
    var S = stageDef(), D = S.boss, p = state.player;
    var loops = endlessLoops();
    var ang = rr() * TAU;
    var rad = Math.sqrt(state.view.w * state.view.w + state.view.h * state.view.h) / 2 + 120;
    var x = clamp(p.x + Math.cos(ang) * rad, 90, WORLD.w - 90);
    var y = clamp(p.y + Math.sin(ang) * rad, 90, WORLD.h - 90);
    var e = {
      type: D.base, x: x, y: y,
      hp: D.hp * Math.pow(1.8, loops), maxhp: D.hp * Math.pow(1.8, loops),
      speed: D.spd, dmg: Math.round(D.dmg * Math.pow(1.4, loops)),
      r: D.r, xp: 60 * (state.stage), coins: 120 * state.stage,
      t: 0, hurt: 0, spawnT: 1.2, elite: false, boss: true, orbT: 0,
      kbx: 0, kby: 0, weave: 0, kbRes: 0,
      mode: 'chase', modeT: 0, lx: 0, ly: 0, fireT: 0, blinkT: 0,
      tint: D.tint, bname: D.name, patterns: D.patterns, patT: [], spiralOff: rr() * TAU,
      enrage: !!D.enrage
    };
    var i;
    for (i = 0; i < D.patterns.length; i++) e.patT.push(2 + i * 1.5);
    state.enemies.push(e);
    state.boss = e;
    state.bossNum++;
    if (el.bossname) el.bossname.textContent = D.name;
    banner(D.name + ' DESCEU!');
    sfx.warn();
    return e;
  }
  function updateSpawns(dt) {
    var S = stageDef();
    if (!state.stageWarned && S.time - state.stageT < 6 && !state.bossSpawned) {
      state.stageWarned = true;
      banner(S.boss.name + ' SE APROXIMA…');
      sfx.warn();
    }
    if (!state.bossSpawned && state.stageT >= S.time) {
      state.bossSpawned = true;
      spawnBoss();
    }
    var th = threat();
    if (th > state.prevThreat) {
      banner('AMEAÇA ' + th);
      state.prevThreat = th;
    }
    state.spawnT -= dt;
    if (state.spawnT > 0 || state.enemies.length >= Math.min(MAXE, 80 + state.time)) return;
    state.spawnT = Math.max(0.2, 1.0 - state.time * 0.0035);
    var batch = 2 + Math.floor(state.time / 50), i;
    var cap = Math.min(MAXE, 80 + state.time);
    for (i = 0; i < batch && state.enemies.length < cap; i++) spawnEnemy();
  }

  // ---------- combat ----------
  function damageEnemy(e, dmg, kx, ky, crit) {
    if (e.hp <= 0) return;
    e.hp -= dmg * emul(e) * (1 + state.allDmg);
    e.hurt = 0.12;
    var res = e.kbRes === undefined ? 1 : e.kbRes;
    e.kbx += (kx || 0) * res;
    e.kby += (ky || 0) * res;
    floater(e.x + (rr() - 0.5) * 20, e.y - e.r - 6, Math.round(dmg) + '', crit ? '#ffd700' : '#fff', crit ? 18 : 13);
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    var i = state.enemies.indexOf(e);
    if (i < 0) return;
    state.enemies.splice(i, 1);
    state.kills++;
    meta.stats.kills++;
    checkMiles();
    var S = stageDef();
    var coins = Math.round(e.coins * S.coinMul * (1 + state.greed * 0.25));
    state.runCoins += coins;
    if (coins >= 5) floater(e.x, e.y - e.r - 22, '+' + coins, '#ffd700', 13);
    dropGems(e);
    var colors = { slime: '#2ecc40', bat: '#9b59b6', skull: '#ecf0f1', shroom: '#e74c3c', ghost: '#bfe9ff', wasp: '#f1c40f', spitter: '#7bed6f', golem: '#95a5a6', mama: '#27ae60', imp: '#e74c3c', brute: '#a0522d', wisp: '#9fd4e8', phantom: '#5b6fd6' };
    burst(e.x, e.y, e.boss ? 60 : e.elite ? 26 : 12, colors[e.type] || '#fff', e.boss ? 460 : e.elite ? 320 : 200, 0.6, e.boss ? 8 : e.elite ? 6 : 4);
    if (e.type === 'mama' && !e.boss) {
      spawnEnemy('slime', e.x - 16, e.y);
      spawnEnemy('slime', e.x + 16, e.y);
      toast('A mãe-gosma pariu!');
    }
    if (e.elite || e.boss) {
      burst(e.x, e.y, 14, '#ffd700', 260, 0.7, 5);
      addShake(e.boss ? 0.8 : 0.25);
      var hearts = e.boss ? 2 : (rr() < 0.35 ? 1 : 0), h;
      for (h = 0; h < hearts; h++) {
        if (state.gems.length < MAXG) state.gems.push({ x: e.x + (rr() - 0.5) * 60, y: e.y + (rr() - 0.5) * 60, v: 0, heart: true, t: 0 });
      }
      if (e.boss) bossDown(e);
      else toast('Elite abatida! +' + coins + ' moedas');
    }
    if (state.sndPop <= 0) { sfx.pop(); state.sndPop = 0.06; }
  }
  function bossDown(e) {
    var h;
    for (h = 0; h < 12; h++) {
      if (state.gems.length < MAXG) state.gems.push({ x: e.x + (rr() - 0.5) * 160, y: e.y + (rr() - 0.5) * 160, v: 5, heart: false, t: 0 });
    }
    state.boss = null;
    meta.tree.points++;
    meta.wtree.points++;
    meta.stats.bosses++;
    metaSave();
    checkMiles();
    var bi;
    for (bi = state.enemies.length - 1; bi >= 0; bi--) {
      var be = state.enemies[bi];
      if (be === e || be.boss || be.elite || be.spawnT > 0) continue;
      killEnemy(be);
    }
    banner(e.bname + ' ABATIDO! +1 PONTO');
    sfx.level();
    if (state.stage >= window.StageData.count && !state.endless) {
      victory();
      return;
    }
    state.portal = { x: clamp(e.x, 90, WORLD.w - 90), y: clamp(e.y, 90, WORLD.h - 90), t: 0 };
    toast('Entre no portal para a próxima fase!');
  }
  function dropGems(e) {
    var n = e.boss ? 6 : e.elite ? 5 : 1, i;
    for (i = 0; i < n; i++) {
      if (state.gems.length >= MAXG) state.gems.shift();
      state.gems.push({
        x: e.x + (rr() - 0.5) * (n > 1 ? 90 : 10),
        y: e.y + (rr() - 0.5) * (n > 1 ? 90 : 10),
        v: Math.max(1, Math.round(e.xp / n)), heart: false, t: rr() * TAU
      });
    }
  }
  function fireBolt() {
    var p = state.player, B = state.bolt;
    var tgt = nearestEnemy(p.x, p.y, 720);
    if (!tgt) return false;
    var base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    p.aim = base; p.aimX = Math.cos(base); p.aimY = Math.sin(base);
    for (var i = 0; i < B.count; i++) {
      if (state.shots.length >= MAXS) break;
      var off = (i - (B.count - 1) / 2) * 0.14;
      var a = base + off;
      var crit = rr() < state.crit;
      state.shots.push({
        x: p.x, y: p.y, vx: Math.cos(a) * B.speed, vy: Math.sin(a) * B.speed,
        dmg: B.dmg * dmgMul() * (crit ? 2 : 1), pierce: B.pierce, life: 1.3, crit: crit, hit: null
      });
    }
    state.stats.bolt++;
    if (state.sndShoot <= 0) { sfx.shoot(); state.sndShoot = 0.07; }
    return true;
  }
  function meteorTarget() {
    var best = null, bestN = -1, i, j, e;
    for (i = 0; i < 6; i++) {
      e = state.enemies[(rr() * state.enemies.length) | 0];
      if (!e || e.spawnT > 0) continue;
      var n = 0;
      for (j = 0; j < state.enemies.length; j++) {
        if (d2(e.x, e.y, state.enemies[j].x, state.enemies[j].y) < 130 * 130) n++;
      }
      if (n > bestN) { bestN = n; best = e; }
    }
    return best || nearestEnemy(state.player.x, state.player.y, 4000);
  }
  function callMeteor() {
    var M = state.meteor;
    if (state.enemies.length === 0) return false;
    var fired = false, c;
    for (c = 0; c < (M.count || 1); c++) {
      var best = meteorTarget();
      if (!best) break;
      state.strikes.push({ x: best.x + (c > 0 ? (rr() - 0.5) * 160 : 0), y: best.y + (c > 0 ? (rr() - 0.5) * 160 : 0), phase: 0, t: -c * 0.3, r: M.radius, dmg: M.dmg * dmgMul(), burn: !!M.burn });
      fired = true;
    }
    if (fired) sfx.warn();
    return fired;
  }
  function explodeMeteor(s) {
    var i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      var dd = d2(s.x, s.y, e.x, e.y);
      if (dd < s.r * s.r) {
        var fall = 1 - 0.5 * Math.sqrt(dd) / s.r;
        var crit = rr() < state.crit;
        var dx = e.x - s.x, dy = e.y - s.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        damageEnemy(e, s.dmg * fall * (crit ? 2 : 1), (dx / dl) * 260, (dy / dl) * 260, crit);
        if (s.burn && e.hp > 0) { e.burnT = 3; e.burnDps = s.dmg * 0.25; }
      }
    }
    state.stats.meteor++;
    burst(s.x, s.y, 30, '#ff9f1c', 420, 0.7, 6);
    burst(s.x, s.y, 18, '#ff3b3b', 300, 0.6, 5);
    burst(s.x, s.y, 12, '#555', 140, 1.1, 7);
    state.scorch.push({ x: s.x, y: s.y, r: s.r, t: 6 });
    if (state.scorch.length > 24) state.scorch.shift();
    addShake(0.45);
    sfx.boom();
  }
  function fireChain() {
    var C = state.chain, p = state.player;
    var first = nearestEnemy(p.x, p.y, C.range);
    if (!first) return false;
    var pts = [{ x: p.x, y: p.y }];
    var hitSet = [], cur = first, cx = p.x, cy = p.y, k;
    for (k = 0; k < C.jumps && cur; k++) {
      pts.push({ x: cur.x, y: cur.y });
      hitSet.push(cur);
      var crit = rr() < state.crit;
      var fall = Math.pow(0.85, k);
      damageEnemy(cur, C.dmg * dmgMul() * fall * (crit ? 2 : 1), 0, 0, crit);
      burst(cur.x, cur.y, 4, '#bfe9ff', 200, 0.25, 3);
      cx = cur.x; cy = cur.y;
      cur = nearestEnemy(cx, cy, 240, { set: hitSet });
    }
    state.zaps.push({ pts: pts, t: 0.18 });
    state.stats.chain++;
    sfx.zap();
    return true;
  }
  function fireNova() {
    var N = state.nova, p = state.player;
    var any = nearestEnemy(p.x, p.y, N.radius * 1.25);
    if (!any) return false;
    var i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      var dd = d2(p.x, p.y, e.x, e.y);
      if (dd < N.radius * N.radius) {
        var crit = rr() < state.crit;
        var dx = e.x - p.x, dy = e.y - p.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        damageEnemy(e, N.dmg * dmgMul() * (crit ? 2 : 1), (dx / dl) * 320, (dy / dl) * 320, crit);
      }
    }
    state.rings.push({ x: p.x, y: p.y, r: N.radius, t: 0.35 });
    state.stats.nova++;
    sfx.novaSnd();
    return true;
  }
  function fireRailOne(ang) {
    var R = state.rail, p = state.player;
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      var rx = e.x - p.x, ry = e.y - p.y;
      var proj = rx * dx + ry * dy;
      if (proj < 0 || proj > R.len) continue;
      var perp = Math.abs(rx * dy - ry * dx);
      if (perp < R.width / 2 + e.r * 0.7) {
        var crit = rr() < state.crit;
        damageEnemy(e, R.dmg * dmgMul() * (crit ? 2 : 1), dx * 220, dy * 220, crit);
      }
    }
    state.beams.push({ x: p.x, y: p.y, ang: ang, len: R.len, t: 0.25, w: R.width });
  }
  function fireRail() {
    var R = state.rail, p = state.player;
    var tgt = nearestEnemy(p.x, p.y, R.len);
    if (!tgt) return false;
    var base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    var n = R.count || 1, i;
    for (i = 0; i < n; i++) {
      fireRailOne(base + (i - (n - 1) / 2) * 0.07);
    }
    state.stats.rail++;
    addShake(0.12);
    sfx.rail();
    return true;
  }
  function fireMiss() {
    var p = state.player, MI = state.miss;
    var tgt = nearestEnemy(p.x, p.y, 760);
    if (!tgt) return false;
    var base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    var i;
    for (i = 0; i < MI.count; i++) {
      if (state.shots.length >= MAXS) break;
      var a = base + (i - (MI.count - 1) / 2) * 0.22;
      var crit = rr() < state.crit;
      state.shots.push({
        kind: 'miss', x: p.x, y: p.y, vx: Math.cos(a) * MI.speed, vy: Math.sin(a) * MI.speed,
        dmg: MI.dmg * dmgMul() * (crit ? 2 : 1), pierce: 0, life: 1.6, crit: crit, hit: null, aoe: MI.aoe || 0
      });
    }
    state.stats.miss++;
    if (state.sndShoot <= 0) { sfx.shoot(); state.sndShoot = 0.07; }
    return true;
  }
  function explodeMiss(s) {
    var i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      if (d2(s.x, s.y, e.x, e.y) < s.aoe * s.aoe) {
        var crit = rr() < state.crit;
        damageEnemy(e, s.dmg * 0.7 * (crit ? 2 : 1), 0, 0, crit);
      }
    }
    burst(s.x, s.y, 10, '#ff9f1c', 260, 0.4, 4);
    state.rings.push({ x: s.x, y: s.y, r: s.aoe, t: 0.25 });
  }
  function frostTick() {
    var F = state.frost, p = state.player, hit = false, i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      if (d2(p.x, p.y, e.x, e.y) < F.radius * F.radius) {
        var crit = rr() < state.crit;
        damageEnemy(e, F.dmg * dmgMul() * (crit ? 2 : 1), 0, 0, crit);
        e.slowT = 1.6;
        e.slowMul = F.slowMul;
        hit = true;
      }
    }
    if (hit) {
      state.stats.frost++;
      burst(p.x + (rr() - 0.5) * F.radius, p.y + (rr() - 0.5) * F.radius, 6, '#bfe9ff', 120, 0.5, 3);
    }
    return hit;
  }
  function layMine() {
    var MN = state.mine, p = state.player;
    if (state.mines.length >= 40) return false;
    var tgt = nearestEnemy(p.x, p.y, 900);
    var i, laid = false;
    for (i = 0; i < Math.min(MN.count, 40 - state.mines.length); i++) {
      var a = rr() * TAU, d = 120 + rr() * 260;
      var mx = p.x, my = p.y;
      if (tgt) {
        var ta = Math.atan2(tgt.y - p.y, tgt.x - p.x) + (rr() - 0.5) * 1.2;
        var td = Math.min(560, Math.sqrt(d2(p.x, p.y, tgt.x, tgt.y)) * (0.6 + rr() * 0.5));
        mx = p.x + Math.cos(ta) * td;
        my = p.y + Math.sin(ta) * td;
      } else {
        mx = p.x + Math.cos(a) * d;
        my = p.y + Math.sin(a) * d;
      }
      state.mines.push({
        x: clamp(mx, 30, WORLD.w - 30), y: clamp(my, 30, WORLD.h - 30),
        arm: 0.8, life: 14, dmg: MN.dmg * dmgMul(), r: MN.radius
      });
      laid = true;
    }
    return laid;
  }
  function explodeMine(m) {
    var i, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      if (e.spawnT > 0) continue;
      if (d2(m.x, m.y, e.x, e.y) < m.r * m.r) {
        var crit = rr() < state.crit;
        var dx = e.x - m.x, dy = e.y - m.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        damageEnemy(e, m.dmg * (crit ? 2 : 1), (dx / dl) * 300, (dy / dl) * 300, crit);
      }
    }
    state.stats.mine++;
    burst(m.x, m.y, 22, '#ff9f1c', 380, 0.6, 6);
    burst(m.x, m.y, 10, '#555', 120, 1, 6);
    state.rings.push({ x: m.x, y: m.y, r: m.r, t: 0.3 });
    state.scorch.push({ x: m.x, y: m.y, r: m.r * 0.7, t: 4 });
    if (state.scorch.length > 24) state.scorch.shift();
    addShake(0.3);
    sfx.boom();
  }
  function updateMines(dt) {
    var i, j, m, e, boom;
    for (i = state.mines.length - 1; i >= 0; i--) {
      m = state.mines[i];
      m.life -= dt;
      if (m.arm > 0) m.arm -= dt;
      boom = m.life <= 0;
      if (!boom && m.arm <= 0) {
        for (j = 0; j < state.enemies.length; j++) {
          e = state.enemies[j];
          if (e.spawnT > 0) continue;
          if (d2(m.x, m.y, e.x, e.y) < 70 * 70) { boom = true; break; }
        }
      }
      if (boom) {
        state.mines.splice(i, 1);
        if (m.arm <= 0) explodeMine(m);
      }
    }
  }
  function updateRang() {
    var R = state.rang;
    if (!R.unlocked) return;
    var p = state.player, i, e, k;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.spawnT > 0 || e.rangT > 0) continue;
      for (k = 0; k < R.count; k++) {
        var a = R.angle + (k / R.count) * TAU;
        var bx = p.x + Math.cos(a) * R.radius, by = p.y + Math.sin(a) * R.radius;
        if (d2(bx, by, e.x, e.y) < (e.r + 18) * (e.r + 18)) {
          var crit = rr() < state.crit;
          damageEnemy(e, R.dmg * dmgMul() * (crit ? 2 : 1), 0, 0, crit);
          state.stats.rang++;
          e.rangT = 0.4;
          burst(bx, by, 4, '#9fd4e8', 200, 0.25, 3);
          break;
        }
      }
    }
  }
  function spitGlob(e, ang, spd) {
    if (state.eshots.length >= MAXS) return;
    state.eshots.push({
      x: e.x, y: e.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      dmg: e.dmg, r: 7, life: 3.5, boss: !!e.boss
    });
  }
  // ---------- upgrades (run) ----------
  var UPS = [
    { id: 'bdmg', w: 'bolt', rar: 0, name: 'Raio potente', desc: '+35% dano do raio', max: 8, apply: function () { state.bolt.dmg *= 1.35; } },
    { id: 'brate', w: 'bolt', rar: 0, name: 'Gatilho rápido', desc: '+18% velocidade de disparo', max: 8, apply: function () { state.bolt.rate *= 1.18; } },
    { id: 'multi', w: 'bolt', rar: 1, name: 'Raio duplo', desc: '+1 projétil por disparo', max: 3, min: 3, apply: function () { state.bolt.count++; } },
    { id: 'pierce', w: 'bolt', rar: 0, name: 'Raio perfurante', desc: 'projéteis atravessam +1 inimigo', max: 3, apply: function () { state.bolt.pierce++; } },
    { id: 'meteor', w: 'meteor', rar: 2, name: 'Chuva de meteoros', desc: 'NOVO: meteoros caem na maior concentração', max: 1, min: 2, apply: function () { state.meteor.unlocked = true; } },
    { id: 'mdmg', w: 'meteor', rar: 0, name: 'Meteoros pesados', desc: '+40% dano do meteoro', max: 8, req: 'meteor', apply: function () { state.meteor.dmg *= 1.4; } },
    { id: 'mrate', w: 'meteor', rar: 0, name: 'Chuva constante', desc: '-12% recarga do meteoro', max: 6, req: 'meteor', apply: function () { state.meteor.cdMax *= 0.88; } },
    { id: 'msize', w: 'meteor', rar: 1, name: 'Cratera larga', desc: '+22% raio do meteoro', max: 4, req: 'meteor', apply: function () { state.meteor.radius *= 1.22; } },
    { id: 'orb', w: 'orb', rar: 2, name: 'Orbe orbital', desc: 'NOVO: orbe que gira e queima quem encosta', max: 1, min: 4, apply: function () { state.orb.unlocked = true; if (state.orb.count < 1) state.orb.count = 1; } },
    { id: 'orb2', w: 'orb', rar: 1, name: 'Orbe gêmeo', desc: '+1 orbe orbital', max: 2, req: 'orb', apply: function () { state.orb.count++; } },
    { id: 'orbd', w: 'orb', rar: 0, name: 'Orbes incandescentes', desc: '+40% dano dos orbes', max: 6, req: 'orb', apply: function () { state.orb.dmg *= 1.4; } },
    { id: 'chain', w: 'chain', rar: 2, name: 'Cadeia de raios', desc: 'NOVO: raio que pula entre inimigos', max: 1, min: 5, apply: function () { state.chain.unlocked = true; } },
    { id: 'chaind', w: 'chain', rar: 0, name: 'Alta voltagem', desc: '+40% dano da cadeia', max: 6, req: 'chain', apply: function () { state.chain.dmg *= 1.4; } },
    { id: 'chainr', w: 'chain', rar: 0, name: 'Curto-circuito', desc: '-13% recarga da cadeia', max: 6, req: 'chain', apply: function () { state.chain.cdMax *= 0.87; } },
    { id: 'chainj', w: 'chain', rar: 1, name: 'Pulos extras', desc: '+1 pulo da cadeia', max: 4, req: 'chain', apply: function () { state.chain.jumps++; } },
    { id: 'nova', w: 'nova', rar: 2, name: 'Nova arcana', desc: 'NOVO: explosão periódica ao seu redor', max: 1, min: 6, apply: function () { state.nova.unlocked = true; } },
    { id: 'novad', w: 'nova', rar: 0, name: 'Nova furiosa', desc: '+40% dano da nova', max: 6, req: 'nova', apply: function () { state.nova.dmg *= 1.4; } },
    { id: 'novar', w: 'nova', rar: 0, name: 'Nova ansiosa', desc: '-13% recarga da nova', max: 6, req: 'nova', apply: function () { state.nova.cdMax *= 0.87; } },
    { id: 'novas', w: 'nova', rar: 1, name: 'Nova larga', desc: '+25% raio da nova', max: 4, req: 'nova', apply: function () { state.nova.radius *= 1.25; } },
    { id: 'rail', w: 'rail', rar: 2, name: 'Feixe perfurante', desc: 'NOVO: feixe que atravessa a horda', max: 1, min: 7, apply: function () { state.rail.unlocked = true; } },
    { id: 'raild', w: 'rail', rar: 0, name: 'Feixe quente', desc: '+40% dano do feixe', max: 6, req: 'rail', apply: function () { state.rail.dmg *= 1.4; } },
    { id: 'railr', w: 'rail', rar: 0, name: 'Feixe apressado', desc: '-13% recarga do feixe', max: 6, req: 'rail', apply: function () { state.rail.cdMax *= 0.87; } },
    { id: 'miss', w: 'miss', rar: 2, name: 'Mísseis teleguiados', desc: 'NOVO: saraivada de mísseis no mais próximo', max: 1, min: 4, apply: function () { state.miss.unlocked = true; } },
    { id: 'missd', w: 'miss', rar: 0, name: 'Ogivas maiores', desc: '+40% dano dos mísseis', max: 6, req: 'miss', apply: function () { state.miss.dmg *= 1.4; } },
    { id: 'missr', w: 'miss', rar: 0, name: 'Lançador rápido', desc: '-13% recarga dos mísseis', max: 6, req: 'miss', apply: function () { state.miss.cdMax *= 0.87; } },
    { id: 'missc', w: 'miss', rar: 1, name: 'Salva extra', desc: '+1 míssil por salva', max: 3, req: 'miss', apply: function () { state.miss.count++; } },
    { id: 'frost', w: 'frost', rar: 2, name: 'Aura de gelo', desc: 'NOVO: aura que fere e desacelera tudo perto', max: 1, min: 5, apply: function () { state.frost.unlocked = true; } },
    { id: 'frostd', w: 'frost', rar: 0, name: 'Zero absoluto', desc: '+40% dano da aura', max: 6, req: 'frost', apply: function () { state.frost.dmg *= 1.4; } },
    { id: 'frostr', w: 'frost', rar: 1, name: 'Frente fria', desc: '+22% raio da aura', max: 4, req: 'frost', apply: function () { state.frost.radius *= 1.22; } },
    { id: 'frosts', w: 'frost', rar: 1, name: 'Gelo profundo', desc: 'lentidão mais forte', max: 3, req: 'frost', apply: function () { state.frost.slowMul = Math.max(0.15, state.frost.slowMul - 0.08); } },
    { id: 'mine', w: 'mine', rar: 2, name: 'Campo minado', desc: 'NOVO: planta minas que explodem por proximidade', max: 1, min: 6, apply: function () { state.mine.unlocked = true; } },
    { id: 'mined', w: 'mine', rar: 0, name: 'Pólvora extra', desc: '+40% dano das minas', max: 6, req: 'mine', apply: function () { state.mine.dmg *= 1.4; } },
    { id: 'miner', w: 'mine', rar: 0, name: 'Semeador rápido', desc: '-13% recarga das minas', max: 6, req: 'mine', apply: function () { state.mine.cdMax *= 0.87; } },
    { id: 'minec', w: 'mine', rar: 1, name: 'Minas sobrando', desc: '+1 mina por plantio', max: 3, req: 'mine', apply: function () { state.mine.count++; } },
    { id: 'rang', w: 'rang', rar: 2, name: 'Bumerangue', desc: 'NOVO: lâminas orbitando rápido ao seu redor', max: 1, min: 7, apply: function () { state.rang.unlocked = true; } },
    { id: 'rangd', w: 'rang', rar: 0, name: 'Lâmina afiada', desc: '+40% dano do bumerangue', max: 6, req: 'rang', apply: function () { state.rang.dmg *= 1.4; } },
    { id: 'rangr', w: 'rang', rar: 0, name: 'Vendaval', desc: '+20% velocidade de órbita', max: 5, req: 'rang', apply: function () { state.rang.rate *= 1.2; } },
    { id: 'rangc', w: 'rang', rar: 1, name: 'Lâmina gêmea', desc: '+1 bumerangue', max: 2, req: 'rang', apply: function () { state.rang.count++; } },
    { id: 'swift', w: 'util', rar: 0, name: 'Pés ligeiros', desc: '+10% velocidade de movimento', max: 5, apply: function () { state.player.speed *= 1.1; } },
    { id: 'vit', w: 'util', rar: 0, name: 'Vitalidade', desc: '+25 vida máxima e cura 25', max: 8, apply: function () { state.player.maxhp += 25; state.player.hp = Math.min(state.player.maxhp, state.player.hp + 25); } },
    { id: 'mag', w: 'util', rar: 0, name: 'Ímã maior', desc: '+45 alcance de coleta', max: 5, apply: function () { state.magnet += 45; } },
    { id: 'regen', w: 'util', rar: 0, name: 'Regeneração', desc: '+0.8 vida por segundo', max: 5, apply: function () { state.regen += 0.8; } },
    { id: 'crit', w: 'util', rar: 1, name: 'Mira fatal', desc: '+8% chance de crítico (dano ×2)', max: 5, apply: function () { state.crit += 0.08; } },
    { id: 'dash', w: 'util', rar: 0, name: 'Dash arcano', desc: '-18% recarga do dash', max: 3, apply: function () { state.dashCdMax *= 0.82; } },
    { id: 'greed', w: 'util', rar: 1, name: 'Olho gordo', desc: '+25% moedas', max: 5, apply: function () { state.greed++; } },
    { id: 'wis', w: 'util', rar: 1, name: 'Sabedoria', desc: '+20% experiência', max: 5, apply: function () { state.wis++; } },
    { id: 'thorns', w: 'util', rar: 1, name: 'Pele de ouriço', desc: 'reflete 30% do dano de contato', max: 3, apply: function () { state.thorns++; } },
    { id: 'exec', w: 'util', rar: 1, name: 'Carrasco', desc: '+35% dano contra elites e chefes', max: 3, min: 6, apply: function () { state.exec++; } },
    { id: 'wind', w: 'util', rar: 2, name: 'Segunda chance', desc: '1× por run: sobrevive à morte com 50% da vida', max: 1, min: 8, apply: function () { state.sw = true; } }
  ];
  var upStacks = {};
  var RAR_W = [100, 42, 20];
  function rollChoices() {
    var pool = [], i, u;
    for (i = 0; i < UPS.length; i++) {
      u = UPS[i];
      var st = upStacks[u.id] || 0;
      if (st >= u.max) continue;
      if (u.min && state.player.level < u.min) continue;
      if (u.req && !(upStacks[u.req] > 0)) continue;
      pool.push(u);
    }
    state.choices = [];
    while (state.choices.length < 3 && pool.length > 0) {
      var tot = 0, j;
      for (j = 0; j < pool.length; j++) tot += RAR_W[pool[j].rar];
      var r = rr() * tot;
      for (j = 0; j < pool.length; j++) {
        r -= RAR_W[pool[j].rar];
        if (r <= 0) break;
      }
      if (j >= pool.length) j = pool.length - 1;
      state.choices.push(pool[j]);
      pool.splice(j, 1);
    }
    if (state.choices.length > 0 && weaponsUnlocked() < 4) {
      var hasUn = false, ui;
      for (ui = 0; ui < state.choices.length; ui++) {
        if (isUnlockCard(state.choices[ui])) { hasUn = true; break; }
      }
      if (!hasUn) {
        var uns = pool.filter(isUnlockCard);
        if (uns.length > 0) {
          var pick = uns[(rr() * uns.length) | 0];
          pool.splice(pool.indexOf(pick), 1);
          var slot = (rr() * state.choices.length) | 0;
          pool.push(state.choices[slot]);
          state.choices[slot] = pick;
        }
      }
    }
    if (state.choices.length === 0) {
      state.player.hp = state.player.maxhp;
      state.levelPending = 0;
      closeLevelUp();
      toast('Build completa! Vida cheia.');
    }
  }
  function isUnlockCard(u) { return u.w !== 'util' && u.max === 1 && !u.req; }
  function weaponsUnlocked() {
    var n = 1, i;
    for (i = 0; i < ALL_WEAPONS.length; i++) if (ALL_WEAPONS[i] !== 'bolt' && weaponOwned(ALL_WEAPONS[i])) n++;
    return n;
  }
  function chooseUpgrade(i) {
    var u = state.choices[i];
    if (!u || state.levelPending <= 0) return false;
    u.apply();
    upStacks[u.id] = (upStacks[u.id] || 0) + 1;
    state.levelPending--;
    state.buildDirty = true;
    sfx.click();
    floater(state.player.x, state.player.y - 34, u.name + '!', u.rar === 2 ? '#ffb300' : '#2ecc40', 16);
    if (state.levelPending > 0) { rollChoices(); renderCards(); }
    else closeLevelUp();
    return true;
  }
  function openLevelUp() {
    rollChoices();
    if (state.choices.length === 0) return;
    if (el.lunum) el.lunum.textContent = state.player.level + '';
    renderCards();
    if (el.levelup) el.levelup.style.display = 'flex';
    sfx.level();
  }
  function closeLevelUp() {
    if (el.levelup) el.levelup.style.display = 'none';
  }
  function renderCards() {
    if (!el.cards) return;
    el.cards.innerHTML = '';
    for (var i = 0; i < state.choices.length; i++) {
      (function (u, idx) {
        var d = document.createElement('div');
        d.className = 'upcard r' + u.rar;
        var st = upStacks[u.id] || 0;
        d.innerHTML = '<b>' + u.name + '</b>' + u.desc +
          (st === 0 && u.max === 1 ? '<br><span class="new">NOVO!</span>' : '<br><span style="color:#777">nv ' + (st + 1) + '/' + u.max + '</span>') +
          '<br><span class="key">' + (idx + 1) + '</span>';
        d.addEventListener('click', function () { chooseUpgrade(idx); });
        el.cards.appendChild(d);
      })(state.choices[i], i);
    }
  }

  // ---------- update ----------
  function updatePlayer(dt) {
    var p = state.player;
    var mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    var l = Math.sqrt(mx * mx + my * my);
    p.moving = l > 0.01;
    if (p.moving) {
      mx /= l; my /= l;
      p.face = Math.atan2(my, mx);
      p.walkT += dt * 11;
    }
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += p.dashX * p.speed * 3.2 * dt;
      p.y += p.dashY * p.speed * 3.2 * dt;
      state.ghosts.push({ x: p.x, y: p.y, t: 0.3 });
      if (state.ghosts.length > 12) state.ghosts.shift();
    } else if (p.moving) {
      p.x += mx * p.speed * dt;
      p.y += my * p.speed * dt;
    }
    p.x = clamp(p.x, 24, WORLD.w - 24);
    p.y = clamp(p.y, 24, WORLD.h - 24);
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (state.regen > 0 && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + state.regen * dt);
    var tgt = nearestEnemy(p.x, p.y, 720);
    if (tgt) {
      p.aim = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      p.aimX = Math.cos(p.aim); p.aimY = Math.sin(p.aim);
    } else if (p.moving) { p.aim = p.face; p.aimX = Math.cos(p.face); p.aimY = Math.sin(p.face); }
  }
  function tryDash() {
    var p = state.player;
    if (!p || state.over || p.dashCd > 0 || p.dashT > 0) return;
    p.dashCd = state.dashCdMax;
    p.dashT = 0.18;
    p.inv = Math.max(p.inv, 0.28);
    var mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    var l = Math.sqrt(mx * mx + my * my);
    if (l > 0.01) { p.dashX = mx / l; p.dashY = my / l; }
    else { p.dashX = Math.cos(p.face); p.dashY = Math.sin(p.face); }
    sfx.dash();
  }
  function hurtPlayer(dmg, kx, ky, from) {
    var p = state.player;
    if (p.inv > 0 || p.dashT > 0 || state.over) return;
    if (state.dodge > 0 && rr() < state.dodge) {
      floater(p.x, p.y - 30, 'ESQUIVA!', '#b8c4d8', 14);
      return;
    }
    dmg = Math.max(1, Math.round(dmg - state.armor));
    if (from && state.thorns > 0 && from.hp > 0) {
      damageEnemy(from, dmg * 0.3 * state.thorns, 0, 0, false);
    }
    p.hp -= dmg;
    p.inv = 0.9;
    state.hurtFlash = 0.5;
    addShake(0.3);
    sfx.hurt();
    burst(p.x, p.y, 10, '#e63946', 240, 0.4, 4);
    if (kx !== undefined) {
      p.x = clamp(p.x + kx, 24, WORLD.w - 24);
      p.y = clamp(p.y + ky, 24, WORLD.h - 24);
    }
    if (p.hp > 0) return;
    if (state.sw && !state.swUsed) {
      state.swUsed = true;
      p.hp = Math.round(p.maxhp * 0.5);
      p.inv = 2;
      banner('SEGUNDA CHANCE!');
      sfx.wind();
      var i, e;
      for (i = state.enemies.length - 1; i >= 0; i--) {
        e = state.enemies[i];
        if (e.spawnT > 0) continue;
        if (d2(p.x, p.y, e.x, e.y) < 280 * 280) {
          var dx = e.x - p.x, dy = e.y - p.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
          damageEnemy(e, 120 * dmgMul(), (dx / dl) * 500, (dy / dl) * 500, false);
        }
      }
      state.rings.push({ x: p.x, y: p.y, r: 280, t: 0.5 });
      addShake(0.6);
      return;
    }
    p.hp = 0;
    gameOver();
  }
  function updateWeapons(dt) {
    var B = state.bolt;
    B.cd -= dt;
    if (B.cd <= 0) { B.cd = fireBolt() ? 1 / B.rate : 0.25; }
    var M = state.meteor;
    if (M.unlocked) {
      M.cd -= dt;
      if (M.cd <= 0) { M.cd = callMeteor() ? M.cdMax : 0.5; }
    }
    if (state.orb.unlocked || state.orb.count > 0) state.orb.angle += 2.5 * dt;
    var C = state.chain;
    if (C.unlocked) {
      C.cd -= dt;
      if (C.cd <= 0) { C.cd = fireChain() ? C.cdMax : 0.3; }
    }
    var N = state.nova;
    if (N.unlocked) {
      N.cd -= dt;
      if (N.cd <= 0) { N.cd = fireNova() ? N.cdMax : 0.4; }
    }
    var R = state.rail;
    if (R.unlocked) {
      R.cd -= dt;
      if (R.cd <= 0) { R.cd = fireRail() ? R.cdMax : 0.3; }
    }
    var MI = state.miss;
    if (MI.unlocked) {
      MI.cd -= dt;
      if (MI.cd <= 0) { MI.cd = fireMiss() ? MI.cdMax : 0.3; }
    }
    var F = state.frost;
    if (F.unlocked) {
      F.tick -= dt;
      if (F.tick <= 0) { F.tick = F.cdMax; frostTick(); }
    }
    var MN = state.mine;
    if (MN.unlocked) {
      MN.cd -= dt;
      if (MN.cd <= 0) { MN.cd = layMine() ? MN.cdMax : 0.5; }
    }
    if (state.rang.unlocked) state.rang.angle += state.rang.rate * dt;
    updateMines(dt);
    updateRang();
  }
  function updateShots(dt) {
    var i, j, s, e;
    for (i = state.shots.length - 1; i >= 0; i--) {
      s = state.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.kind === 'miss' && rr() < dt * 30) {
        state.parts.push({ x: s.x, y: s.y, vx: -s.vx * 0.08, vy: -s.vy * 0.08, t: 0, life: 0.35, r: 3, color: '#aaa' });
        if (state.parts.length > MAXP) state.parts.shift();
      }
      var dead = s.life <= 0 || s.x < 0 || s.y < 0 || s.x > WORLD.w || s.y > WORLD.h;
      if (!dead) {
        for (j = 0; j < state.enemies.length; j++) {
          e = state.enemies[j];
          if (e.spawnT > 0 || s.hit === e) continue;
          var r2 = e.r + 6;
          if (d2(s.x, s.y, e.x, e.y) < r2 * r2) {
            var dl = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
            damageEnemy(e, s.dmg, (s.vx / dl) * 120, (s.vy / dl) * 120, s.crit);
            burst(s.x, s.y, 4, s.kind === 'miss' ? '#ff6b35' : '#ffb300', 160, 0.3, 3);
            if (s.aoe > 0) { explodeMiss(s); dead = true; }
            else if (s.pierce > 0) { s.pierce--; s.hit = e; }
            else dead = true;
            break;
          }
        }
      }
      if (dead) state.shots.splice(i, 1);
    }
    var p = state.player;
    for (i = state.eshots.length - 1; i >= 0; i--) {
      s = state.eshots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      var gone = s.life <= 0 || s.x < 0 || s.y < 0 || s.x > WORLD.w || s.y > WORLD.h;
      if (!gone) {
        var pr = s.r + p.r - 4;
        if (d2(s.x, s.y, p.x, p.y) < pr * pr) {
          gone = true;
          hurtPlayer(s.dmg, 0, 0, null);
          if (state.over) return;
        }
      }
      if (gone) state.eshots.splice(i, 1);
    }
  }
  function bossPattern(e, dt) {
    var p = state.player;
    var haste = (e.enrage && e.hp < e.maxhp * 0.3) ? 1.6 : 1;
    var i, k;
    for (i = 0; i < e.patterns.length; i++) {
      e.patT[i] -= dt * haste;
      if (e.patT[i] > 0) continue;
      var pt = e.patterns[i];
      e.patT[i] = pt.every;
      if (pt.k === 'radial' || pt.k === 'spiral') {
        var n = pt.k === 'radial' ? pt.n : pt.arms;
        for (k = 0; k < n; k++) {
          spitGlob(e, e.spiralOff + (k / n) * TAU, pt.spd);
        }
        e.spiralOff += pt.k === 'spiral' ? 0.55 : 0.2;
        sfx.spit();
      } else if (pt.k === 'spread') {
        var base = Math.atan2(p.y - e.y, p.x - e.x);
        for (k = 0; k < pt.n; k++) {
          spitGlob(e, base + (k - (pt.n - 1) / 2) * 0.22, pt.spd);
        }
        sfx.spit();
      } else if (pt.k === 'summon') {
        if (state.enemies.length < MAXE - pt.n) {
          for (k = 0; k < pt.n; k++) {
            var a = rr() * TAU;
            spawnEnemy(pt.type, clamp(e.x + Math.cos(a) * 80, 30, WORLD.w - 30), clamp(e.y + Math.sin(a) * 80, 30, WORLD.h - 30));
          }
        }
      } else if (pt.k === 'charge') {
        if (e.mode === 'chase') { e.mode = 'teleB'; e.modeT = 0.7; }
      } else if (pt.k === 'blink') {
        burst(e.x, e.y, 16, '#5b6fd6', 240, 0.4, 5);
        var ba = rr() * TAU;
        e.x = clamp(p.x + Math.cos(ba) * pt.dist, 40, WORLD.w - 40);
        e.y = clamp(p.y + Math.sin(ba) * pt.dist, 40, WORLD.h - 40);
        burst(e.x, e.y, 16, '#5b6fd6', 240, 0.4, 5);
        for (k = 0; k < 8; k++) spitGlob(e, (k / 8) * TAU, 200);
      }
    }
  }
  function updateEnemies(dt) {
    var p = state.player, i, j, e;
    for (i = state.enemies.length - 1; i >= 0; i--) {
      e = state.enemies[i];
      e.t += dt;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.orbT > 0) e.orbT -= dt;
      if (e.rangT > 0) e.rangT -= dt;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= e.burnDps * dt * emul(e) * (1 + state.allDmg);
        if (rr() < dt * 8) burst(e.x, e.y, 1, '#ff9f1c', 60, 0.3, 3);
        if (e.hp <= 0) { killEnemy(e); continue; }
      }
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      var dx = p.x - e.x, dy = p.y - e.y;
      var dl = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= dl; dy /= dl;
      var sp = e.speed * (e.slowT > 0 ? (e.slowMul || 0.5) : 1), mvx = dx, mvy = dy;
      if (e.boss) {
        bossPattern(e, dt);
        if (e.mode === 'teleB') {
          e.modeT -= dt;
          mvx = -dx * 0.2; mvy = -dy * 0.2;
          if (e.modeT <= 0) { e.mode = 'lungeB'; e.modeT = 0.6; e.lx = dx; e.ly = dy; addShake(0.2); }
        } else if (e.mode === 'lungeB') {
          e.modeT -= dt;
          mvx = e.lx; mvy = e.ly; sp *= 5;
          if (e.modeT <= 0) e.mode = 'chase';
        }
      } else if (e.type === 'slime') sp *= 0.4 + Math.abs(Math.sin(e.t * 5)) * 1.1;
      else if (e.type === 'bat' || e.type === 'ghost' || e.type === 'imp') {
        var w = Math.sin(e.t * 4 + e.weave) * 0.7;
        mvx = dx - dy * w; mvy = dy + dx * w;
        var nl = Math.sqrt(mvx * mvx + mvy * mvy) || 1;
        mvx /= nl; mvy /= nl;
      } else if (e.type === 'shroom') {
        var w2 = Math.sin(e.t * 2.2 + e.weave) * 0.4;
        mvx = dx - dy * w2; mvy = dy + dx * w2;
        var nl2 = Math.sqrt(mvx * mvx + mvy * mvy) || 1;
        mvx /= nl2; mvy /= nl2;
      } else if (e.type === 'wasp') {
        e.modeT -= dt;
        if (e.mode === 'chase') {
          if (dl < 300) { e.mode = 'tele'; e.modeT = 0.5; }
        } else if (e.mode === 'tele') {
          mvx = -dx * 0.3; mvy = -dy * 0.3;
          if (e.modeT <= 0) { e.mode = 'lunge'; e.modeT = 0.45; e.lx = dx; e.ly = dy; }
        } else if (e.mode === 'lunge') {
          mvx = e.lx; mvy = e.ly; sp *= 3.4;
          if (e.modeT <= 0) { e.mode = 'cool'; e.modeT = 1.1; }
        } else {
          mvx = dx * 0.4; mvy = dy * 0.4;
          if (e.modeT <= 0) e.mode = 'chase';
        }
      } else if (e.type === 'spitter') {
        if (dl > 390) { mvx = dx; mvy = dy; }
        else if (dl < 270) { mvx = -dx; mvy = -dy; }
        else {
          var sw = Math.sin(e.t * 1.8 + e.weave);
          mvx = -dy * sw; mvy = dx * sw;
        }
        e.fireT -= dt;
        if (e.fireT <= 0 && dl < 660) {
          e.fireT = 2.6;
          spitGlob(e, Math.atan2(dy, dx), 250);
          sfx.spit();
        }
      } else if (e.type === 'wisp') {
        e.modeT -= dt;
        if (e.mode === 'chase') { e.mode = 'orbit'; e.modeT = 2.2; }
        if (e.mode === 'orbit') {
          var dir = e.weave > Math.PI ? 1 : -1;
          mvx = -dy * dir + dx * 0.25; mvy = dx * dir + dy * 0.25;
          var ol = Math.sqrt(mvx * mvx + mvy * mvy) || 1;
          mvx /= ol; mvy /= ol;
          if (e.modeT <= 0) { e.mode = 'dive'; e.modeT = 0.9; }
        } else {
          mvx = dx; mvy = dy; sp *= 1.55;
          if (e.modeT <= 0) { e.mode = 'orbit'; e.modeT = 2.2; }
        }
      } else if (e.type === 'phantom') {
        e.blinkT -= dt;
        if (e.blinkT <= 0) {
          e.blinkT = 2.8;
          burst(e.x, e.y, 10, '#5b6fd6', 200, 0.35, 4);
          e.x = clamp(e.x + dx * Math.min(150, dl * 0.7), 20, WORLD.w - 20);
          e.y = clamp(e.y + dy * Math.min(150, dl * 0.7), 20, WORLD.h - 20);
          burst(e.x, e.y, 10, '#5b6fd6', 200, 0.35, 4);
        }
      }
      e.x += mvx * sp * dt + e.kbx * dt;
      e.y += mvy * sp * dt + e.kby * dt;
      e.kbx *= Math.exp(-8 * dt);
      e.kby *= Math.exp(-8 * dt);
      e.x = clamp(e.x, 20, WORLD.w - 20);
      e.y = clamp(e.y, 20, WORLD.h - 20);
      var cr = e.r + p.r - 2;
      if (d2(e.x, e.y, p.x, p.y) < cr * cr) {
        hurtPlayer(e.dmg, -dx * 26, -dy * 26, e);
        e.kbx -= dx * 160;
        e.kby -= dy * 160;
        if (state.over) return;
      }
    }
    for (i = 0; i < state.enemies.length; i++) {
      var a = state.enemies[i];
      if (a.spawnT > 0 || a.boss) continue;
      for (j = i + 1; j < state.enemies.length; j++) {
        var b = state.enemies[j];
        if (b.spawnT > 0 || b.boss) continue;
        var sx = b.x - a.x, sy = b.y - a.y;
        var want = a.r + b.r - 4;
        var dd = sx * sx + sy * sy;
        if (dd < want * want && dd > 0.01) {
          var d = Math.sqrt(dd), push = (want - d) / 2;
          sx /= d; sy /= d;
          a.x -= sx * push; a.y -= sy * push;
          b.x += sx * push; b.y += sy * push;
        }
      }
    }
  }
  function updateOrbs() {
    if (!state.orb.unlocked && state.orb.count <= 0) return;
    var p = state.player, O = state.orb, i, e;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.spawnT > 0 || e.orbT > 0) continue;
      for (var k = 0; k < O.count; k++) {
        var a = O.angle + (k / O.count) * TAU;
        var ox = p.x + Math.cos(a) * O.radius, oy = p.y + Math.sin(a) * O.radius;
        var r3 = e.r + 16;
        if (d2(ox, oy, e.x, e.y) < r3 * r3) {
          var crit = rr() < state.crit;
          damageEnemy(e, O.dmg * dmgMul() * (crit ? 2 : 1), 0, 0, crit);
          state.stats.orb++;
          e.orbT = 0.35;
          burst(ox, oy, 5, '#4da3ff', 180, 0.3, 3);
          break;
        }
      }
    }
  }
  function updateStrikes(dt) {
    var i, s;
    for (i = state.strikes.length - 1; i >= 0; i--) {
      s = state.strikes[i];
      s.t += dt;
      if (s.phase === 0 && s.t >= 0.9) { s.phase = 1; s.t = 0; }
      else if (s.phase === 1 && s.t >= 0.22) {
        explodeMeteor(s);
        state.strikes.splice(i, 1);
      }
    }
  }
  function updateGems(dt) {
    var p = state.player, i, g;
    for (i = state.gems.length - 1; i >= 0; i--) {
      g = state.gems[i];
      g.t += dt;
      var dd = d2(p.x, p.y, g.x, g.y);
      if (dd < state.magnet * state.magnet) {
        var d = Math.sqrt(dd) || 1;
        var pull = 760 * dt / d;
        g.x += (p.x - g.x) * Math.min(1, pull);
        g.y += (p.y - g.y) * Math.min(1, pull);
      }
      if (dd < 22 * 22) {
        if (g.heart) {
          p.hp = Math.min(p.maxhp, p.hp + 25);
          floater(p.x, p.y - 30, '+25', '#2ecc40', 16);
          sfx.heart();
        } else {
          p.xp += Math.round(g.v * (1 + state.wis * 0.2));
          if (state.gemComboT <= 0) state.gemCombo = 0;
          state.gemCombo++;
          state.gemComboT = 0.8;
          if (state.sndGem <= 0) { sfx.gem(state.gemCombo); state.sndGem = 0.05; }
          burst(g.x, g.y, 3, '#2ecc40', 120, 0.3, 3);
          while (p.xp >= p.xpnext) {
            p.xp -= p.xpnext;
            p.level++;
            p.xpnext = Math.round(6 + (p.level - 1) * 5);
            state.levelPending++;
          }
        }
        state.gems.splice(i, 1);
      }
    }
    if (state.gemComboT > 0) state.gemComboT -= dt;
  }
  function updatePortal(dt) {
    if (!state.portal) return;
    state.portal.t += dt;
    if (rr() < dt * 8) burst(state.portal.x + (rr() - 0.5) * 60, state.portal.y + (rr() - 0.5) * 20, 1, '#bfe9ff', 60, 0.5, 3);
    if (d2(state.player.x, state.player.y, state.portal.x, state.portal.y) < 48 * 48) nextStage();
  }
  function updateFx(dt) {
    var i, q;
    for (i = state.parts.length - 1; i >= 0; i--) {
      q = state.parts[i];
      q.t += dt;
      if (q.t >= q.life) { state.parts.splice(i, 1); continue; }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= Math.exp(-3 * dt);
      q.vy *= Math.exp(-3 * dt);
    }
    for (i = state.floats.length - 1; i >= 0; i--) {
      q = state.floats[i];
      q.t += dt;
      if (q.t >= q.life) { state.floats.splice(i, 1); continue; }
      q.y -= 44 * dt;
    }
    for (i = state.scorch.length - 1; i >= 0; i--) {
      state.scorch[i].t -= dt;
      if (state.scorch[i].t <= 0) state.scorch.splice(i, 1);
    }
    for (i = state.ghosts.length - 1; i >= 0; i--) {
      state.ghosts[i].t -= dt;
      if (state.ghosts[i].t <= 0) state.ghosts.splice(i, 1);
    }
    for (i = state.zaps.length - 1; i >= 0; i--) {
      state.zaps[i].t -= dt;
      if (state.zaps[i].t <= 0) state.zaps.splice(i, 1);
    }
    for (i = state.beams.length - 1; i >= 0; i--) {
      state.beams[i].t -= dt;
      if (state.beams[i].t <= 0) state.beams.splice(i, 1);
    }
    for (i = state.rings.length - 1; i >= 0; i--) {
      state.rings[i].t -= dt;
      if (state.rings[i].t <= 0) state.rings.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - 1.7 * dt);
    if (state.hurtFlash > 0) state.hurtFlash -= dt;
    state.sndShoot -= dt;
    state.sndPop -= dt;
    state.sndGem -= dt;
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0 && el.toast) el.toast.style.opacity = '0';
    }
    if (state.bannerT > 0) {
      state.bannerT -= dt;
      if (state.bannerT <= 0 && el.banner) el.banner.style.opacity = '0';
    }
  }

  function update(dt) {
    if (!state.started || state.over || state.won || state.paused || state.levelPending > 0) return;
    state.time += dt;
    state.stageT += dt;
    updatePlayer(dt);
    if (state.over) return;
    updateSpawns(dt);
    updateWeapons(dt);
    updateShots(dt);
    updateEnemies(dt);
    if (state.over) return;
    updateOrbs();
    updateStrikes(dt);
    updateGems(dt);
    updatePortal(dt);
    updateFx(dt);
    var vw = state.view.w, vh = state.view.h;
    state.cam.x = WORLD.w <= vw ? (WORLD.w - vw) / 2 : clamp(state.player.x - vw / 2, 0, WORLD.w - vw);
    state.cam.y = WORLD.h <= vh ? (WORLD.h - vh) / 2 : clamp(state.player.y - vh / 2, 0, WORLD.h - vh);
    if (state.shake > 0) {
      var s = state.shake * state.shake * 22;
      state.cam.x += (rr() - 0.5) * 2 * s;
      state.cam.y += (rr() - 0.5) * 2 * s;
    }
    if (state.levelPending > 0) openLevelUp();
    updateHUD();
  }

  // ---------- flow ----------
  function bankCoins() {
    if (state.runBanked) return;
    state.runBanked = true;
    meta.coins += state.runCoins;
    if (state.time > meta.best.time) meta.best.time = Math.floor(state.time);
    if (state.kills > meta.best.kills) meta.best.kills = state.kills;
    if (state.player.level > meta.best.level) meta.best.level = state.player.level;
    if (state.stage > meta.best.stage) meta.best.stage = state.stage;
    meta.stats.coins += state.runCoins;
    if (state.time > meta.stats.maxTime) meta.stats.maxTime = Math.floor(state.time);
    if (state.player.level > meta.stats.maxLevel) meta.stats.maxLevel = state.player.level;
    if (state.stage > meta.stats.maxStage) meta.stats.maxStage = state.stage;
    metaSave();
    checkMiles();
  }
  function favWeapon() {
    var names = [['bolt', 'Raio'], ['meteor', 'Meteoro'], ['orb', 'Orbe'], ['chain', 'Cadeia'], ['nova', 'Nova'], ['rail', 'Feixe'], ['miss', 'Mísseis'], ['frost', 'Gelo'], ['mine', 'Minas'], ['rang', 'Bumerangue']];
    var best = names[0], i;
    for (i = 1; i < names.length; i++) {
      if (state.stats[names[i][0]] > state.stats[best[0]]) best = names[i];
    }
    return best[1] + ' (' + state.stats[best[0]] + ')';
  }
  function gameOver() {
    state.over = true;
    bankCoins();
    sfx.over();
    addShake(0.7);
    burst(state.player.x, state.player.y, 40, '#4da3ff', 380, 0.9, 6);
    if (el.gostats) {
      el.gostats.innerHTML = 'fase <b>' + state.stage + '</b> · sobreviveu <b>' + fmtTime(state.time) + '</b><br>' +
        'abates <b>' + state.kills + '</b> · nível <b>' + state.player.level + '</b> · chefes <b>' + state.bossNum + '</b><br>' +
        'arma favorita <b>' + favWeapon() + '</b><br>' +
        'moedas desta run <b>+' + state.runCoins + '</b> (banco: ' + meta.coins + ')';
    }
    if (el.gobuild) el.gobuild.innerHTML = buildHTML();
    if (el.gameover) el.gameover.style.display = 'flex';
    hideRunUI();
  }
  function victory() {
    state.won = true;
    state.runCoins += 500;
    meta.stats.wins++;
    bankCoins();
    sfx.victory();
    if (el.vstats) {
      el.vstats.innerHTML = 'tempo <b>' + fmtTime(state.time) + '</b> · abates <b>' + state.kills + '</b> · nível <b>' + state.player.level + '</b><br>' +
        'bônus de vitória <b>+500</b> moedas (banco: ' + meta.coins + ')<br>' +
        'arma favorita <b>' + favWeapon() + '</b>';
    }
    if (el.victory) el.victory.style.display = 'flex';
    hideRunUI();
  }
  function hideRunUI() {
    if (el.hud) el.hud.style.display = 'none';
    if (el.build) el.build.style.display = 'none';
    if (el.chips) el.chips.style.display = 'none';
    if (el.mini) el.mini.style.display = 'none';
    if (el.bossbar) el.bossbar.style.display = 'none';
  }
  function showRunUI() {
    if (el.hud) el.hud.style.display = 'block';
    if (el.build) el.build.style.display = 'block';
    if (el.chips) el.chips.style.display = 'flex';
    if (el.mini) el.mini.style.display = 'block';
  }
  function startRun() {
    audio();
    try { if (AC && AC.state === 'suspended') AC.resume(); } catch (e) { /* silent */ }
    resetRun();
    upStacks = {};
    state.started = true;
    state.shopOpen = false;
    if (el.start) el.start.style.display = 'none';
    if (el.gameover) el.gameover.style.display = 'none';
    if (el.victory) el.victory.style.display = 'none';
    if (el.pause) el.pause.style.display = 'none';
    closeLevelUp();
    showRunUI();
    refreshBuild();
    updateHUD();
    var S = stageDef();
    banner('FASE 1 — ' + S.name.toUpperCase());
    toast('Sobreviva. O chefe chega em ' + fmtTime(S.time) + '.');
  }
  function nextStage() {
    state.stage++;
    state.stageT = 0;
    state.bossSpawned = false;
    state.stageWarned = false;
    state.portal = null;
    state.enemies.length = 0;
    state.eshots.length = 0;
    state.strikes.length = 0;
    var p = state.player;
    p.hp = Math.min(p.maxhp, p.hp + Math.round(p.maxhp * 0.4));
    p.inv = Math.max(p.inv, 2);
    p.x = WORLD.w / 2; p.y = WORLD.h / 2;
    applyTheme();
    meta.tree.points += 2;
    meta.wtree.points += 1;
    meta.stats.stages++;
    if (state.stage > meta.best.stage) meta.best.stage = state.stage;
    if (state.stage > meta.stats.maxStage) meta.stats.maxStage = state.stage;
    metaSave();
    checkMiles();
    var S = stageDef();
    banner('FASE ' + state.stage + ' — ' + S.name.toUpperCase());
    toast(S.sub + ' (+2 árvore, +1 arma)');
    sfx.portal();
    updateHUD();
  }
  function continueEndless() {
    state.endless = true;
    state.won = false;
    state.runBanked = false;
    if (el.victory) el.victory.style.display = 'none';
    nextStage();
    showRunUI();
  }
  function toShop() {
    bankCoins();
    state.started = false;
    state.paused = false;
    state.won = false;
    state.shopOpen = true;
    if (el.gameover) el.gameover.style.display = 'none';
    if (el.victory) el.victory.style.display = 'none';
    if (el.pause) el.pause.style.display = 'none';
    hideRunUI();
    renderBank();
    if (el.start) el.start.style.display = 'flex';
  }
  function quitToShop() {
    if (!state.started || state.over) return;
    toast('Run encerrada. Moedas bancadas: +' + state.runCoins);
    toShop();
  }
  function togglePause() {
    if (!state.started || state.over || state.won || state.levelPending > 0) return;
    state.paused = !state.paused;
    if (state.paused && el.pausebuild) el.pausebuild.innerHTML = buildHTML();
    if (el.pause) el.pause.style.display = state.paused ? 'flex' : 'none';
  }

  // ---------- HUD / menus ----------
  function weaponOwned(w) {
    if (w === 'bolt') return true;
    if (w === 'orb') return state.orb.unlocked || state.orb.count > 0;
    if (state[w]) return !!state[w].unlocked;
    return false;
  }
  function weaponLv(w) {
    var n = 0, i;
    for (i = 0; i < UPS.length; i++) if (UPS[i].w === w) n += upStacks[UPS[i].id] || 0;
    return n;
  }
  function buildHTML() {
    var out = [], i;
    for (i = 0; i < UPS.length; i++) {
      var st = upStacks[UPS[i].id] || 0;
      if (st > 0) out.push('<b>' + UPS[i].name + '</b> nv' + st);
    }
    return out.length > 0 ? out.join(' · ') : 'só o raio enferrujado';
  }
  function refreshBuild() {
    if (el.build) el.build.innerHTML = buildHTML();
    var i;
    for (i = 0; i < chips.length; i++) {
      var c = chips[i];
      if (c.w === 'dash') continue;
      var owned = weaponOwned(c.w);
      c.box.className = 'wchip' + (owned ? '' : ' locked');
      c.lv.textContent = owned ? 'Nv' + Math.max(1, weaponLv(c.w)) : '—';
    }
    state.buildDirty = false;
  }
  function updateHUD() {
    if (!el.hud || !state.player) return;
    var p = state.player;
    el.xpfill.style.width = clamp(100 * p.xp / p.xpnext, 0, 100) + '%';
    el.level.textContent = p.level + '';
    el.timer.textContent = fmtTime(state.time);
    el.hpfill.style.width = clamp(100 * p.hp / p.maxhp, 0, 100) + '%';
    if (el.hptext) el.hptext.textContent = Math.ceil(p.hp) + '/' + p.maxhp;
    el.kills.textContent = state.kills + '';
    el.coins.textContent = state.runCoins + ' ◉';
    el.threat.textContent = threat() + '';
    var S = stageDef();
    if (el.stage) {
      el.stage.textContent = 'F' + state.stage + ' ' + S.name + (state.bossSpawned ? ' — CHEFE!' : ' — chefe ' + fmtTime(Math.max(0, S.time - state.stageT)));
    }
    if (el.bossbar) {
      if (state.boss && state.boss.hp > 0) {
        el.bossbar.style.display = 'block';
        el.bossfill.style.width = clamp(100 * state.boss.hp / state.boss.maxhp, 0, 100) + '%';
      } else el.bossbar.style.display = 'none';
    }
    if (state.buildDirty) refreshBuild();
    var i;
    for (i = 0; i < chips.length; i++) {
      var c = chips[i], frac = 0;
      if (c.w === 'bolt') frac = state.bolt.cd * state.bolt.rate;
      else if (c.w === 'meteor') frac = state.meteor.cd / state.meteor.cdMax;
      else if (c.w === 'chain') frac = state.chain.cd / state.chain.cdMax;
      else if (c.w === 'nova') frac = state.nova.cd / state.nova.cdMax;
      else if (c.w === 'rail') frac = state.rail.cd / state.rail.cdMax;
      else if (c.w === 'miss') frac = state.miss.cd / state.miss.cdMax;
      else if (c.w === 'mine') frac = state.mine.cd / state.mine.cdMax;
      else if (c.w === 'dash') frac = p.dashCd / state.dashCdMax;
      c.cd.style.height = clamp(frac, 0, 1) * 100 + '%';
    }
    var d = chips[chips.length - 1];
    if (d && d.w === 'dash') d.lv.textContent = p.dashCd > 0 ? p.dashCd.toFixed(1) : 'OK';
    renderMinimap();
  }
  function renderMinimap() {
    if (!mm) return;
    var S = 132, k = S / WORLD.w, i, e;
    mm.setTransform(1, 0, 0, 1, 0, 0);
    mm.fillStyle = '#070b18';
    mm.fillRect(0, 0, S, S);
    mm.strokeStyle = 'rgba(255,60,60,0.8)';
    mm.lineWidth = 1;
    mm.strokeRect(1, 1, S - 2, S - 2);
    mm.fillStyle = '#2ecc40';
    for (i = 0; i < state.gems.length; i++) {
      mm.fillRect(state.gems[i].x * k - 1, state.gems[i].y * k - 1, 2, 2);
    }
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.boss) {
        mm.fillStyle = '#fff';
        mm.fillRect(e.x * k - 3, e.y * k - 3, 6, 6);
      } else if (e.elite) {
        mm.fillStyle = '#ffd700';
        mm.fillRect(e.x * k - 2, e.y * k - 2, 4, 4);
      } else {
        mm.fillStyle = '#e63946';
        mm.fillRect(e.x * k - 1, e.y * k - 1, 2, 2);
      }
    }
    if (state.portal && ((state.time * 4) | 0) % 2 === 0) {
      mm.fillStyle = '#bfe9ff';
      mm.fillRect(state.portal.x * k - 3, state.portal.y * k - 3, 6, 6);
    }
    if (state.player) {
      mm.fillStyle = '#fff';
      mm.beginPath();
      mm.arc(state.player.x * k, state.player.y * k, 3, 0, TAU);
      mm.fill();
    }
  }
  function renderBank() {
    if (!el.bank) return;
    var mage = window.MetaData ? window.MetaData.mageById(meta.mage) : null;
    var art = meta.art && window.MetaData ? window.MetaData.artById(meta.art) : null;
    el.bank.innerHTML = 'banco: <b>' + meta.coins + ' ◉</b> · pontos: árvore <b>' + meta.tree.points + '</b> · arma <b>' + meta.wtree.points + '</b><br>' +
      'recorde: <b>' + fmtTime(meta.best.time) + '</b> · fase <b>' + meta.best.stage + '/10</b> · mago: <b>' + (mage ? mage.name : '?') + '</b>' +
      (art ? ' · artefato: <b>' + art.name + '</b>' : '');
    buildMageRow();
    buildArtRow();
  }
  function buildMageRow() {
    if (!el.magerow || !window.MetaData) return;
    el.magerow.innerHTML = '';
    window.MetaData.mages.forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'pick' + (meta.mage === m.id ? ' on' : '');
      b.textContent = m.name;
      b.title = m.desc;
      b.addEventListener('click', function () {
        meta.mage = m.id;
        metaSave();
        sfx.click();
        renderBank();
      });
      el.magerow.appendChild(b);
    });
  }
  function buildArtRow() {
    if (!el.artrow || !window.MetaData) return;
    el.artrow.innerHTML = '';
    var none = document.createElement('button');
    none.className = 'pick' + (!meta.art ? ' on' : '');
    none.textContent = 'nenhum';
    none.addEventListener('click', function () {
      meta.art = null;
      metaSave();
      sfx.click();
      renderBank();
    });
    el.artrow.appendChild(none);
    window.MetaData.artifacts.forEach(function (a) {
      var un = !!meta.artUnlocked[a.id];
      var b = document.createElement('button');
      b.className = 'pick' + (meta.art === a.id ? ' on' : '') + (un ? '' : ' lock');
      b.textContent = un ? a.name : '? ' + a.mile.text;
      b.title = un ? a.desc : 'desbloqueia: ' + a.mile.text;
      if (un) b.addEventListener('click', function () {
        meta.art = a.id;
        metaSave();
        sfx.click();
        renderBank();
      });
      el.artrow.appendChild(b);
    });
  }

  // ---------- render ----------
  function drawEyes(g, x, y, r, dx, dy, angry) {
    var dl = Math.sqrt(dx * dx + dy * dy) || 1;
    var px = (dx / dl) * r * 0.35, py = (dy / dl) * r * 0.35;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x - r * 0.55, y, r * 0.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + r * 0.55, y, r * 0.5, 0, TAU); g.fill();
    g.fillStyle = '#14141c';
    g.beginPath(); g.arc(x - r * 0.55 + px, y + py, r * 0.24, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + r * 0.55 + px, y + py, r * 0.24, 0, TAU); g.fill();
    if (angry) {
      g.strokeStyle = '#14141c';
      g.lineWidth = Math.max(2, r * 0.14);
      g.beginPath();
      g.moveTo(x - r * 1.05, y - r * 0.75);
      g.lineTo(x - r * 0.1, y - r * 0.35);
      g.moveTo(x + r * 1.05, y - r * 0.75);
      g.lineTo(x + r * 0.1, y - r * 0.35);
      g.stroke();
    }
  }
  function drawCrown(g, x, y, r) {
    g.fillStyle = '#ffd700';
    g.beginPath();
    g.moveTo(x - r * 0.7, y);
    g.lineTo(x - r * 0.7, y - r * 0.55);
    g.lineTo(x - r * 0.35, y - r * 0.25);
    g.lineTo(x, y - r * 0.65);
    g.lineTo(x + r * 0.35, y - r * 0.25);
    g.lineTo(x + r * 0.7, y - r * 0.55);
    g.lineTo(x + r * 0.7, y);
    g.closePath();
    g.fill();
  }
  function drawSlimeBody(g, e, base) {
    var sq = 1 + Math.sin(e.t * 5) * 0.14;
    var r = e.r;
    g.fillStyle = base;
    g.beginPath(); g.ellipse(e.x, e.y, r * sq, r / sq, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(e.x - r * 0.35, e.y - r * 0.4, r * 0.28, r * 0.18, -0.5, 0, TAU); g.fill();
  }
  function drawEnemy(g, e) {
    var p = state.player;
    var alpha = e.spawnT > 0 ? 1 - e.spawnT / 0.7 : 1;
    if (e.spawnT > 0) {
      var pr = e.r * (1.6 - e.spawnT);
      g.strokeStyle = 'rgba(255,60,60,' + (0.3 + 0.5 * e.spawnT) + ')';
      g.lineWidth = 3;
      g.beginPath(); g.arc(e.x, e.y, pr, 0, TAU); g.stroke();
    }
    if (e.type === 'phantom' && e.blinkT < 0.4) alpha *= 0.4;
    g.globalAlpha = alpha * (e.type === 'ghost' ? 0.6 + 0.3 * Math.sin(e.t * 6) : 1);
    var dx = p.x - e.x, dy = p.y - e.y;
    var r = e.r;
    var jx = 0, jy = 0;
    if ((e.type === 'wasp' && e.mode === 'tele') || (e.boss && e.mode === 'teleB')) { jx = (rr() - 0.5) * 5; jy = (rr() - 0.5) * 5; }
    var ex = e.x + jx, ey = e.y + jy;
    if (e.type === 'slime') {
      drawSlimeBody(g, e, '#2ecc40');
      drawEyes(g, ex, ey - r * 0.1, r * 0.55, dx, dy, false);
      g.strokeStyle = '#0a5c14';
      g.lineWidth = 2;
      g.beginPath(); g.arc(ex, ey + r * 0.25, r * 0.35, 0.3, Math.PI - 0.3); g.stroke();
    } else if (e.type === 'bat') {
      var flap = Math.sin(e.t * 14) * 0.9;
      g.fillStyle = '#8e44ad';
      [-1, 1].forEach(function (s) {
        g.save();
        g.translate(ex, ey);
        g.rotate(s * (0.5 + flap * 0.5));
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(s * r * 1.6, -r * 0.6, s * r * 1.9, r * 0.5);
        g.quadraticCurveTo(s * r * 1.1, r * 0.3, 0, r * 0.5);
        g.closePath();
        g.fill();
        g.restore();
      });
      g.fillStyle = '#9b59b6';
      g.beginPath(); g.arc(ex, ey, r * 0.8, 0, TAU); g.fill();
      g.fillStyle = '#8e44ad';
      [[-0.45, -0.7], [0.45, -0.7]].forEach(function (o) {
        g.beginPath();
        g.moveTo(ex + o[0] * r - r * 0.2, ey + o[1] * r + r * 0.3);
        g.lineTo(ex + o[0] * r, ey + o[1] * r - r * 0.3);
        g.lineTo(ex + o[0] * r + r * 0.2, ey + o[1] * r + r * 0.3);
        g.closePath();
        g.fill();
      });
      g.fillStyle = '#ff3b3b';
      g.beginPath(); g.arc(ex - r * 0.3, ey - r * 0.1, r * 0.18, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.3, ey - r * 0.1, r * 0.18, 0, TAU); g.fill();
    } else if (e.type === 'wasp') {
      g.fillStyle = 'rgba(200,220,255,0.6)';
      var wf = Math.sin(e.t * 22) * r * 0.7;
      g.beginPath(); g.ellipse(ex - r * 0.5, ey - r * 0.7, r * 0.5, r * 0.25 + Math.abs(wf) * 0.4, -0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(ex + r * 0.5, ey - r * 0.7, r * 0.5, r * 0.25 + Math.abs(wf) * 0.4, 0.5, 0, TAU); g.fill();
      g.fillStyle = '#f1c40f';
      g.beginPath(); g.ellipse(ex, ey, r * 0.75, r, 0, 0, TAU); g.fill();
      g.fillStyle = '#14141c';
      g.fillRect(ex - r * 0.7, ey - r * 0.25, r * 1.4, r * 0.22);
      g.fillRect(ex - r * 0.6, ey + r * 0.25, r * 1.2, r * 0.22);
      g.beginPath();
      g.moveTo(ex - r * 0.3, ey + r * 0.9);
      g.lineTo(ex + r * 0.3, ey + r * 0.9);
      g.lineTo(ex, ey + r * 1.4);
      g.closePath(); g.fill();
      drawEyes(g, ex, ey - r * 0.45, r * 0.5, dx, dy, true);
      if (e.mode === 'tele') {
        g.fillStyle = '#ff3b3b';
        g.font = 'bold ' + Math.round(r * 1.4) + 'px Verdana,sans-serif';
        g.textAlign = 'center';
        g.fillText('!', ex, ey - r * 1.3);
      }
    } else if (e.type === 'skull') {
      g.fillStyle = '#ecf0f1';
      g.beginPath(); g.arc(ex, ey - r * 0.15, r * 0.95, 0, TAU); g.fill();
      g.fillRect(ex - r * 0.55, ey + r * 0.35, r * 1.1, r * 0.5);
      g.fillStyle = '#14141c';
      g.beginPath(); g.arc(ex - r * 0.35, ey - r * 0.2, r * 0.28, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.35, ey - r * 0.2, r * 0.28, 0, TAU); g.fill();
      g.fillRect(ex - r * 0.12, ey + r * 0.25, r * 0.24, r * 0.3);
      g.strokeStyle = '#14141c';
      g.lineWidth = Math.max(2, r * 0.12);
      g.beginPath();
      g.moveTo(ex - r * 0.7, ey - r * 0.75);
      g.lineTo(ex - r * 0.05, ey - r * 0.4);
      g.moveTo(ex + r * 0.7, ey - r * 0.75);
      g.lineTo(ex + r * 0.05, ey - r * 0.4);
      g.stroke();
      var dl = Math.sqrt(dx * dx + dy * dy) || 1;
      g.fillStyle = '#ff3b3b';
      g.beginPath(); g.arc(ex - r * 0.35 + (dx / dl) * 3, ey - r * 0.2 + (dy / dl) * 3, r * 0.1, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.35 + (dx / dl) * 3, ey - r * 0.2 + (dy / dl) * 3, r * 0.1, 0, TAU); g.fill();
    } else if (e.type === 'shroom') {
      g.fillStyle = '#f5f0e1';
      g.fillRect(ex - r * 0.4, ey - r * 0.2, r * 0.8, r * 1.1);
      g.fillStyle = '#e74c3c';
      g.beginPath(); g.arc(ex, ey - r * 0.2, r, Math.PI, 0); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ex - r * 0.45, ey - r * 0.65, r * 0.16, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.3, ey - r * 0.85, r * 0.13, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.05, ey - r * 0.45, r * 0.11, 0, TAU); g.fill();
      drawEyes(g, ex, ey + r * 0.35, r * 0.5, dx, dy, true);
    } else if (e.type === 'spitter') {
      g.fillStyle = '#52be57';
      g.beginPath(); g.ellipse(ex, ey, r, r * 0.9, 0, 0, TAU); g.fill();
      g.fillStyle = '#2e7d32';
      var ma = Math.atan2(dy, dx);
      g.beginPath(); g.arc(ex + Math.cos(ma) * r * 0.7, ey + Math.sin(ma) * r * 0.7, r * 0.4, 0, TAU); g.fill();
      g.fillStyle = '#0d3311';
      g.beginPath(); g.arc(ex + Math.cos(ma) * r * 0.75, ey + Math.sin(ma) * r * 0.75, r * 0.22, 0, TAU); g.fill();
      drawEyes(g, ex, ey - r * 0.45, r * 0.5, dx, dy, false);
    } else if (e.type === 'golem') {
      g.fillStyle = '#7f8c8d';
      g.beginPath();
      var n = 7, vi;
      for (vi = 0; vi < n; vi++) {
        var va = (vi / n) * TAU + 0.3;
        var vr2 = r * (0.9 + 0.15 * Math.sin(vi * 2.7));
        if (vi === 0) g.moveTo(ex + Math.cos(va) * vr2, ey + Math.sin(va) * vr2);
        else g.lineTo(ex + Math.cos(va) * vr2, ey + Math.sin(va) * vr2);
      }
      g.closePath(); g.fill();
      g.strokeStyle = '#4d5656';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#2ecc40';
      g.beginPath(); g.arc(ex - r * 0.4, ey + r * 0.45, r * 0.18, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.35, ey - r * 0.55, r * 0.13, 0, TAU); g.fill();
      g.fillStyle = '#ffe9a3';
      g.beginPath(); g.arc(ex - r * 0.3, ey - r * 0.1, r * 0.16, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.3, ey - r * 0.1, r * 0.16, 0, TAU); g.fill();
      g.strokeStyle = '#4d5656';
      g.lineWidth = Math.max(3, r * 0.14);
      g.beginPath();
      g.moveTo(ex - r * 0.65, ey - r * 0.6);
      g.lineTo(ex - r * 0.05, ey - r * 0.3);
      g.moveTo(ex + r * 0.65, ey - r * 0.6);
      g.lineTo(ex + r * 0.05, ey - r * 0.3);
      g.stroke();
    } else if (e.type === 'ghost') {
      g.fillStyle = '#e8f6ff';
      g.beginPath();
      g.arc(ex, ey - r * 0.2, r * 0.85, Math.PI, 0);
      var wob = Math.sin(e.t * 7) * r * 0.12;
      g.lineTo(ex + r * 0.85, ey + r * 0.6 + wob);
      g.quadraticCurveTo(ex + r * 0.4, ey + r * 0.35 - wob, ex, ey + r * 0.6 + wob);
      g.quadraticCurveTo(ex - r * 0.4, ey + r * 0.35 - wob, ex - r * 0.85, ey + r * 0.6 + wob);
      g.closePath();
      g.fill();
      g.fillStyle = '#14141c';
      g.beginPath(); g.ellipse(ex - r * 0.3, ey - r * 0.25, r * 0.18, r * 0.26, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(ex + r * 0.3, ey - r * 0.25, r * 0.18, r * 0.26, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(ex, ey + r * 0.3, r * 0.14, r * 0.2, 0, 0, TAU); g.fill();
    } else if (e.type === 'mama') {
      drawSlimeBody(g, e, '#27ae60');
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(ex - r * 0.3, ey + r * 0.25, r * 0.22, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.3, ey + r * 0.25, r * 0.22, 0, TAU); g.fill();
      g.fillStyle = '#14141c';
      g.beginPath(); g.arc(ex - r * 0.3, ey + r * 0.25, r * 0.1, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex + r * 0.3, ey + r * 0.25, r * 0.1, 0, TAU); g.fill();
      drawEyes(g, ex, ey - r * 0.35, r * 0.5, dx, dy, false);
    } else if (e.type === 'imp') {
      g.fillStyle = '#c0392b';
      g.beginPath(); g.arc(ex, ey, r, 0, TAU); g.fill();
      g.fillStyle = '#7b241c';
      g.beginPath();
      g.moveTo(ex - r * 0.6, ey - r * 0.6);
      g.lineTo(ex - r * 0.9, ey - r * 1.3);
      g.lineTo(ex - r * 0.2, ey - r * 0.8);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(ex + r * 0.6, ey - r * 0.6);
      g.lineTo(ex + r * 0.9, ey - r * 1.3);
      g.lineTo(ex + r * 0.2, ey - r * 0.8);
      g.closePath(); g.fill();
      drawEyes(g, ex, ey - r * 0.1, r * 0.6, dx, dy, true);
      g.strokeStyle = '#7b241c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(ex - r * 0.3, ey + r * 0.5);
      g.lineTo(ex - r * 0.1, ey + r * 0.3);
      g.lineTo(ex + r * 0.1, ey + r * 0.5);
      g.lineTo(ex + r * 0.3, ey + r * 0.3);
      g.stroke();
    } else if (e.type === 'brute') {
      g.fillStyle = '#a0522d';
      g.beginPath();
      g.moveTo(ex - r, ey - r * 0.7);
      g.lineTo(ex + r, ey - r * 0.7);
      g.lineTo(ex + r * 0.8, ey + r);
      g.lineTo(ex - r * 0.8, ey + r);
      g.closePath(); g.fill();
      g.strokeStyle = '#5d2f16';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#7b3f16';
      g.fillRect(ex - r * 1.15, ey - r * 0.4, r * 0.4, r * 1.1);
      g.fillRect(ex + r * 0.75, ey - r * 0.4, r * 0.4, r * 1.1);
      drawEyes(g, ex, ey - r * 0.25, r * 0.45, dx, dy, true);
      g.strokeStyle = '#3e1f0c';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(ex - r * 0.4, ey + r * 0.45);
      g.lineTo(ex + r * 0.4, ey + r * 0.45);
      g.stroke();
    } else if (e.type === 'wisp') {
      var glow = 0.5 + 0.3 * Math.sin(e.t * 8);
      g.fillStyle = 'rgba(159,212,232,' + glow * 0.4 + ')';
      g.beginPath(); g.arc(ex, ey, r * 1.6, 0, TAU); g.fill();
      g.fillStyle = '#d8f2ff';
      g.beginPath(); g.arc(ex, ey, r * 0.8, 0, TAU); g.fill();
      g.fillStyle = '#1d4e89';
      var dl2 = Math.sqrt(dx * dx + dy * dy) || 1;
      g.beginPath(); g.arc(ex + (dx / dl2) * r * 0.3, ey + (dy / dl2) * r * 0.3, r * 0.35, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ex + (dx / dl2) * r * 0.3 - r * 0.1, ey + (dy / dl2) * r * 0.3 - r * 0.1, r * 0.12, 0, TAU); g.fill();
    } else if (e.type === 'phantom') {
      g.fillStyle = 'rgba(40,44,90,0.85)';
      g.beginPath();
      g.arc(ex, ey - r * 0.2, r * 0.85, Math.PI, 0);
      var wob2 = Math.sin(e.t * 9) * r * 0.15;
      g.lineTo(ex + r * 0.85, ey + r * 0.6 + wob2);
      g.quadraticCurveTo(ex, ey + r * 0.3 - wob2, ex - r * 0.85, ey + r * 0.6 + wob2);
      g.closePath();
      g.fill();
      g.strokeStyle = '#5b6fd6';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#cfd4ff';
      g.beginPath(); g.ellipse(ex - r * 0.3, ey - r * 0.25, r * 0.16, r * 0.24, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(ex + r * 0.3, ey - r * 0.25, r * 0.16, r * 0.24, 0, 0, TAU); g.fill();
    }
    if (e.tint) {
      g.globalAlpha = alpha * 0.35;
      g.fillStyle = e.tint;
      g.beginPath(); g.arc(e.x, e.y, r, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    if (e.hurt > 0) {
      g.globalAlpha = alpha * 0.7;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(e.x, e.y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    if (e.boss) {
      drawCrown(g, ex, ey - r - 4, r * 0.5);
      g.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.3 * Math.sin(e.t * 3)) + ')';
      g.lineWidth = 3;
      g.beginPath(); g.arc(ex, ey, r + 8, 0, TAU); g.stroke();
    } else if (e.elite) {
      drawCrown(g, ex, ey - r - 2, r * 0.55);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(ex - 22, ey - r - 16, 44, 5);
      g.fillStyle = '#e63946';
      g.fillRect(ex - 22, ey - r - 16, 44 * clamp(e.hp / e.maxhp, 0, 1), 5);
    }
  }
  function drawPlayer(g) {
    var p = state.player;
    if (!p || state.over) return;
    if (p.inv > 0 && p.dashT <= 0 && ((state.time * 14) | 0) % 2 === 0) return;
    var i;
    for (i = 0; i < state.ghosts.length; i++) {
      var gh = state.ghosts[i];
      g.globalAlpha = gh.t * 1.6;
      g.fillStyle = '#4da3ff';
      g.beginPath(); g.arc(gh.x, gh.y, p.r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    var bob = p.moving ? Math.abs(Math.sin(p.walkT)) * 2 : Math.sin(state.time * 2) * 1.5;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(p.x, p.y + p.r + 2, p.r * 0.8, 5, 0, 0, TAU); g.fill();
    g.fillStyle = state.cloak;
    g.beginPath();
    g.moveTo(p.x, p.y - p.r - 8 + bob);
    g.lineTo(p.x - p.r - 2, p.y + p.r + bob);
    g.lineTo(p.x + p.r + 2, p.y + p.r + bob);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffdbac';
    g.beginPath(); g.arc(p.x, p.y - 4 + bob, p.r * 0.62, 0, TAU); g.fill();
    g.fillStyle = state.cloak;
    g.beginPath();
    g.moveTo(p.x - p.r * 0.8, p.y - 8 + bob);
    g.lineTo(p.x + p.r * 0.2, p.y - p.r - 14 + bob);
    g.lineTo(p.x + p.r * 0.75, p.y - 6 + bob);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffd700';
    g.beginPath(); g.arc(p.x + p.r * 0.2, p.y - p.r - 13 + bob, 2.5, 0, TAU); g.fill();
    g.fillStyle = '#14141c';
    g.beginPath(); g.arc(p.x - 3 + p.aimX * 2.5, p.y - 4 + p.aimY * 2.5 + bob, 1.8, 0, TAU); g.fill();
    g.beginPath(); g.arc(p.x + 3 + p.aimX * 2.5, p.y - 4 + p.aimY * 2.5 + bob, 1.8, 0, TAU); g.fill();
    var sx = p.x + p.aimX * 16, sy = p.y + p.aimY * 16 + bob;
    g.strokeStyle = '#7a5230';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(p.x - p.aimX * 6, p.y - p.aimY * 6 + bob);
    g.lineTo(sx, sy);
    g.stroke();
    g.fillStyle = '#9fd4e8';
    g.beginPath(); g.arc(sx, sy, 4.5 + Math.sin(state.time * 8) * 1, 0, TAU); g.fill();
    if (state.sw && !state.swUsed) {
      g.strokeStyle = 'rgba(255,215,0,0.7)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, p.y + bob, p.r + 7 + Math.sin(state.time * 5) * 2, 0, TAU); g.stroke();
    }
  }
  function drawProp(g, pr) {
    var s = pr.s, x = pr.x, y = pr.y;
    if (pr.k === 'tree') {
      g.fillStyle = '#5d3a1a';
      g.fillRect(x - 3 * s, y - 6 * s, 6 * s, 16 * s);
      g.fillStyle = 'rgba(46,139,60,0.9)';
      g.beginPath(); g.arc(x, y - 14 * s, 13 * s, 0, TAU); g.fill();
    } else if (pr.k === 'pine') {
      g.fillStyle = '#5d3a1a';
      g.fillRect(x - 2 * s, y - 2 * s, 4 * s, 10 * s);
      g.fillStyle = 'rgba(30,100,50,0.9)';
      g.beginPath();
      g.moveTo(x, y - 26 * s);
      g.lineTo(x - 11 * s, y - 2 * s);
      g.lineTo(x + 11 * s, y - 2 * s);
      g.closePath(); g.fill();
    } else if (pr.k === 'rock') {
      g.fillStyle = 'rgba(130,135,145,0.85)';
      g.beginPath();
      g.moveTo(x - 12 * s, y + 4 * s);
      g.lineTo(x - 4 * s, y - 10 * s);
      g.lineTo(x + 8 * s, y - 6 * s);
      g.lineTo(x + 12 * s, y + 4 * s);
      g.closePath(); g.fill();
    } else if (pr.k === 'bones') {
      g.strokeStyle = 'rgba(220,215,200,0.8)';
      g.lineWidth = 3 * s;
      g.beginPath();
      g.moveTo(x - 10 * s, y - 6 * s); g.lineTo(x + 10 * s, y + 6 * s);
      g.moveTo(x - 10 * s, y + 6 * s); g.lineTo(x + 10 * s, y - 6 * s);
      g.stroke();
      g.fillStyle = 'rgba(220,215,200,0.85)';
      g.beginPath(); g.arc(x, y - 10 * s, 5 * s, 0, TAU); g.fill();
    } else if (pr.k === 'crystal') {
      g.fillStyle = 'rgba(77,200,200,0.85)';
      g.beginPath();
      g.moveTo(x, y - 20 * s);
      g.lineTo(x - 7 * s, y + 4 * s);
      g.lineTo(x + 7 * s, y + 4 * s);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(200,255,255,0.8)';
      g.beginPath();
      g.moveTo(x, y - 20 * s);
      g.lineTo(x - 3 * s, y + 4 * s);
      g.lineTo(x + 1 * s, y + 4 * s);
      g.closePath(); g.fill();
    } else if (pr.k === 'shroomD') {
      g.fillStyle = '#d8cfc0';
      g.fillRect(x - 3 * s, y - 8 * s, 6 * s, 12 * s);
      g.fillStyle = 'rgba(180,80,80,0.9)';
      g.beginPath(); g.arc(x, y - 8 * s, 9 * s, Math.PI, 0); g.closePath(); g.fill();
    } else if (pr.k === 'cactus') {
      g.fillStyle = 'rgba(60,140,70,0.9)';
      g.fillRect(x - 4 * s, y - 22 * s, 8 * s, 26 * s);
      g.fillRect(x - 12 * s, y - 16 * s, 6 * s, 12 * s);
      g.fillRect(x + 6 * s, y - 12 * s, 6 * s, 10 * s);
    } else if (pr.k === 'ice') {
      g.fillStyle = 'rgba(180,230,250,0.85)';
      g.beginPath();
      g.moveTo(x, y - 22 * s);
      g.lineTo(x - 8 * s, y + 4 * s);
      g.lineTo(x + 8 * s, y + 4 * s);
      g.closePath(); g.fill();
    } else if (pr.k === 'ember') {
      g.fillStyle = 'rgba(50,40,40,0.9)';
      g.beginPath(); g.ellipse(x, y, 12 * s, 7 * s, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,120,40,' + (0.6 + 0.3 * Math.sin(state.time * 3 + x)) + ')';
      g.beginPath(); g.arc(x - 3 * s, y - 2 * s, 3 * s, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + 4 * s, y, 2.5 * s, 0, TAU); g.fill();
    } else if (pr.k === 'pillar') {
      g.fillStyle = 'rgba(160,130,70,0.9)';
      g.fillRect(x - 6 * s, y - 26 * s, 12 * s, 30 * s);
      g.fillRect(x - 9 * s, y - 30 * s, 18 * s, 5 * s);
    }
  }

  function render() {
    if (!ctx) return;
    var v = state.view, g = ctx;
    var th = state.theme || { bg: '#0b1020', grid: 'rgba(120,150,220,0.13)', star: '#fff' };
    g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    g.fillStyle = th.bg;
    g.fillRect(0, 0, v.w, v.h);
    var cx = state.cam.x, cy = state.cam.y, i;
    g.fillStyle = th.star;
    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      var sx = st.x - cx, sy = st.y - cy;
      if (sx < -4 || sy < -4 || sx > v.w + 4 || sy > v.h + 4) continue;
      g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(state.time * st.tw + st.ph));
      g.fillRect(sx, sy, st.s, st.s);
    }
    g.globalAlpha = 1;
    g.strokeStyle = th.grid;
    g.lineWidth = 1;
    g.beginPath();
    var step = 130;
    var x0 = Math.floor(cx / step) * step, y0 = Math.floor(cy / step) * step, x, y;
    for (x = x0; x < cx + v.w + step; x += step) { g.moveTo(x - cx, 0); g.lineTo(x - cx, v.h); }
    for (y = y0; y < cy + v.h + step; y += step) { g.moveTo(0, y - cy); g.lineTo(v.w, y - cy); }
    g.stroke();
    g.strokeStyle = 'rgba(255,60,60,0.7)';
    g.lineWidth = 4;
    g.strokeRect(8 - cx, 8 - cy, WORLD.w - 16, WORLD.h - 16);
    if (!state.started) return;
    g.save();
    g.translate(-cx, -cy);
    for (i = 0; i < state.props.length; i++) drawProp(g, state.props[i]);
    for (i = 0; i < state.scorch.length; i++) {
      var sc = state.scorch[i];
      g.fillStyle = 'rgba(10,8,6,' + clamp(sc.t / 6, 0, 1) * 0.75 + ')';
      g.beginPath(); g.arc(sc.x, sc.y, sc.r * 0.9, 0, TAU); g.fill();
    }
    if (state.portal) {
      var po = state.portal;
      g.fillStyle = 'rgba(191,233,255,0.25)';
      g.fillRect(po.x - 24, po.y - 130, 48, 130);
      g.strokeStyle = '#bfe9ff';
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(po.x, po.y, 30 + Math.sin(po.t * 5) * 3, 12, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(191,233,255,0.6)';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(po.x, po.y - 100, 24, 10, 0, 0, TAU); g.stroke();
    }
    for (i = 0; i < state.gems.length; i++) {
      var gm = state.gems[i];
      var bob = Math.sin(gm.t * 4) * 3;
      if (gm.heart) {
        g.fillStyle = '#e63946';
        g.beginPath(); g.arc(gm.x - 4, gm.y - 2 + bob, 5, 0, TAU); g.fill();
        g.beginPath(); g.arc(gm.x + 4, gm.y - 2 + bob, 5, 0, TAU); g.fill();
        g.beginPath();
        g.moveTo(gm.x - 8.5, gm.y + bob);
        g.lineTo(gm.x + 8.5, gm.y + bob);
        g.lineTo(gm.x, gm.y + 9 + bob);
        g.closePath(); g.fill();
      } else {
        var big = gm.v >= 5;
        var s = (big ? 9 : 6) * (0.85 + 0.15 * Math.cos(gm.t * 5));
        g.fillStyle = big ? '#ffd700' : '#2ecc40';
        g.beginPath();
        g.moveTo(gm.x, gm.y - s + bob);
        g.lineTo(gm.x + s * 0.7, gm.y + bob);
        g.lineTo(gm.x, gm.y + s + bob);
        g.lineTo(gm.x - s * 0.7, gm.y + bob);
        g.closePath(); g.fill();
      }
    }
    for (i = 0; i < state.enemies.length; i++) drawEnemy(g, state.enemies[i]);
    var s2;
    for (i = 0; i < state.shots.length; i++) {
      s2 = state.shots[i];
      if (s2.kind === 'miss') {
        var ma = Math.atan2(s2.vy, s2.vx);
        g.save();
        g.translate(s2.x, s2.y);
        g.rotate(ma);
        g.fillStyle = s2.crit ? '#ffd700' : '#ff6b35';
        g.beginPath();
        g.moveTo(9, 0);
        g.lineTo(-4, -4);
        g.lineTo(-7, 0);
        g.lineTo(-4, 4);
        g.closePath(); g.fill();
        g.fillStyle = '#fff2cc';
        g.beginPath(); g.arc(1, 0, 2.4, 0, TAU); g.fill();
        g.restore();
        continue;
      }
      g.strokeStyle = s2.crit ? 'rgba(255,215,0,0.6)' : 'rgba(255,159,28,0.55)';
      g.lineWidth = s2.crit ? 5 : 4;
      g.beginPath();
      g.moveTo(s2.x - s2.vx * 0.03, s2.y - s2.vy * 0.03);
      g.lineTo(s2.x, s2.y);
      g.stroke();
      g.fillStyle = s2.crit ? '#ffd700' : '#ffcf6e';
      g.beginPath(); g.arc(s2.x, s2.y, s2.crit ? 6 : 4.5, 0, TAU); g.fill();
    }
    for (i = 0; i < state.eshots.length; i++) {
      s2 = state.eshots[i];
      g.fillStyle = s2.boss ? 'rgba(255,60,60,0.4)' : 'rgba(123,237,111,0.4)';
      g.beginPath(); g.arc(s2.x, s2.y, s2.r + 5, 0, TAU); g.fill();
      g.fillStyle = s2.boss ? '#ff3b3b' : '#7bed6f';
      g.beginPath(); g.arc(s2.x, s2.y, s2.r, 0, TAU); g.fill();
    }
    if (state.orb.unlocked || state.orb.count > 0) {
      var p = state.player, O = state.orb;
      for (i = 0; i < O.count; i++) {
        var a = O.angle + (i / O.count) * TAU;
        var ox = p.x + Math.cos(a) * O.radius, oy = p.y + Math.sin(a) * O.radius;
        g.fillStyle = 'rgba(77,163,255,0.35)';
        g.beginPath(); g.arc(ox, oy, 16, 0, TAU); g.fill();
        g.fillStyle = '#bfe3ff';
        g.beginPath(); g.arc(ox, oy, 9, 0, TAU); g.fill();
      }
    }
    if (state.frost.unlocked) {
      var FR = state.frost, fp = state.player;
      g.fillStyle = 'rgba(159,212,232,0.10)';
      g.beginPath(); g.arc(fp.x, fp.y, FR.radius, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(159,212,232,0.45)';
      g.lineWidth = 2;
      g.setLineDash([10, 8]);
      g.beginPath(); g.arc(fp.x, fp.y, FR.radius, state.time * 0.6, state.time * 0.6 + TAU); g.stroke();
      g.setLineDash([]);
    }
    for (i = 0; i < state.mines.length; i++) {
      var mn = state.mines[i];
      var blink = mn.arm > 0 ? (((state.time * 10) | 0) % 2 === 0) : true;
      g.fillStyle = '#3a3f4a';
      g.beginPath(); g.arc(mn.x, mn.y, 9, 0, TAU); g.fill();
      g.fillStyle = '#20242c';
      g.beginPath(); g.arc(mn.x, mn.y, 5.5, 0, TAU); g.fill();
      if (blink) {
        g.fillStyle = mn.arm > 0 ? '#ffd700' : '#e63946';
        g.beginPath(); g.arc(mn.x, mn.y, 2.6, 0, TAU); g.fill();
      }
    }
    if (state.rang.unlocked) {
      var RG = state.rang, rp = state.player;
      for (i = 0; i < RG.count; i++) {
        var ra = RG.angle + (i / RG.count) * TAU;
        var rx = rp.x + Math.cos(ra) * RG.radius, ry = rp.y + Math.sin(ra) * RG.radius;
        g.save();
        g.translate(rx, ry);
        g.rotate(RG.angle * 3 + i);
        g.fillStyle = '#7bed9f';
        g.beginPath();
        g.moveTo(14, 0);
        g.quadraticCurveTo(0, -9, -12, -4);
        g.quadraticCurveTo(-2, 0, -12, 4);
        g.quadraticCurveTo(0, 9, 14, 0);
        g.fill();
        g.restore();
      }
    }
    for (i = 0; i < state.zaps.length; i++) {
      var z = state.zaps[i];
      g.globalAlpha = clamp(z.t / 0.18, 0, 1);
      g.strokeStyle = '#bfe9ff';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(z.pts[0].x, z.pts[0].y);
      for (var zi = 1; zi < z.pts.length; zi++) {
        var pa = z.pts[zi - 1], pb = z.pts[zi];
        var segs = 3, si;
        for (si = 1; si <= segs; si++) {
          var t = si / segs;
          var jx = si < segs ? (rr() - 0.5) * 22 : 0;
          var jy = si < segs ? (rr() - 0.5) * 22 : 0;
          g.lineTo(lerp(pa.x, pb.x, t) + jx, lerp(pa.y, pb.y, t) + jy);
        }
      }
      g.stroke();
      g.globalAlpha = 1;
    }
    for (i = 0; i < state.beams.length; i++) {
      var bm = state.beams[i];
      g.globalAlpha = clamp(bm.t / 0.25, 0, 1);
      g.strokeStyle = 'rgba(124,252,0,0.35)';
      g.lineWidth = bm.w;
      g.beginPath();
      g.moveTo(bm.x, bm.y);
      g.lineTo(bm.x + Math.cos(bm.ang) * bm.len, bm.y + Math.sin(bm.ang) * bm.len);
      g.stroke();
      g.strokeStyle = '#eaffea';
      g.lineWidth = Math.max(2, bm.w * 0.25);
      g.beginPath();
      g.moveTo(bm.x, bm.y);
      g.lineTo(bm.x + Math.cos(bm.ang) * bm.len, bm.y + Math.sin(bm.ang) * bm.len);
      g.stroke();
      g.globalAlpha = 1;
    }
    for (i = 0; i < state.rings.length; i++) {
      var rg = state.rings[i];
      var rk = 1 - rg.t / 0.5;
      g.globalAlpha = clamp(rg.t / 0.5, 0, 1);
      g.strokeStyle = '#fd79a8';
      g.lineWidth = 8 * (1 - rk) + 2;
      g.beginPath(); g.arc(rg.x, rg.y, rg.r * (0.2 + 0.8 * rk), 0, TAU); g.stroke();
      g.globalAlpha = 1;
    }
    for (i = 0; i < state.strikes.length; i++) {
      var m = state.strikes[i];
      if (m.phase === 0) {
        var pulse = 0.45 + 0.35 * Math.sin(state.time * 14);
        g.fillStyle = 'rgba(255,60,60,' + pulse * 0.35 + ')';
        g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,60,60,' + pulse + ')';
        g.lineWidth = 3;
        g.beginPath(); g.arc(m.x, m.y, m.r * (0.55 + 0.45 * (m.t / 0.9)), 0, TAU); g.stroke();
      } else {
        var kk = m.t / 0.22;
        var rx = lerp(m.x + 200, m.x, kk), ry = lerp(m.y - 320, m.y, kk);
        g.strokeStyle = 'rgba(255,159,28,0.8)';
        g.lineWidth = 10;
        g.beginPath(); g.moveTo(rx + 60, ry - 96); g.lineTo(rx, ry); g.stroke();
        g.fillStyle = '#7a4a26';
        g.beginPath(); g.arc(rx, ry, 16, 0, TAU); g.fill();
        g.fillStyle = '#4a2c17';
        g.beginPath(); g.arc(rx - 5, ry - 4, 5, 0, TAU); g.fill();
        g.beginPath(); g.arc(rx + 6, ry + 5, 3.5, 0, TAU); g.fill();
      }
    }
    drawPlayer(g);
    for (i = 0; i < state.parts.length; i++) {
      var q = state.parts[i];
      g.globalAlpha = clamp(1 - q.t / q.life, 0, 1);
      g.fillStyle = q.color;
      g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = 'center';
    for (i = 0; i < state.floats.length; i++) {
      var f = state.floats[i];
      g.globalAlpha = clamp(1 - f.t / f.life, 0, 1);
      g.font = 'bold ' + f.size + 'px Verdana,sans-serif';
      g.fillStyle = '#000';
      g.fillText(f.txt, f.x + 1, f.y + 1);
      g.fillStyle = f.color;
      g.fillText(f.txt, f.x, f.y);
    }
    g.globalAlpha = 1;
    g.restore();
    var vg = g.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg;
    g.fillRect(0, 0, v.w, v.h);
    var lowHp = state.player && state.player.hp < state.player.maxhp * 0.3 && !state.over;
    var redA = clamp(state.hurtFlash, 0, 1) * 0.3 + (lowHp ? 0.12 + 0.08 * Math.sin(state.time * 6) : 0);
    if (redA > 0.01) {
      g.fillStyle = 'rgba(230,57,70,' + clamp(redA, 0, 0.45) + ')';
      g.fillRect(0, 0, v.w, v.h);
    }
  }

  // ---------- árvore (UI) ----------
  var treeSel = null, treeHover = null, treeOpen = false;
  var WGLYPH = { bolt: '●', meteor: '▼', orb: '◎', chain: '↯', nova: '✸', rail: '━', miss: '➤', frost: '❄', mine: '✹', rang: '◐' };
  var SGLYPH = { maxhp: '♥', regen: '+', armor: '▣', speed: '»', critC: '✕', dodge: '≈', magnet: '∩', greed: '◉', wis: '★', allDmg: '✸', allHp: '♥' };
  var NGLYPH = {
    'Chuva de Lâminas': '●', 'Cataclismo': '▼', 'Tempestade Infinita': '↯', 'Supernova': '✸',
    'Feixe Duplo': '━', 'Constelação': '◎', 'Enxame Implacável': '➤', 'Coração Glacial': '❄',
    'Campo Minado': '✹', 'Vendaval': '◐', 'Coração Ancestral': '♥', 'Mago Supremo': '★',
    'Midas': '◉', 'Dança das Sombras': '≈', 'Corpo Fechado': '▣', 'Arsenal Completo': '✸'
  };
  function nodeIcon(n) {
    if (!n) return '';
    if (n.start) return '✦';
    if (n.gate) return WGLYPH[n.gate] || '?';
    if (n.evo) return '♛';
    if (n.notable && NGLYPH[n.name]) return NGLYPH[n.name];
    var mods = n.mods || {}, k;
    for (k in mods) {
      var m = k.match(/^(bolt|meteor|chain|nova|rail|orb|miss|frost|mine|rang)/);
      if (m) return WGLYPH[m[1]];
      if (SGLYPH[k]) return SGLYPH[k];
    }
    return '·';
  }
  function drawGlyph(g, ch, x, y, size, color) {
    g.fillStyle = color;
    g.font = 'bold ' + size + 'px Verdana,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, x, y + 1);
    g.textBaseline = 'alphabetic';
  }
  var NWEP = {
    'Chuva de Lâminas': 'bolt', 'Cataclismo': 'meteor', 'Tempestade Infinita': 'chain', 'Supernova': 'nova',
    'Feixe Duplo': 'rail', 'Constelação': 'orb', 'Enxame Implacável': 'miss', 'Coração Glacial': 'frost',
    'Campo Minado': 'mine', 'Vendaval': 'rang'
  };
  function nodeWeapon(n) {
    if (!n) return null;
    if (n.gate) return n.gate;
    if (n.notable && NWEP[n.name]) return NWEP[n.name];
    if (n.notable || n.start || n.evo) return null;
    var mods = n.mods || {}, k;
    for (k in mods) {
      var m = k.match(/^(bolt|meteor|chain|nova|rail|orb|miss|frost|mine|rang)/);
      if (m) return m[1];
    }
    return null;
  }
  var WPOS = { bolt: [0, 0], meteor: [1, 0], orb: [2, 0], chain: [3, 0], nova: [4, 0], rail: [0, 1], miss: [1, 1], frost: [2, 1], mine: [3, 1], rang: [4, 1] };
  var SPOS = {
    maxhp: [0, 0], regen: [1, 0], armor: [2, 0], speed: [3, 0], critC: [4, 0], dodge: [5, 0],
    magnet: [0, 1], greed: [1, 1], wis: [2, 1], allDmg: [3, 1], allHp: [0, 0], start: [4, 1], evo: [5, 1]
  };
  function nodeStat(n) {
    if (!n || n.gate) return null;
    if (n.start) return 'start';
    if (n.evo) return 'evo';
    if (n.notable && NWEP[n.name]) return null;
    var mods = n.mods || {}, k;
    for (k in mods) {
      if (/^(bolt|meteor|chain|nova|rail|orb|miss|frost|mine|rang)/.test(k)) return null;
      return k;
    }
    return null;
  }
  var SHEETS = {};
  function sheetFor(name) {
    if (typeof Image === 'undefined') return null;
    if (!SHEETS[name]) {
      var im = new Image();
      im.onload = function () {
        if (wtOpen) renderWTree();
        else if (treeOpen) renderTree();
      };
      im.src = 'icons/' + name + '.png';
      SHEETS[name] = im;
    }
    var im2 = SHEETS[name];
    return (im2.complete && im2.naturalWidth > 0) ? im2 : null;
  }
  function drawSheetCell(g, name, cols, rows, col, row, x, y, size) {
    var im = sheetFor(name);
    if (!im) return false;
    var cw = im.naturalWidth / cols, ch = im.naturalHeight / rows;
    g.drawImage(im, col * cw, row * ch, cw, ch, x - size / 2, y - size / 2, size, size);
    return true;
  }
  function drawNodeImg(g, n, x, y, size) {
    var w = nodeWeapon(n);
    if (w && WPOS[w]) {
      if (drawSheetCell(g, 'weapons', 5, 2, WPOS[w][0], WPOS[w][1], x, y, size)) return true;
    }
    var st = nodeStat(n);
    if (st && SPOS[st]) {
      if (drawSheetCell(g, 'tree-stats', 6, 2, SPOS[st][0], SPOS[st][1], x, y, size)) return true;
    }
    return false;
  }
  function treeIsOwned(id) { return meta.tree.owned.indexOf(id) >= 0; }
  function treeAvail(id) {
    if (treeIsOwned(id)) return false;
    var n = window.TreeData.byId(id);
    if (!n || n.start) return false;
    if (n.reqPoints && treeSpent() < n.reqPoints) return false;
    var adj = window.TreeData.adj[id] || [], i;
    for (i = 0; i < adj.length; i++) if (treeIsOwned(adj[i])) return true;
    return false;
  }
  function openTree() {
    if (!state.shopOpen) return;
    treeOpen = true;
    treeSel = null;
    if (el.start) el.start.style.display = 'none';
    if (el.treeov) el.treeov.style.display = 'flex';
    renderTreePanel();
    renderTree();
  }
  function closeTree() {
    treeOpen = false;
    if (el.treeov) el.treeov.style.display = 'none';
    renderBank();
    if (el.start) el.start.style.display = 'flex';
  }
  function renderTreePanel() {
    var total = window.TreeData.nodes.length - 1;
    if (el.tpoints) el.tpoints.innerHTML = 'pontos: <b>' + meta.tree.points + '</b> · gastos: <b>' + treeSpent() + '</b>/' + total + '<br>pontos de arma: <b>' + meta.wtree.points + '</b>';
    if (el.tbpoint) el.tbpoint.textContent = 'COMPRAR PONTO (' + pointCost() + ' ◉)';
    var n = treeSel ? window.TreeData.byId(treeSel) : (treeHover ? window.TreeData.byId(treeHover) : null);
    if (!el.tinfo) return;
    if (!el.topen) { if (el.tbuy) el.tbuy.disabled = true; return; }
    if (!n) {
      el.tinfo.innerHTML = 'passe o mouse ou clique num nodo.<br><br>losangos: portais de arma (clique de novo p/ abrir)<br><br>ganhe pontos matando chefes (+1) e passando de fase (+2).';
      if (el.tbuy) el.tbuy.disabled = true;
      el.topen.style.display = 'none';
      return;
    }
    var owned = treeIsOwned(n.id);
    var avail = treeAvail(n.id);
    var cls = owned ? 'color:#ffd700' : avail ? 'color:#2ecc40' : 'color:#777';
    el.tinfo.innerHTML = '<b style="' + cls + '">' + nodeIcon(n) + ' ' + n.name + '</b><br>' + n.desc +
      (n.reqPoints ? '<br>requer ' + n.reqPoints + ' pontos gastos' : '') +
      (owned ? '<br><i>comprado</i>' : avail ? (meta.tree.points > 0 ? '' : '<br><i>sem pontos</i>') : '<br><i>conecte pela árvore</i>');
    if (el.tbuy) el.tbuy.disabled = !(avail && meta.tree.points > 0);
    if (n.gate && owned) {
      el.topen.style.display = '';
      el.topen.textContent = 'ABRIR ÁRVORE: ' + window.TreeData.wnames[n.gate].toUpperCase();
    } else el.topen.style.display = 'none';
  }
  function renderTree() {
    if (!tctx) return;
    var g = tctx, TD = window.TreeData;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#070b18';
    g.fillRect(0, 0, TD.w, TD.h);
    var i, j, a, b, na, nb;
    // Arestas
    for (i = 0; i < TD.nodes.length; i++) {
      a = TD.nodes[i];
      var adj = TD.adj[a.id] || [];
      for (j = 0; j < adj.length; j++) {
        b = TD.byId(adj[j]);
        if (!b || b.id < a.id) continue;
        var ao = treeIsOwned(a.id), bo = treeIsOwned(b.id);
        g.strokeStyle = ao && bo ? '#ffd700' : (ao || bo) ? 'rgba(255,215,0,0.4)' : 'rgba(120,130,160,0.25)';
        g.lineWidth = ao && bo ? 3 : 1.5;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
    // Nodos
    g.textAlign = 'center';
    for (i = 0; i < TD.nodes.length; i++) {
      var n = TD.nodes[i];
      var owned = treeIsOwned(n.id);
      var avail = treeAvail(n.id);
      var col = n.start ? '#ffd700' : TD.sectors[n.sector].color;
      var r = n.start ? 22 : n.notable ? 19 : 11;
      if (n.gate) {
        drawDiamond(g, n.x, n.y, r + 4, owned ? col : '#141a30', owned ? '#fff' : avail ? col : 'rgba(120,130,160,0.4)', owned || avail ? 3 : 1.5);
        if (!drawNodeImg(g, n, n.x, n.y, 30)) drawGlyph(g, nodeIcon(n), n.x, n.y, 22, owned ? '#070b18' : col);
        g.fillStyle = owned ? '#ffd700' : 'rgba(200,200,220,0.75)';
        g.font = 'bold 11px Verdana,sans-serif';
        g.fillText(n.name, n.x, n.y - r - 13);
      } else if (owned) {
        g.fillStyle = col;
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill();
        if (!drawNodeImg(g, n, n.x, n.y, r * 1.6)) drawGlyph(g, nodeIcon(n), n.x, n.y, n.start ? 20 : n.notable ? 17 : 11, '#070b18');
      } else {
        g.fillStyle = '#141a30';
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill();
        g.strokeStyle = avail ? col : 'rgba(120,130,160,0.4)';
        g.lineWidth = avail ? 3 : 1.5;
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.stroke();
        if (!drawNodeImg(g, n, n.x, n.y, r * 1.6)) drawGlyph(g, nodeIcon(n), n.x, n.y, n.start ? 20 : n.notable ? 17 : 11, avail ? col : 'rgba(120,130,160,0.55)');
      }
      if (n.notable && !n.gate) {
        g.strokeStyle = owned ? '#fff' : col;
        g.lineWidth = 2;
        g.beginPath(); g.arc(n.x, n.y, r + 5, 0, TAU); g.stroke();
        g.fillStyle = owned ? '#ffd700' : 'rgba(200,200,220,0.75)';
        g.font = 'bold 11px Verdana,sans-serif';
        g.fillText(n.name, n.x, n.y - r - 9);
      }
      if (treeSel === n.id || treeHover === n.id) {
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.beginPath(); g.arc(n.x, n.y, r + 8, 0, TAU); g.stroke();
      }
    }
  }
  function drawDiamond(g, x, y, r, fill, stroke, lw) {
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r, y);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
  function treeEventPos(ev) {
    var r = el.treecv.getBoundingClientRect();
    var sx = window.TreeData.w / r.width, sy = window.TreeData.h / r.height;
    return { x: (ev.clientX - r.left) * sx, y: (ev.clientY - r.top) * sy };
  }
  function treeNodeAt(x, y) {
    var nodes = window.TreeData.nodes, best = null, bd = 28 * 28, i;
    for (i = 0; i < nodes.length; i++) {
      var dd = d2(x, y, nodes[i].x, nodes[i].y);
      if (dd < bd) { bd = dd; best = nodes[i]; }
    }
    return best;
  }
  function treeBuySelected() {
    if (!treeSel) return;
    if (treeBuy(treeSel)) {
      sfx.click();
      renderTreePanel();
      renderTree();
    } else {
      sfx.hurt();
    }
  }
  function treeOpenWTree() {
    if (!treeSel) return;
    var n = window.TreeData.byId(treeSel);
    if (n && n.gate && treeIsOwned(n.id)) openWTree(n.gate);
  }

  // ---------- mini-árvore de arma (UI) ----------
  var wtW = null, wtSel = null, wtHover = null, wtOpen = false, wtctx = null;
  function openWTree(w) {
    if (!window.WTreeData || !window.WTreeData.trees[w] || !gateOpen(w)) return;
    wtW = w;
    wtSel = null;
    wtOpen = true;
    if (el.treeov) el.treeov.style.display = 'none';
    if (el.wtov) el.wtov.style.display = 'flex';
    renderWTreePanel();
    renderWTree();
  }
  function closeWTree() {
    wtOpen = false;
    wtW = null;
    if (el.wtov) el.wtov.style.display = 'none';
    if (treeOpen && el.treeov) el.treeov.style.display = 'flex';
    renderTreePanel();
    renderTree();
  }
  function renderWTreePanel() {
    if (!wtW) return;
    var spent = wtreeSpent(wtW);
    if (el.wttitle) el.wttitle.textContent = nodeIcon({ gate: wtW }) + ' ' + window.TreeData.wnames[wtW].toUpperCase();
    if (el.wtpoints) el.wtpoints.innerHTML = 'pontos de arma: <b>' + meta.wtree.points + '</b> · gastos aqui: <b>' + spent + '</b>/13';
    var n = wtSel ? window.WTreeData.byId(wtW, wtSel) : (wtHover ? window.WTreeData.byId(wtW, wtHover) : null);
    if (!el.wtinfo) return;
    if (!n) {
      el.wtinfo.innerHTML = 'clique num nodo p/ comprar.<br><br>a evolução (' + nodeIcon({ evo: 1 }) + ') custa 3 e exige 8 nodos.';
      if (el.wtbuy) el.wtbuy.disabled = true;
      return;
    }
    var owned = wtreeHas(wtW, n.id);
    var avail = wtreeAvail(wtW, n.id);
    var cost = (n.cost || 1);
    var cls = owned ? 'color:#ffd700' : avail ? 'color:#2ecc40' : 'color:#777';
    el.wtinfo.innerHTML = '<b style="' + cls + '">' + nodeIcon(n) + ' ' + n.name + '</b><br>' + n.desc +
      '<br>custo: ' + cost + ' ponto' + (cost > 1 ? 's' : '') +
      (n.reqCount ? '<br>requer ' + n.reqCount + ' nodos desta árvore' : '') +
      (owned ? '<br><i>comprado</i>' : avail ? (meta.wtree.points >= cost ? '' : '<br><i>sem pontos</i>') : '<br><i>conecte pela árvore</i>');
    if (el.wtbuy) el.wtbuy.disabled = !(avail && meta.wtree.points >= cost);
  }
  function renderWTree() {
    if (!wtctx || !wtW) return;
    var g = wtctx, T = window.WTreeData.trees[wtW];
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#070b18';
    g.fillRect(0, 0, window.WTreeData.w, window.WTreeData.h);
    var i, j;
    for (i = 0; i < T.nodes.length; i++) {
      var a = T.nodes[i], adj = T.adj[a.id] || [];
      for (j = 0; j < adj.length; j++) {
        var b = window.WTreeData.byId(wtW, adj[j]);
        if (!b || b.id < a.id) continue;
        var ao = wtreeHas(wtW, a.id), bo = wtreeHas(wtW, b.id);
        g.strokeStyle = ao && bo ? '#ffd700' : (ao || bo) ? 'rgba(255,215,0,0.4)' : 'rgba(120,130,160,0.25)';
        g.lineWidth = ao && bo ? 3 : 1.5;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
    g.textAlign = 'center';
    var col = (window.TreeData.sectors[window.TreeData.weapons.indexOf(wtW)] || {}).color || '#ffd700';
    for (i = 0; i < T.nodes.length; i++) {
      var n = T.nodes[i];
      var owned = wtreeHas(wtW, n.id);
      var avail = wtreeAvail(wtW, n.id);
      var r = n.evo ? 30 : n.root ? 20 : 13;
      if (n.evo) {
        drawDiamond(g, n.x, n.y, r + 4, owned ? '#ffd700' : '#141a30', owned ? '#fff' : avail ? '#ffd700' : 'rgba(120,130,160,0.4)', owned || avail ? 3 : 1.5);
        if (!drawNodeImg(g, n, n.x, n.y, 44)) drawGlyph(g, nodeIcon(n), n.x, n.y, 26, owned ? '#070b18' : '#ffd700');
        g.fillStyle = owned ? '#ffd700' : 'rgba(200,200,220,0.75)';
        g.font = 'bold 12px Verdana,sans-serif';
        g.fillText(n.name, n.x, n.y - r - 13);
      } else if (owned) {
        g.fillStyle = col;
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill();
        if (!drawNodeImg(g, n, n.x, n.y, r * 1.6)) drawGlyph(g, nodeIcon(n), n.x, n.y, n.root ? 18 : 12, '#070b18');
      } else {
        g.fillStyle = '#141a30';
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill();
        g.strokeStyle = avail ? col : 'rgba(120,130,160,0.4)';
        g.lineWidth = avail ? 3 : 1.5;
        g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.stroke();
        if (!drawNodeImg(g, n, n.x, n.y, r * 1.6)) drawGlyph(g, nodeIcon(n), n.x, n.y, n.root ? 18 : 12, avail ? col : 'rgba(120,130,160,0.55)');
      }
      if (wtSel === n.id || wtHover === n.id) {
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.beginPath(); g.arc(n.x, n.y, r + 8, 0, TAU); g.stroke();
      }
    }
  }
  function wtreeEventPos(ev) {
    var r = el.wtreecv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * window.WTreeData.w / r.width, y: (ev.clientY - r.top) * window.WTreeData.h / r.height };
  }
  function wtreeNodeAt(x, y) {
    var nodes = window.WTreeData.trees[wtW].nodes, best = null, bd = 32 * 32, i;
    for (i = 0; i < nodes.length; i++) {
      var dd = d2(x, y, nodes[i].x, nodes[i].y);
      if (dd < bd) { bd = dd; best = nodes[i]; }
    }
    return best;
  }
  function wtreeBuySelected() {
    if (!wtW || !wtSel) return;
    if (wtreeBuy(wtW, wtSel)) {
      sfx.click();
      renderWTreePanel();
      renderWTree();
    } else {
      sfx.hurt();
    }
  }

  // ---------- bot jogável (#bot): foge, pega XP, dashea, progride sozinho ----------
  var BOT = (typeof location !== 'undefined' && location.hash === '#bot');
  var botSessions = 0, botSpeed = 8, botDone = false, botTickCap = 0, botBar = null;
  var BOT_MAX_SESSIONS = 1000, BOT_TICK_CAP = 54000;
  var BOT_PRIO = ['meteor', 'orb', 'chain', 'miss', 'frost', 'nova', 'mine', 'rail', 'rang',
    'multi', 'pierce', 'bdmg', 'brate', 'mdmg', 'mrate', 'msize', 'orb2', 'orbd',
    'chainj', 'chaind', 'chainr', 'novad', 'novas', 'novar', 'raild', 'railr',
    'missc', 'missd', 'missr', 'frostd', 'frostr', 'frosts', 'minec', 'mined', 'miner',
    'rangc', 'rangd', 'rangr',
    'vit', 'regen', 'swift', 'mag', 'crit', 'dash', 'thorns', 'exec', 'wis', 'greed', 'wind'];
  function botPrio(id) { var i = BOT_PRIO.indexOf(id); return i < 0 ? 999 : i; }
  function botTick() {
    var S = state, p = S.player, i;
    var guard = 0;
    while (S.levelPending > 0 && guard++ < 8) {
      var bi = 0;
      for (i = 1; i < S.choices.length; i++) {
        if (botPrio(S.choices[i].id) < botPrio(S.choices[bi].id)) bi = i;
      }
      chooseUpgrade(bi);
    }
    if (!p || S.over) return;
    var fx = 0, fy = 0, near = 1e9;
    var ds = [];
    for (i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.spawnT > 0) continue;
      var edx = p.x - e.x, edy = p.y - e.y;
      var dd = Math.sqrt(edx * edx + edy * edy) || 1;
      if (dd < near) near = dd;
      ds.push([dd, e, edx, edy]);
    }
    ds.sort(function (a, b) { return a[0] - b[0]; });
    var K = Math.min(8, ds.length);
    for (i = 0; i < K; i++) {
      var d = ds[i][0], de = ds[i][1], dx = ds[i][2], dy = ds[i][3];
      var R = de.boss ? 420 : 300;
      if (d < R) {
        var w = (R - d) / R;
        w *= w * (de.boss ? 4 : 3);
        fx += (dx / d) * w;
        fy += (dy / d) * w;
      }
    }
    for (i = 0; i < S.eshots.length; i++) {
      var s = S.eshots[i];
      var sx = p.x - s.x, sy = p.y - s.y;
      var sd = Math.sqrt(sx * sx + sy * sy) || 1;
      if (sd < 170) {
        var sw = ((170 - sd) / 170) * 2;
        fx += (sx / sd) * sw;
        fy += (sy / sd) * sw;
      }
    }
    var M = 180, W = WORLD.w;
    if (p.x < M) fx += (M - p.x) / M * 2;
    if (p.x > W - M) fx -= (p.x - (W - M)) / M * 2;
    if (p.y < M) fy += (M - p.y) / M * 2;
    if (p.y > W - M) fy -= (p.y - (W - M)) / M * 2;
    if (S.portal) {
      var pdx = S.portal.x - p.x, pdy = S.portal.y - p.y;
      var pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
      var pw = pd < 200 ? 5 : 2.2;
      fx += (pdx / pd) * pw;
      fy += (pdy / pd) * pw;
    } else if (near > 170) {
      var bg = null, bd = 900 * 900;
      for (i = 0; i < S.gems.length; i++) {
        var g = S.gems[i];
        var gd = d2(p.x, p.y, g.x, g.y);
        if (gd < bd) { bd = gd; bg = g; }
      }
      if (bg) {
        var bl = Math.sqrt(bd) || 1;
        fx += ((bg.x - p.x) / bl) * 1.2;
        fy += ((bg.y - p.y) / bl) * 1.2;
      }
    }
    var fl = Math.sqrt(fx * fx + fy * fy);
    if (fl > 0.3 && near < 280) {
      var tx = -fy / fl, ty = fx / fl;
      fx += tx * 1.1;
      fy += ty * 1.1;
    }
    keys.KeyD = fx > 0.12;
    keys.KeyA = fx < -0.12;
    keys.KeyS = fy > 0.12;
    keys.KeyW = fy < -0.12;
    if (p.dashCd <= 0 && S.time > 1 && (near < 140 || (S.portal && near < 220))) {
      var best = 2, bscore = -1e9, a;
      for (a = 0; a < 8; a++) {
        var ang = (a / 8) * TAU;
        var ax = Math.cos(ang), ay = Math.sin(ang);
        var score = 0, ei;
        for (ei = 0; ei < S.enemies.length; ei++) {
          var ee = S.enemies[ei];
          if (ee.spawnT > 0) continue;
          var rx = ee.x - p.x, ry = ee.y - p.y;
          var along = rx * ax + ry * ay;
          if (along < 0 || along > 500) continue;
          var side = Math.abs(rx * ay - ry * ax);
          if (side < 90) score -= (1 - along / 500) * (ee.boss ? 3 : 1);
        }
        if (S.portal) {
          var qx = S.portal.x - p.x, qy = S.portal.y - p.y;
          var ql = Math.sqrt(qx * qx + qy * qy) || 1;
          score += (ax * qx / ql + ay * qy / ql) * 1.5;
        }
        var nx = p.x + ax * 400, ny = p.y + ay * 400;
        if (nx < 120 || nx > WORLD.w - 120 || ny < 120 || ny > WORLD.h - 120) score -= 2;
        if (score > bscore) { bscore = score; best = a; }
      }
      var bang = (best / 8) * TAU;
      keys.KeyD = Math.cos(bang) > 0.3;
      keys.KeyA = Math.cos(bang) < -0.3;
      keys.KeyS = Math.sin(bang) > 0.3;
      keys.KeyW = Math.sin(bang) < -0.3;
      tryDash();
    }
  }
  function botSpend() {
    var g = 0;
    while (meta.tree.points > 0 && g++ < 300) {
      var owned = meta.tree.owned;
      var cands = window.TreeData.nodes.filter(function (nd) {
        if (owned.indexOf(nd.id) >= 0) return false;
        if (nd.reqPoints && treeSpent() < nd.reqPoints) return false;
        var ad = window.TreeData.adj[nd.id] || [], ai;
        for (ai = 0; ai < ad.length; ai++) if (owned.indexOf(ad[ai]) >= 0) return true;
        return false;
      });
      if (!cands.length) break;
      cands.sort(function (a, b) {
        return (b.gate ? 2 : b.notable ? 1 : 0) - (a.gate ? 2 : a.notable ? 1 : 0);
      });
      if (!treeBuy(cands[0].id)) break;
    }
    var b2 = 0;
    while (meta.coins > 300 && b2++ < 50) { if (!buyPoint()) break; }
    var order = ['bolt'], wi;
    for (wi = 0; wi < ALL_WEAPONS.length; wi++) {
      if (ALL_WEAPONS[wi] !== 'bolt' && gateOpen(ALL_WEAPONS[wi])) order.push(ALL_WEAPONS[wi]);
    }
    var progressed = true, guard2 = 0;
    while (meta.wtree.points > 0 && progressed && guard2++ < 200) {
      progressed = false;
      for (wi = 0; wi < order.length; wi++) {
        var w = order[wi];
        if (!gateOpen(w)) continue;
        var nodes = window.WTreeData.trees[w].nodes, ni;
        for (ni = 0; ni < nodes.length; ni++) {
          if (!wtreeAvail(w, nodes[ni].id)) continue;
          var wn = window.WTreeData.byId(w, nodes[ni].id);
          if (meta.wtree.points >= (wn.cost || 1) && wtreeBuy(w, nodes[ni].id)) progressed = true;
        }
      }
    }
    var arts = ['manopla', 'dado', 'coracao', 'luneta', 'moeda', 'pena', 'bussola', 'relogio'], ai2;
    for (ai2 = 0; ai2 < arts.length; ai2++) {
      if (meta.artUnlocked[arts[ai2]]) { meta.art = arts[ai2]; break; }
    }
    metaSave();
  }
  function botFrame(dt) {
    if (botDone) { update(dt); return; }
    for (var i = 0; i < botSpeed; i++) {
      if (!state.started || state.over) break;
      botTick();
      update(dt);
      botTickCap++;
      if (state.won && !state.endless) continueEndless();
      if (state.over || botTickCap >= BOT_TICK_CAP) { endBotSession(); break; }
    }
    if (botBar) {
      var p = state.player;
      botBar.textContent = 'BOT sessão ' + (botSessions + 1) + '/' + BOT_MAX_SESSIONS +
        ' · F' + state.stage + ' · ' + fmtTime(state.time) +
        (p ? ' · nv' + p.level + ' · ' + Math.ceil(p.hp) + '/' + p.maxhp : '') +
        ' · x' + botSpeed + ' ([ ] velocidade)';
    }
  }
  function endBotSession() {
    botSessions++;
    bankCoins();
    botSpend();
    botTickCap = 0;
    if (botSessions >= BOT_MAX_SESSIONS) {
      botDone = true;
      banner('1000 SESSÕES COMPLETAS');
      return;
    }
    startRun();
  }

  // ---------- selftest (#selftest): página real, entradas reais, 1 passada ----------
  var SELFTEST = (typeof location !== 'undefined' && location.hash === '#selftest');
  var SHOT = (typeof location !== 'undefined' && location.hash === '#shot-tree') ? 'tree' :
    (typeof location !== 'undefined' && location.hash === '#shot-wtree') ? 'wtree' : null;
  function runShot() {
    meta.tree.points = 300;
    var guard = 0;
    while (guard++ < 50) {
      var cands = window.TreeData.nodes.filter(function (nd) {
        if (meta.tree.owned.indexOf(nd.id) >= 0) return false;
        if (nd.reqPoints && treeSpent() < nd.reqPoints) return false;
        var ad = window.TreeData.adj[nd.id] || [], ai;
        for (ai = 0; ai < ad.length; ai++) if (meta.tree.owned.indexOf(ad[ai]) >= 0) return true;
        return false;
      });
      if (!cands.length || !treeBuy(cands[0].id)) break;
    }
    var gi;
    for (gi = 0; gi < ALL_WEAPONS.length; gi++) {
      if (meta.tree.owned.indexOf('gate-' + ALL_WEAPONS[gi]) < 0) meta.tree.owned.push('gate-' + ALL_WEAPONS[gi]);
    }
    openTree();
    if (SHOT === 'wtree') {
      meta.wtree.points = 30;
      var wb = ['bolt-root', 'bolt-t1-0', 'bolt-t1-1', 'bolt-t1-2', 'bolt-t1-3', 'bolt-t2-0', 'bolt-t2-1'], bi;
      for (bi = 0; bi < wb.length; bi++) wtreeBuy('bolt', wb[bi]);
      openWTree('bolt');
    }
  }
  function runSelftest() {
    var errs = [];
    window.addEventListener('error', function (e) { errs.push(String((e && e.message) || e)); });
    var verd = document.createElement('div');
    verd.style.cssText = 'position:fixed;top:38%;left:0;right:0;text-align:center;font:bold 40px Verdana;color:#fff;background:rgba(0,0,0,0.78);padding:22px;z-index:99;';
    document.body.appendChild(verd);
    var frames = 0;
    function drain() {
      var g = 0;
      while (state.levelPending > 0 && g++ < 5) {
        var c = el.cards && el.cards.children && el.cards.children[0];
        if (c) c.click(); else chooseUpgrade(0);
      }
    }
    function step(n, renderEvery) {
      for (var i = 0; i < n; i++) {
        update(1 / 60);
        drain();
        if (renderEvery && i % renderEvery === 0) { render(); frames++; }
      }
      render(); frames++;
    }
    function kd(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code: code })); }
    function ku(code) { window.dispatchEvent(new KeyboardEvent('keyup', { code: code })); }
    function click(id) { document.getElementById(id).click(); }
    function done(ok, msg) {
      verd.textContent = (ok ? 'SELFTEST PASS ' : 'SELFTEST FAIL ') + msg;
      verd.style.color = ok ? '#7CFC00' : '#ff5b5b';
      document.title = verd.textContent;
    }
    function assert(c, msg) { if (!c) { done(false, msg); throw new Error('stop'); } }
    try {
      meta.tree.points = 5; meta.tree.owned = ['start']; meta.tree.bought = 0;
      click('btn-tree');
      assert(treeOpen, 'tree did not open');
      var id = window.TreeData.adj.start[0];
      var nd = window.TreeData.byId(id);
      var rect = el.treecv.getBoundingClientRect();
      function cvClick(nx, ny) {
        el.treecv.dispatchEvent(new MouseEvent('click', {
          clientX: rect.left + (nx / 1700) * rect.width,
          clientY: rect.top + (ny / 1050) * rect.height, bubbles: true
        }));
      }
      cvClick(nd.x, nd.y);
      el.tbuy.click();
      assert(meta.tree.owned.indexOf(id) >= 0, 'tree buy failed');
      el.trespec.click();
      assert(meta.tree.owned.length === 1 && meta.tree.points === 5, 'respec failed');
      cvClick(nd.x, nd.y);
      el.tbuy.click();
      el.tclose.click();
      assert(!treeOpen, 'tree did not close');
      click('btn-start');
      assert(state.started, 'run did not start');
      var x0 = state.player.x, y0 = state.player.y;
      kd('KeyW'); kd('KeyD');
      step(180, 30);
      ku('KeyW'); ku('KeyD');
      assert(Math.hypot(state.player.x - x0, state.player.y - y0) > 30, 'WASD did not move');
      x0 = state.player.x; y0 = state.player.y;
      kd('ArrowLeft'); kd('ArrowDown');
      step(120, 30);
      ku('ArrowLeft'); ku('ArrowDown');
      assert(Math.hypot(state.player.x - x0, state.player.y - y0) > 20, 'arrows did not move');
      kd('Space'); ku('Space');
      assert(state.player.dashT > 0 || state.player.dashCd > 0, 'dash failed');
      step(60, 30);
      kd('KeyP'); ku('KeyP');
      assert(state.paused, 'pause failed');
      var t0 = state.time;
      step(60, 0);
      assert(state.time === t0, 'pause did not freeze');
      kd('KeyP'); ku('KeyP');
      assert(!state.paused, 'resume failed');
      assert(state.enemies.length > 0, 'no enemies');
      assert(state.kills > 0, 'no kills');
      state.stageT = stageDef().time;
      step(10, 0);
      assert(state.boss, 'boss did not spawn');
      assert(el.bossbar.style.display === 'block', 'bossbar hidden');
      var bhp = state.boss.hp;
      state.boss.x = state.player.x + 300; state.boss.y = state.player.y;
      state.enemies.length = 0; state.enemies.push(state.boss);
      state.player.hp = state.player.maxhp = 100000;
      step(600, 60);
      assert(state.boss.hp < bhp, 'weapons never damaged boss');
      var pts0 = meta.tree.points;
      damageEnemy(state.boss, 1e12, 0, 0, false);
      assert(meta.tree.points === pts0 + 1, 'boss gave no point');
      assert(state.portal, 'no portal');
      var s;
      for (s = 0; s < 20 && state.portal; s++) {
        var pdx = state.portal.x - state.player.x, pdy = state.portal.y - state.player.y;
        if (Math.hypot(pdx, pdy) < 60) break;
        if (Math.abs(pdx) > Math.abs(pdy)) { kd(pdx > 0 ? 'KeyD' : 'KeyA'); step(30, 0); ku('KeyD'); ku('KeyA'); }
        else { kd(pdy > 0 ? 'KeyS' : 'KeyW'); step(30, 0); ku('KeyW'); ku('KeyS'); }
      }
      step(30, 0);
      assert(state.stage === 2, 'portal transition failed');
      var coins0 = meta.coins;
      state.player.hp = 5; state.player.maxhp = 100;
      var sl = spawnEnemy('slime', state.player.x + 5, state.player.y);
      sl.spawnT = 0;
      state.player.inv = 0;
      step(120, 0);
      assert(state.over, 'death failed');
      assert(meta.coins > coins0, 'coins not banked');
      click('btn-again');
      assert(state.started && !state.over && state.kills === 0, 'restart failed');
      step(60, 30);
      assert(!state.meteor.unlocked, 'meteor starts unlocked');
      var mui;
      for (mui = 0; mui < UPS.length; mui++) if (UPS[mui].id === 'meteor') UPS[mui].apply();
      assert(state.meteor.unlocked, 'meteor unlock failed');
      step(300, 0);
      assert(state.stats.meteor > 0, 'meteor never fell');
      state.player.hp = state.player.maxhp = 5000;
      state.miss.unlocked = state.frost.unlocked = state.mine.unlocked = state.rang.unlocked = true;
      var si;
      for (si = 0; si < 6; si++) { var se = spawnEnemy('slime', state.player.x + 80 + si * 20, state.player.y + 40); if (se) se.spawnT = 0; }
      step(400, 60);
      assert(state.stats.miss > 0, 'miss never fired');
      assert(state.stats.frost > 0, 'frost never ticked');
      var mi;
      for (mi = 0; mi < 30 && state.stats.mine === 0; mi++) step(60, 0);
      assert(state.stats.mine > 0, 'mine never blew');
      assert(state.stats.rang > 0, 'rang never hit');
      quitToShop();
      assert(state.shopOpen, 'quit failed');
      var mrow = document.getElementById('magerow');
      assert(mrow.children.length === 6, 'mages missing');
      mrow.children[2].click();
      assert(meta.mage === 'eng', 'mage pick failed');
      click('btn-start');
      assert(state.orb.unlocked, 'mage start weapon failed');
      quitToShop();
      meta.stats.kills = 1000;
      checkMiles();
      assert(meta.artUnlocked.dado, 'milestone failed');
      renderBank();
      var arow = document.getElementById('artrow');
      arow.children[1].click();
      assert(meta.art === 'dado', 'art pick failed');
      click('btn-start');
      assert(state.crit >= 0.15 - 1e-9, 'art bonus failed');
      quitToShop();
      click('btn-tree');
      meta.tree.points = 200;
      var guard = 0;
      while (meta.tree.owned.indexOf('gate-bolt') < 0 && guard++ < 300) {
        var cands = window.TreeData.nodes.filter(function (nd) {
          if (meta.tree.owned.indexOf(nd.id) >= 0) return false;
          var ad = window.TreeData.adj[nd.id] || [];
          for (var ai = 0; ai < ad.length; ai++) if (meta.tree.owned.indexOf(ad[ai]) >= 0) return true;
          return false;
        });
        assert(cands.length > 0, 'tree path stuck');
        var pick = cands[0], gi;
        for (gi = 0; gi < cands.length; gi++) if (cands[gi].id === 'gate-bolt') pick = cands[gi];
        if (pick.reqPoints && treeSpent() < pick.reqPoints) {
          for (gi = 0; gi < cands.length; gi++) if (!cands[gi].reqPoints) { pick = cands[gi]; break; }
        }
        assert(treeBuy(pick.id), 'tree path buy failed ' + pick.id);
      }
      assert(meta.tree.owned.indexOf('gate-bolt') >= 0, 'gate not reached');
      meta.wtree.points = 20;
      openWTree('bolt');
      assert(wtOpen, 'wtree did not open');
      assert(wtreeBuy('bolt', 'bolt-root'), 'wt root buy failed');
      var wb = ['bolt-t1-0', 'bolt-t1-1', 'bolt-t1-2', 'bolt-t1-3', 'bolt-t2-0', 'bolt-t2-1', 'bolt-t2-2', 'bolt-t2-3', 'bolt-t3-0', 'bolt-t3-1', 'bolt-t3-2'], bi;
      for (bi = 0; bi < wb.length; bi++) assert(wtreeBuy('bolt', wb[bi]), 'wt buy failed ' + wb[bi]);
      assert(wtreeBuy('bolt', 'bolt-evo'), 'evo buy failed');
      el.wtclose.click();
      assert(!wtOpen, 'wtree did not close');
      el.tclose.click();
      click('btn-start');
      assert(state.bolt.count >= 3, 'evo not applied');
      var chipSpr = el.chips ? el.chips.querySelector('.spr') : null;
      assert(chipSpr !== null, 'chip sprite not wired');
      step(60, 30);
      assert(errs.length === 0, 'js errors: ' + errs.slice(0, 2).join(' / '));
      done(true, 'run tree weapons mage art mile gate wtree evo frames=' + frames);
    } catch (e) {
      if (e && e.message !== 'stop') done(false, 'exception ' + String((e && e.stack) || e).slice(0, 160));
    }
  }

  // ---------- boot ----------
  function resize() {
    if (!el.canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    state.view.w = window.innerWidth || 800;
    state.view.h = window.innerHeight || 600;
    state.view.dpr = dpr;
    el.canvas.width = Math.round(state.view.w * dpr);
    el.canvas.height = Math.round(state.view.h * dpr);
    el.canvas.style.width = state.view.w + 'px';
    el.canvas.style.height = state.view.h + 'px';
  }
  function buildChips() {
    if (!el.chips) return;
    var defs = [
      ['bolt', '●', '#ffcf6e'], ['meteor', '▼', '#ff9f1c'], ['orb', '◎', '#4da3ff'],
      ['chain', '↯', '#bfe9ff'], ['nova', '✸', '#fd79a8'], ['rail', '━', '#7CFC00'],
      ['miss', '➤', '#ff6b35'], ['frost', '❄', '#9fd4e8'], ['mine', '✹', '#c9a227'],
      ['rang', '◐', '#7bed9f'], ['dash', '»', '#fff']
    ];
    el.chips.innerHTML = '';
    chips = [];
    defs.forEach(function (dd) {
      var box = document.createElement('div');
      box.className = 'wchip locked';
      var cd = document.createElement('div');
      cd.className = 'cd';
      var ic = document.createElement('div');
      ic.className = 'ic';
      ic.textContent = dd[1];
      ic.style.color = dd[2];
      if (dd[0] !== 'dash' && WPOS[dd[0]] && typeof Image !== 'undefined') {
        var sp = document.createElement('div');
        sp.className = 'spr';
        sp.style.cssText = 'position:absolute;left:13px;top:2px;width:30px;height:30px;' +
          'background-image:url(icons/weapons.png);background-size:150px 60px;' +
          'background-position:' + (-WPOS[dd[0]][0] * 30) + 'px ' + (-WPOS[dd[0]][1] * 30) + 'px;background-repeat:no-repeat;';
        box.appendChild(sp);
      }
      var lv = document.createElement('div');
      lv.className = 'lv';
      box.appendChild(cd);
      box.appendChild(ic);
      box.appendChild(lv);
      el.chips.appendChild(box);
      chips.push({ w: dd[0], box: box, cd: cd, lv: lv });
    });
  }
  var last = 0;
  function frame(t) {
    var dt = (t - last) / 1000;
    last = t;
    if (!(dt > 0)) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    try {
      if (BOT) botFrame(dt);
      else update(dt);
      render();
    } catch (e) {
      if (el.toast) { el.toast.textContent = 'Erro: ' + e.message; el.toast.style.opacity = '1'; }
      throw e;
    }
    window.requestAnimationFrame(frame);
  }
  function init(startLoop) {
    el.canvas = document.getElementById('game');
    el.hud = document.getElementById('hud');
    el.xpfill = document.getElementById('xpfill');
    el.level = document.getElementById('level');
    el.timer = document.getElementById('timer');
    el.hpfill = document.getElementById('hpfill');
    el.hptext = document.getElementById('hptext');
    el.kills = document.getElementById('kills');
    el.coins = document.getElementById('coins');
    el.threat = document.getElementById('threat');
    el.stage = document.getElementById('stage');
    el.toast = document.getElementById('toast');
    el.banner = document.getElementById('banner');
    el.build = document.getElementById('build');
    el.chips = document.getElementById('chips');
    el.mini = document.getElementById('minimap');
    el.bossbar = document.getElementById('bossbar');
    el.bossfill = document.getElementById('bossfill');
    el.bossname = document.getElementById('bossname');
    el.start = document.getElementById('start');
    el.levelup = document.getElementById('levelup');
    el.lunum = document.getElementById('lunum');
    el.cards = document.getElementById('cards');
    el.gameover = document.getElementById('gameover');
    el.gostats = document.getElementById('gostats');
    el.gobuild = document.getElementById('gobuild');
    el.victory = document.getElementById('victory');
    el.vstats = document.getElementById('vstats');
    el.pause = document.getElementById('pause');
    el.pausebuild = document.getElementById('pausebuild');
    el.bank = document.getElementById('bankline');
    el.best = document.getElementById('best');
    el.sound = document.getElementById('btn-sound');
    el.treeov = document.getElementById('treeov');
    el.treecv = document.getElementById('treecv');
    el.tpoints = document.getElementById('tpoints');
    el.tinfo = document.getElementById('tinfo');
    el.tbuy = document.getElementById('tbuy');
    el.trespec = document.getElementById('trespec');
    el.tbpoint = document.getElementById('tbpoint');
    el.tclose = document.getElementById('tclose');
    el.topen = document.getElementById('topen');
    el.wtov = document.getElementById('wtov');
    el.wtreecv = document.getElementById('wtreecv');
    el.wttitle = document.getElementById('wttitle');
    el.wtpoints = document.getElementById('wtpoints');
    el.wtinfo = document.getElementById('wtinfo');
    el.wtbuy = document.getElementById('wtbuy');
    el.wtrespec = document.getElementById('wtrespec');
    el.wtclose = document.getElementById('wtclose');
    el.magerow = document.getElementById('magerow');
    el.artrow = document.getElementById('artrow');
    if (!el.canvas || !window.TreeData || !window.StageData || !window.WTreeData || !window.MetaData) return false;
    ctx = el.canvas.getContext('2d');
    if (el.mini) mm = el.mini.getContext('2d');
    if (el.treecv) tctx = el.treecv.getContext('2d');
    if (el.wtreecv) wtctx = el.wtreecv.getContext('2d');
    var i;
    for (i = 0; i < 170; i++) {
      stars.push({ x: rr() * WORLD.w, y: rr() * WORLD.h, s: 1 + ((rr() * 2) | 0), tw: 1 + rr() * 3, ph: rr() * TAU });
    }
    metaLoad();
    resetRun();
    state.started = false;
    resize();
    buildChips();
    renderBank();
    if (el.sound) el.sound.textContent = 'SOM: ON';
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('resize', resize);
      window.addEventListener('keydown', function (e) {
        var c = e.code || '';
        if (c === 'Space' || c.indexOf('Arrow') === 0) { try { e.preventDefault(); } catch (x) { /* noop */ } }
        keys[c] = true;
        if (e.repeat) return;
        if (c === 'Space' && state.started && !state.over && !state.paused) tryDash();
        if ((c === 'KeyP' || c === 'Escape') && state.started) togglePause();
        if (c === 'KeyM') toggleMute();
        if (BOT && c === 'BracketRight') { botSpeed = Math.min(64, botSpeed * 2); }
        if (BOT && c === 'BracketLeft') { botSpeed = Math.max(1, botSpeed / 2); }
        if (state.levelPending > 0 && (c === 'Digit1' || c === 'Digit2' || c === 'Digit3')) {
          chooseUpgrade(parseInt(c.slice(-1), 10) - 1);
        }
        if (c === 'Enter') {
          if (!state.started && state.shopOpen && !treeOpen) startRun();
          else if (state.over) startRun();
        }
        if (c === 'Escape' && wtOpen) closeWTree();
        else if (c === 'Escape' && treeOpen) closeTree();
      });
      window.addEventListener('keyup', function (e) { keys[e.code || ''] = false; });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && state.started && !state.over && !state.paused && state.levelPending === 0) togglePause();
      });
    }
    if (el.treecv) {
      el.treecv.addEventListener('mousemove', function (e) {
        if (!treeOpen) return;
        var p = treeEventPos(e);
        var n = treeNodeAt(p.x, p.y);
        var id = n ? n.id : null;
        if (id !== treeHover) { treeHover = id; renderTreePanel(); renderTree(); }
      });
      el.treecv.addEventListener('click', function (e) {
        if (!treeOpen) return;
        var p = treeEventPos(e);
        var n = treeNodeAt(p.x, p.y);
        if (n && n.gate && treeSel === n.id && treeIsOwned(n.id)) { openWTree(n.gate); return; }
        treeSel = n ? n.id : null;
        renderTreePanel();
        renderTree();
      });
    }
    if (el.wtreecv) {
      el.wtreecv.addEventListener('mousemove', function (e) {
        if (!wtOpen) return;
        var p = wtreeEventPos(e);
        var n = wtreeNodeAt(p.x, p.y);
        var id = n ? n.id : null;
        if (id !== wtHover) { wtHover = id; renderWTreePanel(); renderWTree(); }
      });
      el.wtreecv.addEventListener('click', function (e) {
        if (!wtOpen) return;
        var p = wtreeEventPos(e);
        var n = wtreeNodeAt(p.x, p.y);
        wtSel = n ? n.id : null;
        renderWTreePanel();
        renderWTree();
      });
    }
    function on(id, fn) {
      var b = document.getElementById(id);
      if (b && b.addEventListener) b.addEventListener('click', fn);
    }
    function onEl(node, fn) {
      if (node && node.addEventListener) node.addEventListener('click', fn);
    }
    on('btn-start', startRun);
    on('btn-tree', openTree);
    on('btn-again', startRun);
    on('btn-shop', toShop);
    on('btn-resume', togglePause);
    on('btn-quit', quitToShop);
    on('btn-sound', function () { audio(); toggleMute(); });
    on('btn-endless', continueEndless);
    on('btn-vshop', toShop);
    onEl(el.tbuy, treeBuySelected);
    onEl(el.topen, treeOpenWTree);
    onEl(el.tclose, closeTree);
    onEl(el.wtbuy, wtreeBuySelected);
    onEl(el.wtclose, closeWTree);
    onEl(el.wtrespec, function () {
      if (!wtW) return;
      wtreeRespec(wtW);
      wtSel = null;
      sfx.click();
      renderWTreePanel();
      renderWTree();
    });
    onEl(el.trespec, function () {
      treeRespec();
      treeSel = null;
      sfx.click();
      renderTreePanel();
      renderTree();
    });
    onEl(el.tbpoint, function () {
      if (buyPoint()) { sfx.click(); renderTreePanel(); }
      else sfx.hurt();
    });
    if (startLoop !== false && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(function (t) { last = t; window.requestAnimationFrame(frame); });
    }
    return true;
  }

  if (SELFTEST) {
    document.addEventListener('DOMContentLoaded', function () { if (init(false)) runSelftest(); });
  } else if (SHOT) {
    document.addEventListener('DOMContentLoaded', function () { if (init(false)) runShot(); });
  } else if (BOT) {
    document.addEventListener('DOMContentLoaded', function () {
      META_KEY = 'meteoro_meta_bot';
      if (!init(true)) return;
      try {
        localStorage.removeItem(META_KEY);
        meta.coins = 0;
        meta.tree = { points: 0, owned: ['start'], bought: 0 };
        meta.wtree = { points: 0, owned: {} };
        meta.mage = 'mago'; meta.art = null; meta.artUnlocked = {};
        meta.stats = { kills: 0, coins: 0, maxLevel: 1, maxStage: 1, stages: 0, bosses: 0, maxTime: 0, wins: 0 };
        meta.best = { time: 0, kills: 0, level: 1, stage: 1 };
      } catch (e) { /* fresh o suficiente */ }
      state.muted = true;
      if (el.sound) el.sound.textContent = 'SOM: OFF';
      botBar = document.createElement('div');
      botBar.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);z-index:7;background:rgba(8,12,24,0.85);border:1px solid #ffb300;border-radius:6px;padding:5px 14px;font-size:13px;pointer-events:none;white-space:nowrap;';
      document.body.appendChild(botBar);
      try { if (typeof document.hasFocus === 'function' && !document.hasFocus() && window.focus) window.focus(); } catch (x) { /* noop */ }
      startRun();
    });
  } else if (typeof document !== 'undefined' && document.readyState !== undefined) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(true); });
    else init(true);
  }

  return {
    init: init, update: update, render: render, startRun: startRun,
    chooseUpgrade: chooseUpgrade, tryDash: tryDash,
    togglePause: togglePause, quitToShop: quitToShop,
    openTree: openTree, closeTree: closeTree, treeBuy: treeBuy, treeRespec: treeRespec,
    openWTree: openWTree, closeWTree: closeWTree, wtreeBuy: wtreeBuy, wtreeRespec: wtreeRespec,
    buyPoint: buyPoint, renderTree: renderTree, renderWTree: renderWTree, checkMiles: checkMiles,
    nextStage: nextStage, continueEndless: continueEndless,
    state: state, keys: keys, meta: function () { return meta; },
    debug: { spawn: spawnEnemy, hurt: damageEnemy, boss: spawnBoss, seed: function (s) { rng = mulberry32(s >>> 0); } },
    botTick: botTick, botSpend: botSpend, bankCoins: bankCoins, botFrame: botFrame, endBotSession: endBotSession,
    version: '0.4.0'
  };
})();


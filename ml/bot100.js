// Bot playtest em lote: 100 sessões com progressão persistente (usa o bot do jogo).
const Gio = imports.gi.Gio;

function readFile(p) {
    const f = Gio.File.new_for_path(p);
    const [ok, data] = f.load_contents(null);
    if (!ok) throw new Error('cannot read ' + p);
    return new TextDecoder().decode(data);
}
const ROOT = '/home/wellington/meteoro/';
const noop = () => {};
function ctx2d() {
    const grad = { addColorStop: noop };
    return new Proxy({ canvas: null }, {
        get: (t, prop) => {
            if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => grad;
            if (prop === 'measureText') return () => ({ width: 10 });
            if (prop in t) return t[prop];
            return noop;
        },
        set: (t, prop, v) => { t[prop] = v; return true; }
    });
}
function elStub() {
    return { style: {}, textContent: '', innerHTML: '', className: '',
             disabled: false, width: 1700, height: 1050, children: [],
             getContext: () => ctx2d(), addEventListener: noop,
             appendChild: function (c) { this.children.push(c); },
             getBoundingClientRect: () => ({ left: 0, top: 0, width: 1700, height: 1050 }) };
}
const els = {};
const window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, addEventListener: noop, requestAnimationFrame: () => 0 };
const store = {};
const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
};
const document = {
    readyState: 'complete', hidden: false,
    getElementById: (id) => els[id] || (els[id] = elStub()),
    createElement: () => elStub(),
    addEventListener: noop
};
eval(readFile(ROOT + 'data-tree.js'));
eval(readFile(ROOT + 'data-stages.js'));
eval(readFile(ROOT + 'data-wtree.js'));
eval(readFile(ROOT + 'data-meta.js'));
eval(readFile(ROOT + 'game.js'));
const G = window.__game;

let seed = 7;
try {
    for (const a of ARGV) if (/^\d+$/.test(a)) seed = parseInt(a, 10);
} catch (e) { /* sem ARGV, seed 7 */ }
G.debug.seed(seed);
print('seed=' + seed + ' sessoes=100');

const T0 = Date.now();
const CAP = 54000; // 15 sim-min por sessão
let maxStage = 1, wins = 0, bossKills = 0;
for (let sess = 1; sess <= 100; sess++) {
    G.botSpend();
    G.startRun();
    let tick = 0, endless = false;
    while (tick < CAP && !G.state.over) {
        G.botTick();
        G.update(1 / 60);
        tick++;
        if (G.state.won && !G.state.endless) { wins++; G.continueEndless(); endless = true; }
    }
    if (!G.state.over) G.bankCoins();
    const S = G.state, p = S.player;
    if (S.stage > maxStage) maxStage = S.stage;
    bossKills += S.bossNum;
    const owned = ['meteor', 'orb', 'chain', 'nova', 'rail', 'miss', 'frost', 'mine', 'rang'].filter(w => S[w].unlocked).length;
    print(`s${sess} ${S.over ? 'morreu' : 'teto'} t=${S.time.toFixed(0)}s F${S.stage}${endless ? '+' : ''} lv=${p.level} kills=${S.kills} boss=${S.bossNum} armas=${1 + owned} tree=${G.meta().tree.owned.length} coins=${G.meta().coins}`);
}
const real = ((Date.now() - T0) / 1000).toFixed(0);
print('---');
print(`100 sessões: maxFase=${maxStage} vitorias=${wins} chefes=${bossKills} tree=${G.meta().tree.owned.length}/127 coins=${G.meta().coins} real=${real}s`);
print('BOT100 DONE');

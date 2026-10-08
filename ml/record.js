// Gravador: joga N sessões com progressão e salva (estado12, ação3) em JSONL.
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

const OUT = ARGV[0];
const SEED = parseInt(ARGV[1], 10);
const SESSIONS = parseInt(ARGV[2], 10) || 30;
const CAP = 30000;
G.debug.seed(SEED);
const out = Gio.File.new_for_path(OUT).replace(null, false, Gio.FileCreateFlags.NONE, null);
let n = 0;
function inputsOf(S, p) {
    let n1d = 1e18, n2d = 1e18, n1 = null, n2 = null;
    for (const e of S.enemies) {
        if (e.spawnT > 0) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        const dd = dx * dx + dy * dy;
        if (dd < n1d) { n2d = n1d; n2 = n1; n1d = dd; n1 = e; }
        else if (dd < n2d) { n2d = dd; n2 = e; }
    }
    let bg = null, bd = 1e18;
    for (const g of S.gems) {
        const dd = (g.x - p.x) * (g.x - p.x) + (g.y - p.y) * (g.y - p.y);
        if (dd < bd) { bd = dd; bg = g; }
    }
    return [
        p.hp / p.maxhp, Math.min(1, S.time / 300),
        n1 ? (n1.x - p.x) / 500 : 0, n1 ? (n1.y - p.y) / 500 : 0,
        n2 ? (n2.x - p.x) / 500 : 0, n2 ? (n2.y - p.y) / 500 : 0,
        bg ? (bg.x - p.x) / 500 : 0, bg ? (bg.y - p.y) / 500 : 0,
        (p.x - 1300) / 1300, (p.y - 1300) / 1300,
        S.portal ? (S.portal.x - p.x) / 1000 : 0, S.portal ? (S.portal.y - p.y) / 1000 : 0
    ];
}
for (let s = 0; s < SESSIONS; s++) {
    G.botSpend();
    G.startRun();
    const S = G.state;
    let tick = 0;
    while (tick < CAP && !S.over) {
        const p = S.player;
        const cd0 = p.dashCd;
        G.botTick();
        const mx = (G.keys.KeyD ? 1 : 0) - (G.keys.KeyA ? 1 : 0);
        const my = (G.keys.KeyS ? 1 : 0) - (G.keys.KeyW ? 1 : 0);
        const inp = inputsOf(S, p);
        G.update(1 / 60);
        const dashed = (cd0 <= 0 && p.dashT > 0) ? 1 : 0;
        if (tick % 3 === 0 && !S.over) {
            const line = JSON.stringify({ i: inp.map(v => +v.toFixed(4)), o: [mx, my, dashed] }) + '\n';
            out.write(line, null);
            n++;
        }
        tick++;
        if (S.won && !S.endless) G.continueEndless();
    }
    if (!S.over) G.bankCoins();
    print(`sess ${s + 1} F${S.stage} t=${S.time.toFixed(0)} amostras=${n}`);
}
out.close(null);
print('REC DONE amostras=' + n);

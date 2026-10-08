// Worker N: rede neural 8-6-3 evolutiva. Pesos em ARGV[0] (75 floats).
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

function tanh(x) { const e = Math.exp(2 * x); return (e - 1) / (e + 1); }

// upgrades: ordem fixa boa (pity garante arma cedo de qualquer jeito)
const PRIO = ['meteor', 'orb', 'chain', 'miss', 'frost', 'nova', 'mine', 'rail', 'rang',
    'multi', 'pierce', 'bdmg', 'brate', 'mdmg', 'mrate', 'msize', 'vit', 'regen',
    'swift', 'mag', 'crit', 'dash', 'wis', 'greed', 'wind'];
function prio(id) { const i = PRIO.indexOf(id); return i < 0 ? 50 : i; }

try {
    const W = JSON.parse(readFile(ARGV[0]));
    if (W.length !== 131) throw new Error('nn precisa de 131 pesos, veio ' + W.length);
    G.debug.seed(parseInt(ARGV[1], 10));
    const CAP = parseInt(ARGV[2], 10);
    G.startRun();
    const S = G.state;
    const inp = new Array(12), hid = new Array(8);
    let tick = 0;
    while (tick < CAP && !S.over) {
        const p = S.player;
        let guard = 0;
        while (S.levelPending > 0 && guard++ < 8) {
            let bi = 0;
            for (let i = 1; i < S.choices.length; i++) {
                if (prio(S.choices[i].id) < prio(S.choices[bi].id)) bi = i;
            }
            G.chooseUpgrade(bi);
        }
        // entradas: hp, tempo, 2 inimigos (dx,dy), gema (dx,dy), parede (x,y), portal (dx,dy)
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
        inp[0] = p.hp / p.maxhp;
        inp[1] = Math.min(1, S.time / 300);
        inp[2] = n1 ? (n1.x - p.x) / 500 : 0;
        inp[3] = n1 ? (n1.y - p.y) / 500 : 0;
        inp[4] = n2 ? (n2.x - p.x) / 500 : 0;
        inp[5] = n2 ? (n2.y - p.y) / 500 : 0;
        inp[6] = bg ? (bg.x - p.x) / 500 : 0;
        inp[7] = bg ? (bg.y - p.y) / 500 : 0;
        inp[8] = (p.x - 1300) / 1300;
        inp[9] = (p.y - 1300) / 1300;
        inp[10] = S.portal ? (S.portal.x - p.x) / 1000 : 0;
        inp[11] = S.portal ? (S.portal.y - p.y) / 1000 : 0;
        for (let h = 0; h < 8; h++) {
            let s = W[96 + h];
            for (let i = 0; i < 12; i++) s += W[h * 12 + i] * inp[i];
            hid[h] = tanh(s);
        }
        const out = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
            let s = W[128 + k];
            for (let h = 0; h < 8; h++) s += W[104 + k * 8 + h] * hid[h];
            out[k] = k < 2 ? tanh(s) : 1 / (1 + Math.exp(-s));
        }
        G.keys.KeyD = out[0] > 0.15;
        G.keys.KeyA = out[0] < -0.15;
        G.keys.KeyS = out[1] > 0.15;
        G.keys.KeyW = out[1] < -0.15;
        if (out[2] > 0.6 && p.dashCd <= 0 && S.time > 1) G.tryDash();
        G.update(1 / 60);
        tick++;
    }
    const p = S.player;
    const fit = (S.stage - 1) * 2000 + S.time + S.kills * 0.3 + p.level * 5 +
        S.bossNum * 1500 + (S.won ? 20000 : 0);
    print(`FIT ${fit.toFixed(1)} stage=${S.stage} time=${S.time.toFixed(0)} kills=${S.kills} bosses=${S.bossNum} lv=${p.level} over=${S.over ? 1 : 0}`);
} catch (e) {
    print('FIT -1 ERR ' + String((e && e.message) || e).slice(0, 100));
}

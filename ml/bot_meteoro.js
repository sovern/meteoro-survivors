// Bot playtest: foge de inimigos/tiros, busca gemas/portal, dashea em pânico.
// Roda o jogo em timescale máximo (sem render) até morrer ou bater o teto.
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
const TD = window.TreeData;

const PRIO = ['meteor', 'orb', 'chain', 'miss', 'frost', 'nova', 'mine', 'rail', 'rang',
    'multi', 'pierce', 'bdmg', 'brate', 'mdmg', 'mrate', 'msize', 'orb2', 'orbd',
    'chainj', 'chaind', 'chainr', 'novad', 'novas', 'novar', 'raild', 'railr',
    'missc', 'missd', 'missr', 'frostd', 'frostr', 'frosts', 'minec', 'mined', 'miner',
    'rangc', 'rangd', 'rangr',
    'vit', 'regen', 'swift', 'mag', 'crit', 'dash', 'thorns', 'exec', 'wis', 'greed', 'wind'];
function prio(id) { const i = PRIO.indexOf(id); return i < 0 ? 999 : i; }

function bot() {
    const S = G.state, p = S.player;
    let guard = 0;
    while (S.levelPending > 0 && guard++ < 8) {
        let bi = 0;
        for (let i = 1; i < S.choices.length; i++) {
            if (prio(S.choices[i].id) < prio(S.choices[bi].id)) bi = i;
        }
        G.chooseUpgrade(bi);
    }
    let fx = 0, fy = 0, near = 1e9;
    const ds = [];
    for (const e of S.enemies) {
        if (e.spawnT > 0) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < near) near = d;
        ds.push([d, e, dx, dy]);
    }
    ds.sort((a, b) => a[0] - b[0]);
    const K = Math.min(8, ds.length);
    for (let i = 0; i < K; i++) {
        const d = ds[i][0], e = ds[i][1], dx = ds[i][2], dy = ds[i][3];
        const R = e.boss ? 420 : 300;
        if (d < R) {
            let w = (R - d) / R;
            w *= w * (e.boss ? 4 : 3);
            fx += (dx / d) * w;
            fy += (dy / d) * w;
        }
    }
    for (const s of S.eshots) {
        const dx = p.x - s.x, dy = p.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 170) {
            const w = ((170 - d) / 170) * 2;
            fx += (dx / d) * w;
            fy += (dy / d) * w;
        }
    }
    // Paredes: não encurrala.
    const M = 180, W = 2600;
    if (p.x < M) fx += (M - p.x) / M * 2;
    if (p.x > W - M) fx -= (p.x - (W - M)) / M * 2;
    if (p.y < M) fy += (M - p.y) / M * 2;
    if (p.y > W - M) fy -= (p.y - (W - M)) / M * 2;
    // Portal manda em tudo.
    if (S.portal) {
        const dx = S.portal.x - p.x, dy = S.portal.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const w = d < 200 ? 5 : 2.2;
        fx += (dx / d) * w;
        fy += (dy / d) * w;
    } else if (near > 170) {
        // Sem perigo perto: busca a gema mais próxima.
        let bg = null, bd = 900 * 900;
        for (const g of S.gems) {
            const dd = (g.x - p.x) * (g.x - p.x) + (g.y - p.y) * (g.y - p.y);
            if (dd < bd) { bd = dd; bg = g; }
        }
        if (bg) {
            const d = Math.sqrt(bd) || 1;
            fx += ((bg.x - p.x) / d) * 1.2;
            fy += ((bg.y - p.y) / d) * 1.2;
        }
    }
    // Kite: soma tangente pra orbitar em vez de tremer parado.
    const fl = Math.hypot(fx, fy);
    if (fl > 0.3 && near < 280) {
        const tx = -fy / fl, ty = fx / fl;
        fx += tx * 1.1;
        fy += ty * 1.1;
    }
    G.keys.KeyD = fx > 0.12;
    G.keys.KeyA = fx < -0.12;
    G.keys.KeyS = fy > 0.12;
    G.keys.KeyW = fy < -0.12;
    if (p.dashCd <= 0 && S.time > 1 && (near < 140 || (S.portal && near < 220))) {
        // Dash mirado: prova 8 direções, escolhe a mais vazia num cone de 500.
        let best = 2, bd = -1e9;
        for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            const dx = Math.cos(ang), dy = Math.sin(ang);
            let score = 0;
            for (const e of S.enemies) {
                if (e.spawnT > 0) continue;
                const rx = e.x - p.x, ry = e.y - p.y;
                const along = rx * dx + ry * dy;
                if (along < 0 || along > 500) continue;
                const side = Math.abs(rx * dy - ry * dx);
                if (side < 90) score -= (1 - along / 500) * (e.boss ? 3 : 1);
            }
            if (S.portal) {
                const pdx = S.portal.x - p.x, pdy = S.portal.y - p.y;
                const pl = Math.hypot(pdx, pdy) || 1;
                score += (dx * pdx / pl + dy * pdy / pl) * 1.5;
            }
            const nx = p.x + dx * 400, ny = p.y + dy * 400;
            if (nx < 120 || nx > 2480 || ny < 120 || ny > 2480) score -= 2;
            if (score > bd) { bd = score; best = a; }
        }
        const bang = (best / 8) * Math.PI * 2;
        G.keys.KeyD = Math.cos(bang) > 0.3;
        G.keys.KeyA = Math.cos(bang) < -0.3;
        G.keys.KeyS = Math.sin(bang) > 0.3;
        G.keys.KeyW = Math.sin(bang) < -0.3;
        G.tryDash();
    }
    return near;
}

const T0 = Date.now();
const CAP = 108000; // 30 sim-minutos
let tick = 0, wonAt = 0;
let seed = 7;
try {
    for (const a of ARGV) if (/^\d+$/.test(a)) seed = parseInt(a, 10);
} catch (e) { /* sem ARGV, seed 7 */ }
G.debug.seed(seed);
print('seed=' + seed);
G.startRun();
print('bot: fresh meta, sem árvore. teto 30min sim.');
while (tick < CAP && !G.state.over) {
    bot();
    G.update(1 / 60);
    tick++;
    if (G.state.won && !wonAt) {
        wonAt = G.state.time;
        print(`VITÓRIA em ${wonAt.toFixed(0)}s sim. indo pro infinito...`);
        G.continueEndless();
    }
    if (tick % 3600 === 0) {
        const S = G.state, p = S.player;
        print(`  t=${S.time.toFixed(0)}s F${S.stage}${S.endless ? '+' : ''} lv=${p.level} hp=${Math.ceil(p.hp)}/${p.maxhp} kills=${S.kills} inim=${S.enemies.length}`);
    }
}
const S = G.state, p = S.player;
const real = ((Date.now() - T0) / 1000).toFixed(0);
const owned = ['meteor', 'orb', 'chain', 'nova', 'rail', 'miss', 'frost', 'mine', 'rang'].filter(w => S[w].unlocked);
print('---');
print(`FIM: ${S.over ? 'MORREU' : 'teto'} em t=${S.time.toFixed(0)}s sim (F${S.stage}${S.endless ? '+' : ''}) lv=${p.level} kills=${S.kills} bosses=${S.bossNum}`);
print(`armas: raio${owned.length ? ' + ' + owned.join(' ') : ''}`);
print(`tempo real: ${real}s (x${(S.time / Math.max(1, real)).toFixed(0)} timescale)`);
print('BOT DONE');

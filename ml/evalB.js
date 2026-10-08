// Worker fase B: N sessões com progressão de meta. Imprime FIT.
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

const NAMES = ['fleeR', 'fleeW', 'bossR', 'bossW', 'eshotR', 'eshotW', 'wallM', 'wallW',
    'portalNear', 'portalWN', 'portalWF', 'gemR', 'gemW', 'orbitR', 'orbitW', 'moveTh',
    'dashR', 'dashPortalR', 'dashRange', 'dashSide', 'uAoe', 'uSingle', 'count', 'dmg',
    'surv', 'econ', 'treeWeapon', 'treeStat', 'treeNotable', 'treeGate', 'coinReserve'];
try {
    const vals = JSON.parse(readFile(ARGV[0]));
    const cfg = {};
    for (let i = 0; i < NAMES.length && i < vals.length; i++) cfg[NAMES[i]] = vals[i];
    G.botConfig(cfg);
    G.debug.seed(parseInt(ARGV[1], 10));
    const SESSIONS = parseInt(ARGV[2], 10) || 8;
    const CAP = 60000;
    let maxStage = 1, wins = 0, bosses = 0, done = 0;
    for (let s = 0; s < SESSIONS; s++) {
        G.botSpend();
        G.startRun();
        let tick = 0;
        while (tick < CAP && !G.state.over) {
            G.botTick();
            G.update(1 / 60);
            tick++;
            if (G.state.won && !G.state.endless) { wins++; G.continueEndless(); }
        }
        if (!G.state.over) G.bankCoins();
        if (G.state.stage > maxStage) maxStage = G.state.stage;
        bosses += G.state.bossNum;
        done++;
        if (wins > 0) break;
    }
    const tree = G.meta().tree.owned.length;
    const fit = (maxStage - 1) * 5000 + wins * 100000 + bosses * 300 + tree * 5 - done * 20;
    print(`FIT ${fit.toFixed(1)} maxStage=${maxStage} wins=${wins} bosses=${bosses} tree=${tree} sess=${done}`);
} catch (e) {
    print('FIT -1 ERR ' + String((e && e.message) || e).slice(0, 100));
}

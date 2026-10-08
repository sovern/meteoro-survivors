const Gio = imports.gi.Gio;
function readFile(p) { const f = Gio.File.new_for_path(p); const [ok, data] = f.load_contents(null); return new TextDecoder().decode(data); }
const ROOT = '/home/wellington/meteoro/';
const noop = () => {};
function ctx2d() { const grad = { addColorStop: noop }; return new Proxy({ canvas: null }, { get: (t, prop) => { if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => grad; if (prop === 'measureText') return () => ({ width: 10 }); if (prop in t) return t[prop]; return noop; }, set: (t, prop, v) => { t[prop] = v; return true; } }); }
function elStub() { return { style: {}, textContent: '', innerHTML: '', className: '', disabled: false, width: 1700, height: 1050, children: [], getContext: () => ctx2d(), addEventListener: noop, appendChild: function (c) { this.children.push(c); }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1700, height: 1050 }) }; }
const els = {};
const window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, addEventListener: noop, requestAnimationFrame: () => 0 };
const store = {};
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const document = { readyState: 'complete', hidden: false, getElementById: (id) => els[id] || (els[id] = elStub()), createElement: () => elStub(), addEventListener: noop };
eval(readFile(ROOT + 'data-tree.js')); eval(readFile(ROOT + 'data-stages.js')); eval(readFile(ROOT + 'data-wtree.js')); eval(readFile(ROOT + 'data-meta.js')); eval(readFile(ROOT + 'game.js'));
const G = window.__game;
G.debug.seed(5);
G.startRun();
for (let f = 0; f < 12000; f++) G.botFrame(1 / 60);
if (G.meta().tree.owned.length <= 1) throw new Error('bot nunca progrediu: owned=' + G.meta().tree.owned.length);
if (!G.state.started) throw new Error('bot parou de jogar');
print(`GLUE PASS: tree=${G.meta().tree.owned.length} coins=${G.meta().coins} stage=${G.state.stage} over=${G.state.over}`);

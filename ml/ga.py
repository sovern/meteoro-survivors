#!/usr/bin/env python3
"""GA pai: evolui genomas do bot (stdlib only). Uso:
   python3 ga.py A   -> fase A: 1 run fresh, curriculo de tetos, ate limpar F1
   python3 ga.py B   -> fase B: full-loop com meta, ate vitoria
   python3 ga.py N   -> neuroevolucao: rede 8-6-3 no harness da fase A
"""
import concurrent.futures as cf
import json
import os
import random
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.join(HERE, 'evals')
os.makedirs(EV, exist_ok=True)

# (nome, min, max, default)
GENES = [
    ('fleeR', 150, 500, 300), ('fleeW', 0.5, 6, 3),
    ('bossR', 250, 600, 420), ('bossW', 1, 8, 4),
    ('eshotR', 80, 300, 170), ('eshotW', 0, 5, 2),
    ('wallM', 80, 350, 180), ('wallW', 0, 5, 2),
    ('portalNear', 100, 400, 200), ('portalWN', 1, 10, 5), ('portalWF', 0.5, 6, 2.2),
    ('gemR', 60, 400, 170), ('gemW', 0, 4, 1.2),
    ('orbitR', 150, 450, 280), ('orbitW', 0, 3, 1.1),
    ('moveTh', 0.03, 0.3, 0.12),
    ('dashR', 60, 300, 140), ('dashPortalR', 100, 400, 220),
    ('dashRange', 250, 700, 500), ('dashSide', 40, 200, 90),
    ('uAoe', 0, 120, 100), ('uSingle', 0, 120, 90), ('count', 0, 120, 50),
    ('dmg', 0, 120, 40), ('surv', 0, 120, 30), ('econ', 0, 120, 10),
    ('treeWeapon', 0, 5, 1), ('treeStat', 0, 5, 1), ('treeNotable', 0, 5, 2),
    ('treeGate', 0, 5, 3), ('coinReserve', 0, 2000, 300),
]
NAMES = [g[0] for g in GENES]
DEFAULTS = [g[3] for g in GENES]

# rede 12-8-3: 12*8+8 + 8*3+3 = 131 pesos, tudo em [-3, 3]
NN = 131


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def rand_genome():
    return [random.uniform(g[1], g[2]) for g in GENES]


def rand_nn():
    return [random.uniform(-3, 3) for _ in range(NN)]


def mutate(g, is_nn):
    out = list(g)
    for i in range(len(out)):
        r = random.random()
        if is_nn:
            if r < 0.15:
                out[i] = clamp(out[i] + random.gauss(0, 0.5), -3, 3)
            elif r < 0.17:
                out[i] = random.uniform(-3, 3)
        else:
            lo, hi = GENES[i][1], GENES[i][2]
            if r < 0.20:
                out[i] = clamp(out[i] + random.gauss(0, (hi - lo) * 0.12), lo, hi)
            elif r < 0.22:
                out[i] = random.uniform(lo, hi)
    return out


def crossover(a, b):
    return [x if random.random() < 0.5 else y for x, y in zip(a, b)]


def tournament(pop, fits, k=3):
    best = random.randrange(len(pop))
    for _ in range(k - 1):
        c = random.randrange(len(pop))
        if fits[c] > fits[best]:
            best = c
    return pop[best]


def run_eval(script, genome, seed, extra):
    """Roda 1 worker gjs, devolve (fitness, detalhe)."""
    tag = '%d_%d' % (int(time.time() * 1000) % 100000000, random.randrange(1 << 30))
    path = os.path.join(EV, 'g_%s.json' % tag)
    with open(path, 'w') as f:
        json.dump(genome, f)
    try:
        p = subprocess.run(['gjs', os.path.join(HERE, script), path, str(seed), str(extra)],
                           capture_output=True, text=True, timeout=1500)
        for line in p.stdout.splitlines():
            if line.startswith('FIT '):
                parts = line.split()
                return float(parts[1]), ' '.join(parts[2:])
    except Exception as e:
        return -1.0, 'ERR %s' % e
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
    return -1.0, 'ERR no-fit'


def evolve(script, pop_size, elites, gens, seeds, extra_fn, is_nn, stop_fn, label):
    if is_nn:
        pop = [rand_nn() for _ in range(pop_size)]
    else:
        pop = [list(DEFAULTS)] + [rand_genome() for _ in range(pop_size - 1)]
    best_all = None
    best_fit = -1e18
    t0 = time.time()
    for gen in range(gens):
        extra = extra_fn(gen)
        jobs = []
        with cf.ThreadPoolExecutor(max_workers=int(os.environ.get('GAW', '14'))) as ex:
            futs = {}
            for i, g in enumerate(pop):
                seed = seeds[(gen * pop_size + i) % len(seeds)]
                futs[ex.submit(run_eval, script, g, seed, extra)] = i
            fits = [0.0] * len(pop)
            dets = [''] * len(pop)
            for f in cf.as_completed(futs):
                fits[futs[f]], dets[futs[f]] = f.result()
        order = sorted(range(len(pop)), key=lambda i: -fits[i])
        if fits[order[0]] > best_fit:
            best_fit = fits[order[0]]
            best_all = pop[order[0]]
            with open(os.path.join(HERE, 'best_%s.json' % label), 'w') as f:
                json.dump({'gen': gen, 'fit': best_fit, 'genome': best_all}, f)
        med = fits[sorted(range(len(pop)), key=lambda i: fits[i])[len(pop) // 2]]
        line = 'gen %2d extra=%s best=%9.1f med=%9.1f %s  [%.0fs]' % (gen, extra, fits[order[0]], med, dets[order[0]], time.time() - t0)
        print(line, flush=True)
        with open(os.path.join(HERE, 'ga.log'), 'a') as lf:
            lf.write(line + '\n')
        if stop_fn(fits[order[0]], dets[order[0]], gen):
            print('STOP: objetivo batido no gen %d' % gen, flush=True)
            return best_all, best_fit
        newpop = [pop[i] for i in order[:elites]]
        while len(newpop) < pop_size:
            a, b = tournament(pop, fits), tournament(pop, fits)
            newpop.append(mutate(crossover(a, b), is_nn))
        pop = newpop
    return best_all, best_fit


SEEDS = [7, 21, 42, 99, 1234, 555, 31337, 2024]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'A'
    random.seed(12345)
    if mode == 'A':
        # curriculo: teto de ticks sobe com o gen
        def extra(gen):
            return 6000 if gen < 4 else 12000 if gen < 8 else 20000

        def stop(fit, det, gen):
            return 'stage=' in det and int(det.split('stage=')[1].split()[0]) >= 2 and gen >= 8

        evolve('evalA.js', 12, 2, 15, SEEDS, extra, False, stop, 'A')
    elif mode == 'B':
        seedfile = os.path.join(HERE, 'best_B.json')
        if not os.path.exists(seedfile):
            seedfile = os.path.join(HERE, 'best_A.json')
        with open(seedfile) as f:
            a = json.load(f)['genome']
        # fase B reusa o melhor anterior: implementado via seed da pop inicial
        global DEFAULTS
        DEFAULTS = a
        evolve('evalB.js', 8, 2, 8, SEEDS, lambda gen: 40, False,
               lambda fit, det, gen: 'wins=0' not in det.replace(' ', ''), 'B')
    elif mode == 'N':
        def extra(gen):
            return 6000 if gen < 3 else 12000 if gen < 6 else 20000

        evolve('evalN.js', 48, 4, 25, SEEDS, extra, True, lambda f, d, g: False, 'N')
    else:
        print('modo? A, B ou N')
        sys.exit(2)


if __name__ == '__main__':
    main()

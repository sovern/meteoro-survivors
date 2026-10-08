#!/usr/bin/env python3
"""Backprop de verdade: MLP 12-8-3 em Python puro, clonagem comportamental."""
import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
random.seed(7)


def tanh(x):
    e = math.exp(2 * x) if x > -350 else 0.0
    return (e - 1) / (e + 1)


def sig(x):
    return 1 / (1 + math.exp(-x)) if x > -700 else 0.0


def load(path, n):
    rows = []
    with open(path) as f:
        for line in f:
            r = json.loads(line)
            rows.append((r['i'], r['o']))
    random.shuffle(rows)
    return rows[:n]


def forward(W, x):
    h = [0.0] * 8
    for j in range(8):
        s = W[96 + j]
        b = j * 12
        for i in range(12):
            s += W[b + i] * x[i]
        h[j] = tanh(s)
    o = [0.0] * 3
    for k in range(3):
        s = W[128 + k]
        b = 104 + k * 8
        for j in range(8):
            s += W[b + j] * h[j]
        o[k] = tanh(s) if k < 2 else sig(s)
    return h, o


def train(data, epochs=30, lr=0.05, batch=32):
    n = len(data)
    nv = max(500, n // 10)
    val, tr = data[:nv], data[nv:]
    W = [random.uniform(-0.5, 0.5) for _ in range(131)]
    best, wait = 1e18, 0
    for ep in range(epochs):
        random.shuffle(tr)
        tl = 0.0
        for b in range(0, len(tr), batch):
            grad = [0.0] * 131
            chunk = tr[b:b + batch]
            for x, t in chunk:
                h, o = forward(W, x)
                do = [o[k] - t[k] for k in range(3)]
                tl += sum(d * d for d in do) / 3
                dh = [0.0] * 8
                for k in range(3):
                    der = (1 - o[k] * o[k]) if k < 2 else (o[k] * (1 - o[k]))
                    dk = do[k] * der
                    grad[128 + k] += dk
                    b0 = 104 + k * 8
                    for j in range(8):
                        grad[b0 + j] += dk * h[j]
                        dh[j] += dk * W[b0 + j]
                for j in range(8):
                    dj = dh[j] * (1 - h[j] * h[j])
                    grad[96 + j] += dj
                    b0 = j * 12
                    for i in range(12):
                        grad[b0 + i] += dj * x[i]
            m = len(chunk)
            for i in range(131):
                W[i] -= lr * grad[i] / m
        vl = 0.0
        for x, t in val:
            _, o = forward(W, x)
            vl += sum((o[k] - t[k]) ** 2 for k in range(3)) / 3
        tl /= len(tr)
        vl /= len(val)
        print('epoch %2d train=%.4f val=%.4f' % (ep, tl, vl), flush=True)
        if vl < best - 1e-5:
            best, wait = vl, 0
            with open(os.path.join(HERE, 'best_NN.json'), 'w') as f:
                json.dump(W, f)
        else:
            wait += 1
            if wait >= 6:
                print('early stop, best val=%.4f' % best, flush=True)
                break
    return W


def main():
    import sys
    data = load(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'data.jsonl'), 20000)
    dash = sum(1 for _, o in data if o[2] == 1)
    print('amostras=%d dash=%.1f%%' % (len(data), 100 * dash / len(data)), flush=True)
    train(data)


if __name__ == '__main__':
    main()

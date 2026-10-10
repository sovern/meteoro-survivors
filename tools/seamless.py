#!/usr/bin/env python3
"""Textura gerada -> tile sem emenda para o chão das fases (precisa de Pillow).
Uso: python3 tools/seamless.py bruto.png sprites/ground_N.png [brilho_alvo=40] [saturação=0.8]"""
import sys, os
from PIL import Image, ImageChops, ImageEnhance
src, dst = sys.argv[1], sys.argv[2]
TARGET = float(sys.argv[3]) if len(sys.argv) > 3 else 40.0
SAT = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8
im = Image.open(src).convert('RGB'); W, H = im.size
sh = ImageChops.offset(im, W // 2, H // 2)
# peso: 1 no centro do original, 0 nas bordas -> bordas vêm da cópia deslocada (contínua)
mask = Image.new('L', (W, H)); m = mask.load()
for y in range(H):
    for x in range(W):
        dx = 1 - abs(x - W / 2) / (W / 2); dy = 1 - abs(y - H / 2) / (H / 2)
        m[x, y] = int(255 * min(1, 2.2 * min(dx, dy)))
out = Image.composite(im, sh, mask)
out = out.resize((512, 512), Image.LANCZOS)
from PIL import ImageStat
lum = ImageStat.Stat(out.convert('L')).mean[0]
out = ImageEnhance.Brightness(out).enhance(TARGET / max(1.0, lum))   # brilho-alvo uniforme entre fases
out = ImageEnhance.Contrast(out).enhance(1.0)
out = ImageEnhance.Color(out).enhance(SAT)
out.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(dst, optimize=True)

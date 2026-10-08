'use strict';
/* 10 fases: tema visual, elenco de inimigos, chefe com padrões, escalada. */
window.StageData = (function () {
  // kinds de padrão de chefe:
  // radial{n,spd,every} spread{n,spd,every} summon{type,n,every} charge{every}
  // blink{every,dist} spiral{arms,every}
  var STAGES = [
    {
      name: 'Vale Verde', sub: 'onde tudo começa', time: 200,
      bg: '#0b1020', grid: 'rgba(120,150,220,0.13)', star: '#ffffff', accent: '#2ecc40',
      props: ['tree', 'pine', 'rock'],
      enemies: [{ t: 'slime', w: 10 }, { t: 'bat', w: 6 }],
      hpMul: 1, dmgMul: 1, spdAdd: 0, xpMul: 1, coinMul: 1,
      boss: { name: 'REI GOSMA', base: 'slime', tint: '#27ae60', hp: 2400, dmg: 26, spd: 58, r: 46, patterns: [
        { k: 'summon', type: 'slime', n: 3, every: 6 },
        { k: 'radial', n: 10, spd: 210, every: 8 }
      ] }
    },
    {
      name: 'Cavernas Cinzentas', sub: 'o escuro tem asas', time: 210,
      bg: '#101018', grid: 'rgba(150,150,170,0.12)', star: '#cfd4ff', accent: '#95a5a6',
      props: ['rock', 'crystal', 'bones'],
      enemies: [{ t: 'bat', w: 10 }, { t: 'skull', w: 7 }, { t: 'imp', w: 8 }],
      hpMul: 1.55, dmgMul: 1.3, spdAdd: 0.03, xpMul: 1.3, coinMul: 1.4,
      boss: { name: 'RAINHA MORCEGO', base: 'bat', tint: '#6c3483', hp: 5200, dmg: 34, spd: 120, r: 34, patterns: [
        { k: 'spiral', arms: 3, spd: 230, every: 4.5 },
        { k: 'charge', every: 7 }
      ] }
    },
    {
      name: 'Pântano Fétido', sub: 'cuidado onde pisa', time: 220,
      bg: '#0a140d', grid: 'rgba(110,190,120,0.12)', star: '#d8ffd8', accent: '#7bed6f',
      props: ['shroomD', 'bones', 'tree'],
      enemies: [{ t: 'slime', w: 7 }, { t: 'shroom', w: 8 }, { t: 'spitter', w: 6 }, { t: 'imp', w: 5 }],
      hpMul: 2.4, dmgMul: 1.7, spdAdd: 0.06, xpMul: 1.7, coinMul: 2,
      boss: { name: 'COGUMELO ANCIÃO', base: 'shroom', tint: '#922b21', hp: 11000, dmg: 44, spd: 44, r: 44, patterns: [
        { k: 'spiral', arms: 4, spd: 220, every: 5.5 },
        { k: 'summon', type: 'shroom', n: 3, every: 10 }
      ] }
    },
    {
      name: 'Deserto Uivante', sub: 'areia nos olhos', time: 230,
      bg: '#171208', grid: 'rgba(230,200,130,0.13)', star: '#fff2cf', accent: '#f1c40f',
      props: ['cactus', 'rock', 'bones'],
      enemies: [{ t: 'wasp', w: 9 }, { t: 'imp', w: 8 }, { t: 'brute', w: 5 }, { t: 'bat', w: 4 }],
      hpMul: 3.7, dmgMul: 2.2, spdAdd: 0.09, xpMul: 2.2, coinMul: 2.7,
      boss: { name: 'IMPERATRIZ VESPA', base: 'wasp', tint: '#b7950b', hp: 23000, dmg: 56, spd: 150, r: 30, patterns: [
        { k: 'radial', n: 14, spd: 250, every: 6 },
        { k: 'summon', type: 'wasp', n: 3, every: 8 }
      ] }
    },
    {
      name: 'Cemitério', sub: 'eles não descansam', time: 240,
      bg: '#120a12', grid: 'rgba(190,140,190,0.11)', star: '#ffd8f0', accent: '#b8c4d8',
      props: ['bones', 'rock', 'pine'],
      enemies: [{ t: 'skull', w: 9 }, { t: 'ghost', w: 8 }, { t: 'phantom', w: 6 }, { t: 'spitter', w: 4 }],
      hpMul: 5.7, dmgMul: 2.9, spdAdd: 0.12, xpMul: 2.9, coinMul: 3.8,
      boss: { name: 'SENHOR CAVEIRA', base: 'skull', tint: '#aab4c8', hp: 48000, dmg: 72, spd: 80, r: 38, patterns: [
        { k: 'spread', n: 5, spd: 280, every: 3 },
        { k: 'summon', type: 'skull', n: 3, every: 10 }
      ] }
    },
    {
      name: 'Vulcão', sub: 'o chão é lava (quase)', time: 250,
      bg: '#160806', grid: 'rgba(255,120,60,0.14)', star: '#ffd0b0', accent: '#ff5b2e',
      props: ['ember', 'rock', 'bones'],
      enemies: [{ t: 'imp', w: 9 }, { t: 'brute', w: 7 }, { t: 'golem', w: 5 }, { t: 'spitter', w: 5 }],
      hpMul: 8.9, dmgMul: 3.7, spdAdd: 0.15, xpMul: 3.7, coinMul: 5.3,
      boss: { name: 'GOLEM DE OBSIDIANA', base: 'golem', tint: '#2c2c34', hp: 100000, dmg: 95, spd: 46, r: 52, patterns: [
        { k: 'charge', every: 6 },
        { k: 'radial', n: 12, spd: 240, every: 7 }
      ] }
    },
    {
      name: 'Floresta Sombria', sub: 'as árvores observam', time: 260,
      bg: '#08120e', grid: 'rgba(80,180,140,0.12)', star: '#d0ffe8', accent: '#1abc9c',
      props: ['pine', 'tree', 'shroomD'],
      enemies: [{ t: 'shroom', w: 7 }, { t: 'spitter', w: 6 }, { t: 'wisp', w: 7 }, { t: 'wasp', w: 6 }, { t: 'mama', w: 3 }],
      hpMul: 13.8, dmgMul: 4.9, spdAdd: 0.18, xpMul: 4.8, coinMul: 7.4,
      boss: { name: 'TREANT MILENAR', base: 'golem', tint: '#1e8449', hp: 210000, dmg: 125, spd: 50, r: 50, patterns: [
        { k: 'spiral', arms: 5, spd: 240, every: 5 },
        { k: 'summon', type: 'wisp', n: 4, every: 9 }
      ] }
    },
    {
      name: 'Geleira', sub: 'frio de doer', time: 270,
      bg: '#0a1420', grid: 'rgba(160,220,255,0.14)', star: '#e8f6ff', accent: '#9fd4e8',
      props: ['ice', 'rock', 'pine'],
      enemies: [{ t: 'ghost', w: 8 }, { t: 'phantom', w: 7 }, { t: 'wisp', w: 6 }, { t: 'brute', w: 5 }],
      hpMul: 21.4, dmgMul: 6.3, spdAdd: 0.21, xpMul: 6.3, coinMul: 10.4,
      boss: { name: 'BANSHEE', base: 'ghost', tint: '#aed6f1', hp: 440000, dmg: 165, spd: 130, r: 36, patterns: [
        { k: 'blink', dist: 260, every: 5 },
        { k: 'spiral', arms: 2, spd: 300, every: 3.5 }
      ] }
    },
    {
      name: 'O Vazio', sub: 'não olhe para baixo', time: 285,
      bg: '#05060e', grid: 'rgba(90,110,200,0.15)', star: '#b8c8ff', accent: '#5b6fd6',
      props: ['crystal', 'rock', 'bones'],
      enemies: [{ t: 'phantom', w: 8 }, { t: 'wisp', w: 7 }, { t: 'mama', w: 5 }, { t: 'golem', w: 5 }],
      hpMul: 33.1, dmgMul: 8.2, spdAdd: 0.24, xpMul: 8.2, coinMul: 14.5,
      boss: { name: 'DEVORADOR', base: 'mama', tint: '#4a235a', hp: 920000, dmg: 215, spd: 66, r: 54, patterns: [
        { k: 'summon', type: 'slime', n: 5, every: 4 },
        { k: 'radial', n: 16, spd: 260, every: 7 }
      ] }
    },
    {
      name: 'Trono do Meteoro', sub: 'o fim da chuva', time: 300,
      bg: '#141006', grid: 'rgba(255,200,80,0.14)', star: '#fff0c0', accent: '#ffb300',
      props: ['pillar', 'ember', 'crystal'],
      enemies: [{ t: 'brute', w: 7 }, { t: 'phantom', w: 7 }, { t: 'golem', w: 6 }, { t: 'wisp', w: 6 }, { t: 'spitter', w: 5 }],
      hpMul: 51.3, dmgMul: 10.7, spdAdd: 0.27, xpMul: 10.7, coinMul: 20,
      boss: { name: 'O METEORO', base: 'golem', tint: '#7a4a26', hp: 1900000, dmg: 280, spd: 70, r: 60, enrage: true, patterns: [
        { k: 'radial', n: 18, spd: 280, every: 6 },
        { k: 'spread', n: 7, spd: 320, every: 3.5 },
        { k: 'summon', type: 'imp', n: 6, every: 8 },
        { k: 'charge', every: 9 }
      ] }
    }
  ];

  return { stages: STAGES, count: STAGES.length };
})();

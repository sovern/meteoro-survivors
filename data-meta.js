'use strict';
/* Magos jogáveis + artefatos + marcos (desafios persistentes). */
window.MetaData = (function () {
  var MAGES = [
    { id: 'mago', name: 'Mago', cloak: '#1d4e89', desc: 'Equilibrado. O clássico.', mods: {}, startWeapon: null },
    { id: 'piro', name: 'Piromante', cloak: '#a3281b', desc: '+50% dano do meteoro · -20 vida', mods: { meteorDmg: 0.5, maxhp: -20 }, startWeapon: null },
    { id: 'eng', name: 'Engenheiro', cloak: '#2e7d5b', desc: 'Começa com o Orbe · +30% dano dos orbes', mods: { orbDmg: 0.3 }, startWeapon: 'orb' },
    { id: 'cac', name: 'Caçador', cloak: '#4a235a', desc: 'Começa com a Cadeia · +15% crítico', mods: { critC: 0.15 }, startWeapon: 'chain' },
    { id: 'cav', name: 'Cavaleiro', cloak: '#5d6d7e', desc: '+60 vida · +5 armadura · -8% velocidade', mods: { maxhp: 60, armor: 5, speed: -0.08 }, startWeapon: null },
    { id: 'lad', name: 'Ladino', cloak: '#7d6608', desc: 'Começa com Bumerangue · +15% velocidade · +8% esquiva', mods: { speed: 0.15, dodge: 0.08 }, startWeapon: 'rang' }
  ];
  var ARTIFACTS = [
    { id: 'dado', name: 'Dado Viciado', desc: '+12% crítico · -10% XP', mods: { critC: 0.12, wis: -0.10 }, mile: { stat: 'kills', need: 1000, text: '1000 abates totais' } },
    { id: 'luneta', name: 'Luneta', desc: '+120 ímã · -5% velocidade', mods: { magnet: 120, speed: -0.05 }, mile: { stat: 'maxLevel', need: 12, text: 'nível 12 numa run' } },
    { id: 'moeda', name: 'Moeda Amaldiçoada', desc: '+50% moedas · -30 vida', mods: { greed: 0.5, maxhp: -30 }, mile: { stat: 'coins', need: 800, text: '800 moedas bancadas' } },
    { id: 'coracao', name: 'Coração de Pedra', desc: '+80 vida · -6% velocidade', mods: { maxhp: 80, speed: -0.06 }, mile: { stat: 'maxStage', need: 4, text: 'alcançar a fase 4' } },
    { id: 'manopla', name: 'Manopla Rúnica', desc: '+15% TODO o dano · -3 armadura', mods: { allDmg: 0.15, armor: -3 }, mile: { stat: 'bosses', need: 8, text: '8 chefes mortos' } },
    { id: 'pena', name: 'Pena do Vento', desc: '+12% velocidade · +5% esquiva', mods: { speed: 0.12, dodge: 0.05 }, mile: { stat: 'wins', need: 1, text: 'zerar as 10 fases' } },
    { id: 'bussola', name: 'Bússola do Caos', desc: 'Começa com a Aura de Gelo', mods: {}, startWeapon: 'frost', mile: { stat: 'stages', need: 20, text: '20 fases limpas' } },
    { id: 'relogio', name: 'Relógio Solar', desc: '+2 regen · +10% cadência do raio', mods: { regen: 2, boltRate: 0.10 }, mile: { stat: 'maxTime', need: 1200, text: '20min numa run' } }
  ];
  return {
    mages: MAGES, artifacts: ARTIFACTS,
    mageById: function (id) {
      for (var i = 0; i < MAGES.length; i++) if (MAGES[i].id === id) return MAGES[i];
      return MAGES[0];
    },
    artById: function (id) {
      for (var i = 0; i < ARTIFACTS.length; i++) if (ARTIFACTS[i].id === id) return ARTIFACTS[i];
      return null;
    }
  };
})();

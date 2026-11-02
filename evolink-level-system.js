'use strict';
// Módulo de cálculo de atributos Pokémon (gerações III+).
const STAT_NAMES = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
const NATURES = {
  Hardy:[], Lonely:['attack','defense'], Brave:['attack','speed'], Adamant:['attack','spAttack'], Naughty:['attack','spDefense'],
  Bold:['defense','attack'], Docile:[], Relaxed:['defense','speed'], Impish:['defense','spAttack'], Lax:['defense','spDefense'],
  Timid:['speed','attack'], Hasty:['speed','defense'], Serious:[], Jolly:['speed','spAttack'], Naive:['speed','spDefense'],
  Modest:['spAttack','attack'], Mild:['spAttack','defense'], Quiet:['spAttack','speed'], Bashful:[], Rash:['spAttack','spDefense'],
  Calm:['spDefense','attack'], Gentle:['spDefense','defense'], Sassy:['spDefense','speed'], Careful:['spDefense','spAttack'], Quirky:[]
};
function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n)||0)); }
function natureMultiplier(nature, stat) {
  const pair = NATURES[nature] || [];
  return pair[0]===stat ? 1.1 : pair[1]===stat ? 0.9 : 1;
}
function calculateStats(base, ivs={}, evs={}, nature='Hardy', level=1, shedinja=false) {
  const lv=clamp(level,1,100), result={};
  for(const stat of STAT_NAMES) {
    const b=clamp(base[stat],0,255), iv=clamp(ivs[stat],0,31), ev=clamp(evs[stat],0,252);
    const common=Math.floor(((2*b+iv+Math.floor(ev/4))*lv)/100);
    result[stat] = stat==='hp' ? (shedinja?1:common+lv+10) : Math.floor((common+5)*natureMultiplier(nature,stat));
  }
  return result;
}
function levelUp(pokemon) {
  if(!pokemon || !pokemon.baseStats) throw Error('Base Stats não encontrados; não é seguro recalcular.');
  const before=clamp(pokemon.level,1,100);
  if(before>=100) return {...pokemon,level:100};
  const oldStats=pokemon.stats || calculateStats(pokemon.baseStats,pokemon.ivs,pokemon.evs,pokemon.nature,before,pokemon.shedinja);
  const level=before+1;
  const stats=calculateStats(pokemon.baseStats,pokemon.ivs,pokemon.evs,pokemon.nature,level,pokemon.shedinja);
  const oldCurrent=Number.isFinite(Number(pokemon.currentHp))?Number(pokemon.currentHp):oldStats.hp;
  const currentHp=oldCurrent<=0?0:Math.min(stats.hp,oldCurrent+stats.hp-oldStats.hp);
  return {...pokemon,level,stats,currentHp};
}
if(typeof module!=='undefined') module.exports={calculateStats,levelUp,NATURES};

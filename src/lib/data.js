// data.js — All game data imported at build-time (bundled into JS)
import gems           from '../data/gems.json';
import utilityGems    from '../data/utility_gems.json';
import fusionCost     from '../data/fusion_cost.json';
import specialRecipes from '../data/special_recipes.json';
import fragneron      from '../data/fragneron.json';
import equipmentSlots from '../data/equipment_slots.json';
import soulCrystals   from '../data/soul_crystals.json';

export const tierOrder = [
  '1','2','3','4','5','6','7','8','9','10',
  'natural','magical','divine'
];

export const data = {
  gems,
  utilityGems,
  fusionCost,
  specialRecipes,
  fragneron,
  equipmentSlots,
  soulCrystals,
  allGems: { ...gems, ...utilityGems },
  tierOrder
};

export default data;

// soul.js — Soul Crystal calculation engine
// ----------------------------------------------------------
// Soul Crystals form a strict 6-tier hierarchy (I = highest, VI = base).
// 1 unit at tier T requires `ratio` (4) units at the next-lower tier.
// Each upgrade also costs a fixed copper amount (see soul_crystals.json).
//
// All math here is pure; UI lives in views/SoulCrystals.svelte.

import { data } from './data.js';

/* Convenience accessors */
export const soulConfig = () => data.soulCrystals;

/* Ordered tier list, base first (cheapest). e.g. ["VI","V","IV","III","II","I"] */
export function soulTierOrder() {
  return data.soulCrystals.tierOrder;
}

/* Highest -> lowest tier comparator. true if `a` is a higher tier than `b`. */
function tierIndex(t) {
  return data.soulCrystals.tierOrder.indexOf(t);
}

/* Direct recipe for ONE unit at the given tier.
   Returns { fromTier, fromQty, copper } or null when tier is base (VI). */
export function directSoulRequirement(tier) {
  const t = data.soulCrystals.tiers[tier];
  if (!t || !t.fuseFrom) return null;
  return {
    fromTier: t.fuseFrom,
    fromQty:  data.soulCrystals.ratio,        // always 4
    copper:   t.copperPerCraft || 0
  };
}

/* Recursively expand a soul-crystal goal down to base tier (VI),
   consuming `stock` (a map of {tier: qty}) along the way.
   Stock is mutated; clone it before passing if you need to keep the original.

   Returns:
     {
       baseQty:    number  // base-tier (VI) units required
       craftSteps: { [tier]: number }   // how many crafts at each tier we run
       copper:     number               // total crafting fee (copper units)
       stockUsed:  { [tier]: number }   // higher-tier units consumed from stock
     }
*/
export function expandSoul(targetTier, qty, stock = {}) {
  const out = {
    baseQty:    0,
    craftSteps: {},
    copper:     0,
    stockUsed:  {}
  };

  const baseTier = data.soulCrystals.tierOrder[0]; // "VI"

  function recurse(tier, n) {
    if (n <= 0) return;

    // Consume any stock we have at this tier first.
    const have = stock[tier] || 0;
    if (have > 0) {
      const used = Math.min(have, n);
      stock[tier] = have - used;
      out.stockUsed[tier] = (out.stockUsed[tier] || 0) + used;
      n -= used;
      if (n === 0) return;
    }

    // Reached the base tier? Add to base count and stop.
    if (tier === baseTier) {
      out.baseQty += n;
      return;
    }

    // Need to craft `n` units at this tier from `n * ratio` lower-tier units.
    const dr = directSoulRequirement(tier);
    if (!dr) {
      // Defensive: tier had no recipe but isn't the declared base — treat as base.
      out.baseQty += n;
      return;
    }
    out.craftSteps[tier] = (out.craftSteps[tier] || 0) + n;
    out.copper += dr.copper * n;
    recurse(dr.fromTier, dr.fromQty * n);
  }

  recurse(targetTier, qty);
  return out;
}

/* Build a recursive tree usable by FusionTreeNode-style display.
   Node shape mirrors the gem tree:
     { gem, tier, qty, owned, missing, direct, children }
   We use gem='soul' as a sentinel so the tree component can decide labelling. */
export function buildSoulTree(targetTier, qty, stock = {}) {
  const baseTier = data.soulCrystals.tierOrder[0];

  function build(tier, n) {
    const have = stock[tier] || 0;
    const owned = Math.min(have, n);
    if (owned > 0) stock[tier] = have - owned;
    const missing = n - owned;

    const dr = directSoulRequirement(tier);
    const node = {
      gem: 'soul',
      tier,
      qty: n,
      owned,
      missing,
      // Match the gem tree's `direct` shape so the tree node component can
      // pull copper/etc cost annotations out of it.
      direct: dr
        ? { gems: [], purified: 0, brilliance: 0, copper: dr.copper }
        : { gems: [], purified: 0, brilliance: 0, copper: 0 },
      children: []
    };

    if (missing === 0 || tier === baseTier) return node;

    if (dr) {
      node.children.push(build(dr.fromTier, dr.fromQty * missing));
    }
    return node;
  }

  return build(targetTier, qty);
}

/* Stack-size helper. e.g. stacksOf(4096) -> { stacks: 5, perStack: 999, remainder: 100 } */
export function stacksOf(qty, size = data.soulCrystals.stackSize) {
  qty = Math.max(0, Math.floor(qty));
  if (size <= 0) return { stacks: 0, perStack: size, remainder: qty };
  const stacks = Math.ceil(qty / size);
  const remainder = qty - (stacks - 1) * size;
  return { stacks, perStack: size, remainder: stacks ? remainder : 0 };
}

/* Build a per-tier breakdown like 'tierBreakdown' for gems.
   Given a base (Tier VI) qty, what does it equal at each higher tier?
   Useful for the SoulCrystals page and as a popover similar to TierBreakdown.

   Returns rows ordered base -> top. */
export function soulTierBreakdown(baseQty) {
  const order = data.soulCrystals.tierOrder; // VI..I
  const ratio = data.soulCrystals.ratio;      // 4
  const out = [];
  let factor = 1; // tier VI: 1× base
  for (const tier of order) {
    out.push({
      tier,
      label: data.soulCrystals.tiers[tier].label,
      factor,
      qty: Math.ceil(baseQty / factor)
    });
    factor *= ratio;
  }
  return out;
}

/* Aggregate a list of soul-crystal targets ({tier, qty}[]) into a single
   summary, optionally consuming inventory stock. Mirrors aggregateTargets. */
export function aggregateSoulTargets(targets, stock = {}) {
  const agg = {
    baseQty: 0,
    craftSteps: {},
    copper: 0,
    stockUsed: {}
  };
  // Use one shared stock so we don't double-count it across targets.
  for (const t of targets) {
    const e = expandSoul(t.tier, t.qty, stock);
    agg.baseQty += e.baseQty;
    agg.copper  += e.copper;
    for (const k in e.craftSteps) {
      agg.craftSteps[k] = (agg.craftSteps[k] || 0) + e.craftSteps[k];
    }
    for (const k in e.stockUsed) {
      agg.stockUsed[k] = (agg.stockUsed[k] || 0) + e.stockUsed[k];
    }
  }
  return agg;
}

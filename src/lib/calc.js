// calc.js — Synthesis (gem fusion) calculation engine
import { data } from './data.js';

const STANDARD_TIERS = ['1','2','3','4','5','6','7','8','9','10'];
const SPECIAL_TIERS  = ['natural','magical','divine'];

function getPairKey(gemKey) {
  const g = data.allGems[gemKey];
  return (g && g.pair) ? g.pair : gemKey;
}

export function directRequirements(gemKey, tier) {
  const result = { gems: [], purified: 0, brilliance: 0, copper: 0 };
  const fusion  = data.fusionCost;
  const recipes = data.specialRecipes;

  if (STANDARD_TIERS.includes(String(tier))) {
    const t = parseInt(tier);
    if (t === 1) return result;
    result.gems.push({ gem: gemKey, tier: String(t - 1), qty: 3 });
    const cost = fusion[String(t)];
    if (cost) {
      result.copper   += cost.copper   || 0;
      result.purified += cost.purified || 0;
    }
    return result;
  }

  if (tier === 'natural') {
    const r = recipes.natural;
    const pair = getPairKey(gemKey);
    result.gems.push({ gem: gemKey, tier: String(r.main_tier), qty: 1 });
    result.gems.push({ gem: pair,   tier: String(r.pair_tier), qty: r.pair_count });
    result.purified   += r.purified;
    result.brilliance += r.brilliance_shard;
    const cost = fusion.natural;
    if (cost) result.copper += cost.copper || 0;
    return result;
  }

  if (tier === 'magical') {
    const r = recipes.magical;
    const pair = getPairKey(gemKey);
    result.gems.push({ gem: gemKey, tier: 'natural', qty: 1 });
    result.gems.push({ gem: pair,   tier: String(r.pair_tier), qty: r.pair_count });
    result.purified   += r.purified;
    result.brilliance += r.brilliance_shard;
    const cost = fusion.magical;
    if (cost) result.copper += cost.copper || 0;
    return result;
  }

  if (tier === 'divine') {
    const r = recipes.divine;
    const pair = getPairKey(gemKey);
    result.gems.push({ gem: gemKey, tier: 'magical', qty: 1 });
    result.gems.push({ gem: pair,   tier: String(r.pair_tier), qty: r.pair_count });
    result.purified   += r.purified;
    result.brilliance += r.brilliance_shard;
    const cost = fusion.divine;
    if (cost) result.copper += cost.copper || 0;
    return result;
  }

  return result;
}

export function expand(gemKey, tier, qty) {
  const totals = { gems: {}, purified: 0, brilliance: 0, copper: 0 };
  function recurse(gem, t, n) {
    if (String(t) === '1') {
      const k = `${gem}|1`;
      totals.gems[k] = (totals.gems[k] || 0) + n;
      return;
    }
    const dr = directRequirements(gem, t);
    totals.purified   += dr.purified   * n;
    totals.brilliance += dr.brilliance * n;
    totals.copper     += dr.copper     * n;
    for (const sub of dr.gems) recurse(sub.gem, sub.tier, sub.qty * n);
  }
  recurse(gemKey, String(tier), qty);
  return totals;
}

/* expandWithStock — like expand(), but consumes a "stock" of specific
   gem/tier counts before recursing further down. If we already own N
   of gem@tier, those N units terminate recursion at that tier
   (counted in totals.stockGems instead of being re-expanded to T1).

   stock: { "gem|tier": qty, ... }   (mutated; pass a clone if you care)
   Returns the same shape as expand(), plus:
     stockGems: map of "gem|tier" -> qty consumed from stock */
export function expandWithStock(gemKey, tier, qty, stock = {}) {
  const totals = {
    gems: {},        // base T1 needs
    stockGems: {},   // higher-tier stock consumed
    purified: 0,
    brilliance: 0,
    copper: 0
  };

  function recurse(gem, t, n) {
    const key = `${gem}|${t}`;
    // Consume from stock first
    const have = stock[key] || 0;
    if (have > 0 && n > 0) {
      const used = Math.min(have, n);
      stock[key] = have - used;
      totals.stockGems[key] = (totals.stockGems[key] || 0) + used;
      n -= used;
      if (n === 0) return;
    }

    if (String(t) === '1') {
      const k = `${gem}|1`;
      totals.gems[k] = (totals.gems[k] || 0) + n;
      return;
    }
    const dr = directRequirements(gem, t);
    totals.purified   += dr.purified   * n;
    totals.brilliance += dr.brilliance * n;
    totals.copper     += dr.copper     * n;
    for (const sub of dr.gems) recurse(sub.gem, sub.tier, sub.qty * n);
  }

  recurse(gemKey, String(tier), qty);
  return totals;
}

export function buildTree(gemKey, tier, qty) {
  const dr = directRequirements(gemKey, tier);
  const node = {
    gem: gemKey,
    tier: String(tier),
    qty,
    direct: dr,
    children: []
  };
  if (String(tier) === '1') return node;
  for (const sub of dr.gems) {
    node.children.push(buildTree(sub.gem, sub.tier, sub.qty * qty));
  }
  return node;
}

/* buildTreeWithStock — like buildTree() but stops recursion (and marks
   the node as owned) when the requested gem/tier is already covered
   by stock. Stock is consumed top-down so higher tiers get covered
   before the planner ever asks for their sub-tiers.

   Each node may include:
     owned:   number consumed from stock (no children for owned units)
     missing: number that still must be fused (this is what `children`
              recipe quantities are based on) */
export function buildTreeWithStock(gemKey, tier, qty, stock = {}) {
  const t = String(tier);
  const key = `${gemKey}|${t}`;
  const have = stock[key] || 0;
  const owned = Math.min(have, qty);
  if (owned > 0) stock[key] = have - owned;
  const missing = qty - owned;

  const node = {
    gem: gemKey,
    tier: t,
    qty,
    owned,
    missing,
    direct: directRequirements(gemKey, t),
    children: []
  };

  // No need to recurse if everything is covered, or we're already T1
  if (missing === 0 || t === '1') return node;

  for (const sub of node.direct.gems) {
    node.children.push(
      buildTreeWithStock(sub.gem, sub.tier, sub.qty * missing, stock)
    );
  }
  return node;
}

export function subtractInventory(needs, inventory) {
  const out = {
    gems: { ...needs.gems },
    purified:   Math.max(0, needs.purified   - (inventory.resources.purified || 0)),
    brilliance: Math.max(0, needs.brilliance - (inventory.resources.brilliance_shard || 0)),
    copper:     needs.copper
  };
  for (const key of Object.keys(out.gems)) {
    const [gem, tier] = key.split('|');
    const have = (inventory.gems[gem] && inventory.gems[gem][tier]) || 0;
    out.gems[key] = Math.max(0, out.gems[key] - have);
  }
  return out;
}

export function computeProgress(targets, inventory) {
  let totalNeeded = 0, totalHave = 0;
  const items = [];
  for (const t of targets) {
    let have;
    if (t.kind === 'soul') {
      have = (inventory.soul && inventory.soul[t.tier]) || 0;
    } else {
      have = (inventory.gems[t.gem] && inventory.gems[t.gem][t.tier]) || 0;
    }
    const need = t.qty;
    const completed = Math.min(have, need);
    totalNeeded += need;
    totalHave   += completed;
    items.push({ ...t, have, completed, missing: Math.max(0, need - have) });
  }
  const pct = totalNeeded ? Math.round((totalHave / totalNeeded) * 100) : 0;
  return { items, totalNeeded, totalHave, pct };
}

export function aggregateTargets(targets) {
  const agg = { gems: {}, purified: 0, brilliance: 0, copper: 0 };
  for (const t of targets) {
    /* Skip non-gem targets; soul-crystal aggregation lives in soul.js */
    if (t.kind && t.kind !== 'gem') continue;
    const e = expand(t.gem, t.tier, t.qty);
    agg.purified   += e.purified;
    agg.brilliance += e.brilliance;
    agg.copper     += e.copper;
    for (const k in e.gems) agg.gems[k] = (agg.gems[k] || 0) + e.gems[k];
  }
  return agg;
}

/* Fragneron */
export function fragneronPlan(targetFragneron) {
  const out = { normal: [], bound: [] };
  for (const mode of ['normal','bound']) {
    const tiers = data.fragneron[mode];
    for (const m of tiers) {
      const runs = Math.ceil(targetFragneron / m.fragneron);
      const totalsExpanded = { gems: {}, purified: 0, brilliance: 0, copper: 0 };
      const directGems = [
        { gem: 'ruby',  tier: String(m.ruby_tier),  qty: m.ruby_qty  * runs },
        { gem: 'topaz', tier: String(m.topaz_tier), qty: m.topaz_qty * runs }
      ];
      for (const g of directGems) {
        const e = expand(g.gem, g.tier, g.qty);
        totalsExpanded.purified   += e.purified;
        totalsExpanded.brilliance += e.brilliance;
        totalsExpanded.copper     += e.copper;
        for (const k in e.gems)
          totalsExpanded.gems[k] = (totalsExpanded.gems[k] || 0) + e.gems[k];
      }
      totalsExpanded.purified += (m.purified || 0) * runs;

      out[mode].push({
        method: `Lv${m.ruby_tier}`,
        mode, runs,
        fragPerRun: m.fragneron,
        direct: directGems,
        purifiedPerRun: m.purified,
        totalFragneron: m.fragneron * runs,
        targetFragneron,
        expanded: totalsExpanded
      });
    }
  }
  return out;
}

export function bestFragneronMethods(targetFragneron) {
  const plan = fragneronPlan(targetFragneron);
  const all = [...plan.normal, ...plan.bound];
  const sumGems = g => Object.values(g).reduce((a,b)=>a+b,0);
  const score = p =>
    sumGems(p.expanded.gems) + p.expanded.purified*5 + p.expanded.brilliance*100;
  const cheapestPurified = [...all].sort((a,b) =>
    a.expanded.purified - b.expanded.purified)[0];
  const cheapestGems     = [...all].sort((a,b) =>
    sumGems(a.expanded.gems) - sumGems(b.expanded.gems))[0];
  const best = [...all].sort((a,b) => score(a) - score(b))[0];
  return { plan, best, cheapestPurified, cheapestGems };
}

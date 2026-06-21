<script>
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import FusionTreeNode from '../components/FusionTreeNode.svelte';
  import { addTarget, toast } from '../lib/stores.js';
  import {
    soulConfig, soulTierOrder, expandSoul, buildSoulTree,
    soulTierBreakdown, stacksOf
  } from '../lib/soul.js';
  import {
    fmt, coinsString, copperToCoins, stackInfo, COIN_EMOJI
  } from '../lib/utils.js';

  $: cfg          = soulConfig();
  $: tierOrderAsc = soulTierOrder();                    // VI..I (low->high)
  $: tierOrderDesc = [...tierOrderAsc].reverse();        // I..VI (high->low)
  $: stackSize    = cfg.stackSize;

  /* Target form */
  let targetTier = 'I';
  let targetQty  = 1;

  /* Current stock form (one entry — same UX as Gem Synthesis) */
  let currentTier = 'VI';
  let currentQty  = 0;

  let result = null;

  function calculate() {
    const stock = {};
    if (currentQty > 0) stock[currentTier] = currentQty;

    const stockForExpand = { ...stock };
    const stockForTree   = { ...stock };

    const expanded = expandSoul(targetTier, targetQty, stockForExpand);
    const tree     = buildSoulTree(targetTier, targetQty, stockForTree);

    result = {
      expanded,
      tree,
      snapshot: { targetTier, targetQty, currentTier, currentQty }
    };
  }

  function addToTargets() {
    addTarget({ kind: 'soul', tier: targetTier, qty: targetQty });
    toast('Soul Crystal target added', 'success');
  }

  $: coins = result ? copperToCoins(result.expanded.copper) : null;
  $: breakdown = result ? soulTierBreakdown(result.expanded.baseQty) : [];
  $: stockUsed = result
    ? Object.entries(result.expanded.stockUsed || {}).filter(([, q]) => q > 0)
    : [];
  $: craftSteps = result
    ? tierOrderDesc
        .filter(t => (result.expanded.craftSteps[t] || 0) > 0)
        .map(t => [t, result.expanded.craftSteps[t]])
    : [];

  function tierLabel(t) { return cfg.tiers[t]?.label || `Tier ${t}`; }
</script>

<Card title="Soul Crystal Calculator">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
    <Field label="Current Tier">
      <select class="select" bind:value={currentTier}>
        {#each tierOrderDesc as t}
          <option value={t}>{tierLabel(t)}</option>
        {/each}
      </select>
    </Field>
    <Field label="Current Qty">
      <input type="number" min="0" class="input" bind:value={currentQty} />
    </Field>
    <Field label="Target Tier">
      <select class="select" bind:value={targetTier}>
        {#each tierOrderDesc as t}
          <option value={t}>{tierLabel(t)}</option>
        {/each}
      </select>
    </Field>
    <Field label="Target Qty">
      <input type="number" min="1" class="input" bind:value={targetQty} />
    </Field>
  </div>
  <p class="text-xs text-slate-500 mt-2">
    "Current Tier" is treated as Soul Crystals you already own — they're
    consumed before crafting from lower tiers, and shown as <em>owned</em> in
    the tree. 1 Soul Crystal at any tier requires <strong>{cfg.ratio}</strong>
    of the next-lower tier. Tier VI is the base (gathered) material.
    Stack size in inventory is <strong>{fmt(stackSize)}</strong>.
  </p>
</Card>

<div class="mt-3 flex flex-wrap gap-2">
  <button class="btn btn-primary" on:click={calculate}>Calculate</button>
  <button class="btn" on:click={addToTargets}>Add to Materials Plan</button>
</div>

{#if result}
  <div class="mt-4 text-arcane-gold font-semibold text-lg">
    {tierLabel(result.snapshot.targetTier)} x{fmt(result.snapshot.targetQty)}
    {#if result.snapshot.currentQty > 0}
      <span class="text-sm text-slate-400 ml-2">
        (using {fmt(result.snapshot.currentQty)}× {tierLabel(result.snapshot.currentTier)} from stock)
      </span>
    {/if}
  </div>

  <!-- Base material requirement + per-tier breakdown -->
  <div class="mt-3">
    <Card title="Base Material Required">
      <div class="text-sm space-y-2">
        <div class="flex justify-between items-center text-base">
          <span class="text-slate-200">{tierLabel('VI')} (base)</span>
          <span class="text-arcane-accent2 font-semibold">
            x{fmt(result.expanded.baseQty)}
            <span class="text-xs text-slate-500 ml-2">
              = {fmt(stacksOf(result.expanded.baseQty, stackSize).stacks)} stacks
            </span>
          </span>
        </div>

        {#if stockUsed.length}
          <div class="pt-2 border-t border-arcane-border">
            <div class="font-semibold text-arcane-accent2 mb-1 text-xs uppercase">Used from stock</div>
            <ul class="space-y-0.5 text-sm">
              {#each stockUsed as [t, q]}
                <li class="flex justify-between text-emerald-400">
                  <span>✓ {tierLabel(t)}</span>
                  <span class="font-semibold">x{fmt(q)}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="pt-2 border-t border-arcane-border">
          <div class="font-semibold text-arcane-accent2 mb-1 text-xs uppercase">Equivalent at each tier</div>
          <table class="w-full text-sm">
            <tbody>
              {#each [...breakdown].reverse() as r}
                <tr class="hover:bg-arcane-panel2">
                  <td class="py-0.5 text-slate-300">{r.label}</td>
                  <td class="py-0.5 text-right text-arcane-accent2 font-semibold">x{fmt(r.qty)}</td>
                  <td class="py-0.5 text-right text-slate-500">= {fmt(r.factor)}× base</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  </div>

  <!-- Crafting batches per tier -->
  {#if craftSteps.length}
    <div class="mt-4">
      <Card title="Crafting Steps (Batches)">
        <ul class="space-y-1 text-sm">
          {#each craftSteps as [t, n]}
            {@const dr = cfg.tiers[t]}
            <li class="flex justify-between">
              <span>
                Craft <span class="text-arcane-accent2 font-semibold">{fmt(n)}×</span>
                {tierLabel(t)}
                <span class="text-xs text-slate-500">
                  ({fmt(n * cfg.ratio)}× {tierLabel(dr.fuseFrom)} consumed)
                </span>
              </span>
              <span class="text-orange-300">
                {coinsString((dr.copperPerCraft || 0) * n)}
              </span>
            </li>
          {/each}
        </ul>
        <div class="mt-2 text-xs text-slate-500">
          Total crafts: {fmt(craftSteps.reduce((s, [, n]) => s + n, 0))}
        </div>
      </Card>
    </div>
  {/if}

  <!-- Coin cost -->
  <div class="mt-4">
    <Card title="Total Crafting Fee">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-3">
          <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.diamond} Diamond</div>
          <div class="text-2xl font-semibold text-cyan-200">{fmt(coins.diamond)}</div>
        </div>
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-3">
          <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.gold} Gold</div>
          <div class="text-2xl font-semibold text-arcane-gold">{fmt(coins.gold)}</div>
        </div>
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-3">
          <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.silver} Silver</div>
          <div class="text-2xl font-semibold text-slate-300">{fmt(coins.silver)}</div>
        </div>
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-3">
          <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.copper} Copper</div>
          <div class="text-2xl font-semibold text-orange-300">{fmt(coins.copper)}</div>
        </div>
      </div>
      <div class="mt-2 text-xs text-slate-400">
        Total: {coinsString(result.expanded.copper)}
        ({fmt(result.expanded.copper)} {COIN_EMOJI.copper})
      </div>
    </Card>
  </div>

  <!-- Tree -->
  <div class="mt-4">
    <Card title="Synthesis Tree">
      <div class="overflow-x-auto">
        <ul class="tree">
          <FusionTreeNode node={result.tree} expanded={true} />
        </ul>
      </div>
    </Card>
  </div>
{/if}

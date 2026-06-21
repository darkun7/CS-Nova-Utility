<script>
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import GemSelect from '../components/GemSelect.svelte';
  import TierSelect from '../components/TierSelect.svelte';
  import FusionTreeNode from '../components/FusionTreeNode.svelte';
  import TierBreakdown from '../components/TierBreakdown.svelte';
  import { expandWithStock, buildTreeWithStock } from '../lib/calc.js';
  import { addTarget, toast } from '../lib/stores.js';
  import {
    fmt, gemLabel, coinsString, copperToCoins, COIN_EMOJI
  } from '../lib/utils.js';

  let gem = 'ruby';
  let currentTier = '1';
  let currentQty = 0;
  let targetTier = 'divine';
  let targetQty = 1;

  let result = null;

  function calculate() {
    // Build a stock map containing only the user-declared "current"
    // gem at the current tier. The calc engine will consume it before
    // recursing further down.
    const stock = {};
    if (currentQty > 0) {
      stock[`${gem}|${currentTier}`] = currentQty;
    }

    // Use a fresh stock for tree, since both functions mutate it.
    const stockForExpand = { ...stock };
    const stockForTree   = { ...stock };

    const expanded = expandWithStock(gem, targetTier, targetQty, stockForExpand);
    const tree     = buildTreeWithStock(gem, targetTier, targetQty, stockForTree);

    result = {
      expanded,
      tree,
      snapshot: { gem, currentTier, currentQty, targetTier, targetQty }
    };
  }

  function addToTargets() {
    addTarget({ gem, tier: targetTier, qty: targetQty });
    toast('Target added', 'success');
  }

  $: coins = result ? copperToCoins(result.expanded.copper) : null;
  $: sortedExpandedGems = result
    ? Object.entries(result.expanded.gems).sort((a, b) => b[1] - a[1]).filter(([, q]) => q > 0)
    : [];
  $: sortedStockGems = result
    ? Object.entries(result.expanded.stockGems || {}).filter(([, q]) => q > 0)
    : [];

  // Which "alt tiers" popover is open. Only one at a time.
  let openBreakdownKey = null;
  function toggleBreakdown(key) {
    openBreakdownKey = openBreakdownKey === key ? null : key;
  }
</script>

<Card title="Gem Synthesis">
  <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
    <Field label="Gem"><GemSelect bind:value={gem} /></Field>
    <Field label="Current Tier"><TierSelect {gem} bind:value={currentTier} /></Field>
    <Field label="Current Qty">
      <input type="number" min="0" class="input" bind:value={currentQty} />
    </Field>
    <Field label="Target Tier"><TierSelect {gem} bind:value={targetTier} /></Field>
    <Field label="Target Qty">
      <input type="number" min="1" class="input" bind:value={targetQty} />
    </Field>
  </div>
  <p class="text-xs text-slate-500 mt-2">
    "Current Tier" is treated as gems you already own - they're consumed
    before synthesizing from lower tiers, and shown as <em>owned</em> in the tree.
  </p>
</Card>

<div class="mt-3 flex flex-wrap gap-2">
  <button class="btn btn-primary" on:click={calculate}>Calculate</button>
  <button class="btn" on:click={addToTargets}>Add to Materials Plan</button>
</div>

{#if result}
  <div class="mt-4 text-arcane-gold font-semibold text-lg">
    {gemLabel(result.snapshot.gem, result.snapshot.targetTier)} x{result.snapshot.targetQty}
    {#if result.snapshot.currentQty > 0}
      <span class="text-sm text-slate-400 font-body ml-2">
        (using {result.snapshot.currentQty}×
        {gemLabel(result.snapshot.gem, result.snapshot.currentTier)} from stock)
      </span>
    {/if}
  </div>

  <!-- Fully Expanded -->
  <div class="mt-3">
    <Card title="Fully Expanded Materials">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="font-semibold text-arcane-accent2 mb-2">Base Gems</div>
          <ul class="space-y-1 text-sm">
            {#if !sortedExpandedGems.length && !sortedStockGems.length}
              <li class="text-slate-500">No base gems needed.</li>
            {/if}
            {#each sortedStockGems as [k, qty]}
              {@const [g, t] = k.split('|')}
              <li class="flex justify-between text-emerald-400">
                <span>✓ {gemLabel(g, t)} <span class="text-xs text-slate-500">(from stock)</span></span>
                <span class="font-semibold">x{fmt(qty)}</span>
              </li>
            {/each}
            {#each sortedExpandedGems as [k, qty]}
              {@const [g, t] = k.split('|')}
              <li class="flex justify-between items-center">
                <span class="flex items-center">
                  <span>{gemLabel(g, t)}</span>
                  {#if t === '1'}
                    <TierBreakdown
                      gem={g}
                      baseQty={qty}
                      open={openBreakdownKey === k}
                      on:toggle={() => toggleBreakdown(k)}
                      on:close={() => (openBreakdownKey = null)}
                    />
                  {/if}
                </span>
                <span class="text-arcane-accent2 font-semibold">x{fmt(qty)}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <div class="font-semibold text-arcane-accent2 mb-2">Other Materials</div>
          <ul class="space-y-1 text-sm">
            <li class="flex justify-between text-cyan-300">
              <span>Purified Crystal</span>
              <span class="font-semibold">x{fmt(result.expanded.purified)}</span>
            </li>
            <li class="flex justify-between text-amber-300">
              <span>Brilliance Shard</span>
              <span class="font-semibold">x{fmt(result.expanded.brilliance)}</span>
            </li>
            <li class="flex justify-between text-orange-300">
              <span>Total Coins</span>
              <span class="font-semibold">{coinsString(result.expanded.copper)}</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  </div>

  <!-- Coin cost -->
  <div class="mt-4">
    <Card title="Coin Cost">
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

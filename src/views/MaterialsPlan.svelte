<script>
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import GemSelect from '../components/GemSelect.svelte';
  import TierSelect from '../components/TierSelect.svelte';
  import { state, addTarget, removeTarget, clearTargets, toast } from '../lib/stores.js';
  import { aggregateTargets, subtractInventory } from '../lib/calc.js';
  import { aggregateSoulTargets, soulConfig, soulTierOrder, stacksOf } from '../lib/soul.js';
  import {
    fmt, gemLabel, coinsString, copperToCoins,
    copyToClipboard, downloadFile, COIN_EMOJI
  } from '../lib/utils.js';

  /* ===== Add-target form ===== */
  let kind = 'gem';            // 'gem' | 'soul'
  let gem  = 'ruby';
  let gemTier = 'divine';

  $: soulCfg = soulConfig();
  $: soulTiersDesc = [...soulTierOrder()].reverse();   // I .. VI
  let soulTier = 'I';

  let qty = 1;

  function add() {
    if (kind === 'gem') {
      addTarget({ kind: 'gem', gem, tier: gemTier, qty });
    } else {
      addTarget({ kind: 'soul', tier: soulTier, qty });
    }
    toast('Target added', 'success');
  }

  /* ===== Aggregation ===== */
  $: targets = $state.targets;

  /* Bucket targets by kind. Old (no kind) entries are treated as gems. */
  $: gemTargets  = targets.filter(t => (t.kind || 'gem') === 'gem');
  $: soulTargets = targets.filter(t => t.kind === 'soul');

  $: gemAgg  = gemTargets.length  ? aggregateTargets(gemTargets)  : null;
  $: gemAfter = gemAgg ? subtractInventory(gemAgg, $state.inventory) : null;

  /* Soul aggregation also consumes existing soul stock. We pass a copy of
     the inventory so the running aggregator can deduct higher-tier stock
     before deciding what's still needed at base. */
  $: soulStock = (() => {
    const raw = ($state.inventory && $state.inventory.soul) || {};
    return { ...raw };
  })();
  $: soulAgg = soulTargets.length ? aggregateSoulTargets(soulTargets, soulStock) : null;

  /* Combined coins (synthesis fees + soul-craft fees) */
  $: combinedCopper = (gemAgg ? gemAgg.copper : 0) + (soulAgg ? soulAgg.copper : 0);
  $: coins = copperToCoins(combinedCopper);

  $: sortedGemAgg = gemAgg
    ? Object.entries(gemAgg.gems).sort((a, b) => b[1] - a[1]).filter(([, q]) => q > 0)
    : [];

  $: hasAnyAgg = gemAgg || soulAgg;

  /* ===== Helpers for the target table ===== */
  function gemHave(g, t) {
    const inv = $state.inventory.gems;
    return (inv[g] && inv[g][t]) || 0;
  }
  function soulHave(t) {
    return ($state.inventory.soul && $state.inventory.soul[t]) || 0;
  }
  function targetLabel(t) {
    if (t.kind === 'soul') {
      const lbl = soulCfg.tiers[t.tier]?.label || `Tier ${t.tier}`;
      return `Soul Crystal — ${lbl}`;
    }
    return gemLabel(t.gem, t.tier);
  }
  function targetHave(t) {
    return t.kind === 'soul' ? soulHave(t.tier) : gemHave(t.gem, t.tier);
  }

  /* ===== Export ===== */
  function exportFormat(format) {
    if (format === 'json') {
      downloadFile('materials_plan.json',
        JSON.stringify({ targets, gemAgg, soulAgg }, null, 2),
        'application/json');
      return;
    }
    const lines = ['== CS:Nova Utility - Materials Plan =='];
    lines.push('', 'Targets:');
    for (const t of targets) {
      lines.push(`  - ${targetLabel(t)} x${t.qty}`);
    }
    if (gemAgg) {
      lines.push('', 'Gems needed:');
      for (const [k, q] of sortedGemAgg) {
        const [g, ti] = k.split('|');
        lines.push(`  - ${gemLabel(g, ti)} x${fmt(q)}`);
      }
      lines.push('', 'Synthesis resources:');
      lines.push(`  - Purified Crystal x${fmt(gemAgg.purified)}`);
      lines.push(`  - Brilliance Shard x${fmt(gemAgg.brilliance)}`);
    }
    if (soulAgg) {
      lines.push('', 'Soul Crystal base material:');
      lines.push(`  - ${soulCfg.tiers.VI.label} x${fmt(soulAgg.baseQty)}`
        + ` (${fmt(stacksOf(soulAgg.baseQty, soulCfg.stackSize).stacks)} stacks)`);
    }
    lines.push('', `Total cost: ${coinsString(combinedCopper)}`);
    const txt = lines.join('\n');
    if (format === 'clipboard') {
      copyToClipboard(txt).then(() => toast('Copied to clipboard', 'success'));
    } else {
      downloadFile('materials_plan.txt', txt);
    }
  }
</script>

<Card title="Add Target">
  <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
    <Field label="Kind">
      <select class="select" bind:value={kind}>
        <option value="gem">Gem</option>
        <option value="soul">Soul Crystal</option>
      </select>
    </Field>

    {#if kind === 'gem'}
      <Field label="Gem"><GemSelect bind:value={gem} /></Field>
      <Field label="Tier"><TierSelect {gem} bind:value={gemTier} /></Field>
    {:else}
      <Field label="Soul Tier">
        <select class="select" bind:value={soulTier}>
          {#each soulTiersDesc as t}
            <option value={t}>{soulCfg.tiers[t].label}</option>
          {/each}
        </select>
      </Field>
      <div></div>
    {/if}

    <Field label="Quantity">
      <input type="number" min="1" class="input" bind:value={qty} />
    </Field>
    <button class="btn btn-primary" on:click={add}>Add Target</button>
  </div>
</Card>

<div class="mt-4">
  <Card>
    <span slot="header">Current Targets ({targets.length})</span>
    <span slot="actions">
      {#if targets.length}
        <button class="btn btn-danger" on:click={() => {
          if (confirm('Clear all targets?')) clearTargets();
        }}>Clear All</button>
      {/if}
    </span>

    {#if targets.length === 0}
      <div class="text-slate-500 text-sm">No targets yet.</div>
    {:else}
      <table class="table">
        <thead>
          <tr>
            <th>Item</th><th>Qty</th><th>Have</th><th>Missing</th><th style="width:1%"></th>
          </tr>
        </thead>
        <tbody>
          {#each targets as t (t.id)}
            {@const have = targetHave(t)}
            {@const missing = Math.max(0, t.qty - have)}
            <tr>
              <td>{targetLabel(t)}</td>
              <td>{fmt(t.qty)}</td>
              <td class="text-emerald-400">{fmt(have)}</td>
              <td class={missing ? 'text-rose-400' : 'text-emerald-400'}>{fmt(missing)}</td>
              <td>
                <button class="btn btn-danger" on:click={() => removeTarget(t.id)}>×</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </Card>
</div>

{#if hasAnyAgg}
  <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Gem materials -->
    <Card title="Gems Needed">
      {#if !gemAgg}
        <div class="text-slate-500 text-sm">No gem targets.</div>
      {:else}
        <ul class="space-y-1 text-sm">
          {#if !sortedGemAgg.length}
            <li class="text-slate-500">No gems needed.</li>
          {/if}
          {#each sortedGemAgg as [k, q]}
            {@const [g, t] = k.split('|')}
            <li class="flex justify-between">
              <span>{gemLabel(g, t)}</span>
              <span>
                <span class="text-arcane-accent2 font-semibold">x{fmt(q)}</span>
                <span class="text-slate-500 ml-2 text-xs">
                  (need {fmt(gemAfter.gems[k] || 0)})
                </span>
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>

    <!-- Soul + resources -->
    <Card title="Soul Crystals & Resources">
      {#if soulAgg}
        {@const stk = stacksOf(soulAgg.baseQty, soulCfg.stackSize)}
        <div class="mb-3 pb-3 border-b border-arcane-border">
          <div class="font-semibold text-arcane-accent2 mb-1 text-xs uppercase">
            Soul Crystals (base)
          </div>
          <div class="flex justify-between text-sm">
            <span>{soulCfg.tiers.VI.label}</span>
            <span>
              <span class="text-arcane-accent2 font-semibold">x{fmt(soulAgg.baseQty)}</span>
              <span class="text-slate-500 ml-2 text-xs">
                = {fmt(stk.stacks)} stack{stk.stacks === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          {#if Object.entries(soulAgg.stockUsed).some(([, q]) => q > 0)}
            <div class="mt-2 text-xs text-slate-500">Used from stock:</div>
            <ul class="text-xs space-y-0.5">
              {#each Object.entries(soulAgg.stockUsed).filter(([, q]) => q > 0) as [t, q]}
                <li class="flex justify-between text-emerald-400">
                  <span>✓ {soulCfg.tiers[t]?.label}</span>
                  <span class="font-semibold">x{fmt(q)}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}

      {#if gemAgg}
        <ul class="space-y-1 text-sm">
          <li class="flex justify-between text-cyan-300">
            <span>Purified Crystal</span>
            <span>
              <span class="font-semibold">x{fmt(gemAgg.purified)}</span>
              {#if gemAfter.purified !== gemAgg.purified}
                <span class="text-slate-500 ml-2 text-xs">(need {fmt(gemAfter.purified)})</span>
              {/if}
            </span>
          </li>
          <li class="flex justify-between text-amber-300">
            <span>Brilliance Shard</span>
            <span>
              <span class="font-semibold">x{fmt(gemAgg.brilliance)}</span>
              {#if gemAfter.brilliance !== gemAgg.brilliance}
                <span class="text-slate-500 ml-2 text-xs">(need {fmt(gemAfter.brilliance)})</span>
              {/if}
            </span>
          </li>
        </ul>
      {/if}

      <!-- Combined coin breakdown -->
      <div class="pt-3 mt-3 border-t border-arcane-border">
        <div class="text-orange-300 text-sm font-semibold mb-2">
          Total Coins: {coinsString(combinedCopper)}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-2">
            <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.diamond} Diamond</div>
            <div class="text-lg font-semibold text-cyan-200">{fmt(coins.diamond)}</div>
          </div>
          <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-2">
            <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.gold} Gold</div>
            <div class="text-lg font-semibold text-arcane-gold">{fmt(coins.gold)}</div>
          </div>
          <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-2">
            <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.silver} Silver</div>
            <div class="text-lg font-semibold text-slate-300">{fmt(coins.silver)}</div>
          </div>
          <div class="bg-arcane-panel2 border border-arcane-border rounded-lg py-2">
            <div class="text-xs text-slate-400 uppercase tracking-wider">{COIN_EMOJI.copper} Copper</div>
            <div class="text-lg font-semibold text-orange-300">{fmt(coins.copper)}</div>
          </div>
        </div>
      </div>
    </Card>
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <button class="btn" on:click={() => exportFormat('clipboard')}>Copy to Clipboard</button>
    <button class="btn" on:click={() => exportFormat('txt')}>Export TXT</button>
    <button class="btn" on:click={() => exportFormat('json')}>Export JSON</button>
  </div>
{/if}

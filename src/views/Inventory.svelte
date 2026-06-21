<script>
  import Card from '../components/Card.svelte';
  import {
    state, setGemCount, setResource, setSoulCount, toast
  } from '../lib/stores.js';
  import { data } from '../lib/data.js';
  import { tierLabel, fmt, stackInfo } from '../lib/utils.js';
  import { soulConfig, soulTierOrder, stacksOf } from '../lib/soul.js';

  let search = '';

  $: gems = Object.entries(data.allGems)
    .filter(([k, g]) => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  $: tiers = data.tierOrder;

  /* Soul crystals */
  $: soulCfg = soulConfig();
  $: soulTiersDesc = [...soulTierOrder()].reverse();   // I .. VI for display
  $: soulStackSize = soulCfg.stackSize;

  function getCount(gem, tier) {
    return ($state.inventory.gems[gem] && $state.inventory.gems[gem][tier]) || 0;
  }
  function getRes(name) {
    return $state.inventory.resources[name] || 0;
  }
  function getSoul(t) {
    return ($state.inventory.soul && $state.inventory.soul[t]) || 0;
  }

  function onGemChange(gem, tier, ev) {
    setGemCount(gem, tier, ev.target.value);
    toast('Saved', 'success', 800);
  }
  function onResChange(name, ev) {
    setResource(name, ev.target.value);
    toast('Saved', 'success', 800);
  }
  function onSoulChange(tier, ev) {
    setSoulCount(tier, ev.target.value);
    toast('Saved', 'success', 800);
  }
</script>

<!-- =================== Gem Inventory =================== -->
<Card>
  <span slot="header">Gem Inventory</span>
  <span slot="actions">
    <input class="input w-48" placeholder="Search gem…" bind:value={search} />
  </span>

  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th>Gem</th>
          {#each tiers as t}
            <th class="text-center">{tierLabel(t)}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each gems as [key, gem]}
          <tr>
            <td class="whitespace-nowrap font-medium">{gem.name}</td>
            {#each tiers as t}
              {#if !gem.tiers[t]}
                <td class="text-center text-slate-700">—</td>
              {:else}
                <td class="text-center">
                  <input
                    type="number" min="0"
                    class="input text-center w-20 mx-auto"
                    value={getCount(key, t)}
                    on:change={(e) => onGemChange(key, t, e)}
                  />
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Card>

<!-- =================== Soul Crystals =================== -->
<div class="mt-4">
  <Card>
    <span slot="header">Soul Crystals</span>
    <span slot="actions" class="text-xs text-slate-500">
      stack size: {fmt(soulStackSize)}
    </span>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {#each soulTiersDesc as t}
        {@const qty = getSoul(t)}
        {@const stk = stacksOf(qty, soulStackSize)}
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg p-3">
          <div class="text-xs uppercase tracking-wider mb-1 text-arcane-accent2">
            {soulCfg.tiers[t].label}
          </div>
          <input
            type="number" min="0"
            class="input"
            value={qty}
            on:change={(e) => onSoulChange(t, e)}
          />
          <div class="text-[11px] text-slate-500 mt-1">
            {qty > 0 ? `${fmt(stk.stacks)} stack${stk.stacks === 1 ? '' : 's'}` : '\u00A0'}
          </div>
        </div>
      {/each}
    </div>
  </Card>
</div>

<!-- =================== Other Resources =================== -->
<div class="mt-4">
  <Card title="Other Resources">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      {#each [
        { label: 'Purified Crystal', key: 'purified',         cls: 'text-cyan-300' },
        { label: 'Brilliance Shard', key: 'brilliance_shard', cls: 'text-amber-300' },
        { label: '💎 Diamond',       key: 'diamond',          cls: 'text-cyan-200' },
        { label: '🟡 Gold',          key: 'gold',             cls: 'text-arcane-gold' },
        { label: '⚪ Silver',         key: 'silver',           cls: 'text-slate-300' },
        { label: '🟤 Copper',        key: 'copper',           cls: 'text-orange-300' }
      ] as r}
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg p-3">
          <div class="text-xs uppercase tracking-wider mb-1 {r.cls}">{r.label}</div>
          <input
            type="number" min="0"
            class="input"
            value={getRes(r.key)}
            on:change={(e) => onResChange(r.key, e)}
          />
        </div>
      {/each}
    </div>
  </Card>
</div>

<script>
  import Card from '../components/Card.svelte';
  import { state } from '../lib/stores.js';
  import { computeProgress } from '../lib/calc.js';
  import { soulConfig } from '../lib/soul.js';
  import { fmt, gemLabel, coinsString, coinsToCopper, COIN_EMOJI } from '../lib/utils.js';

  $: inv = ($state && $state.inventory) || { gems: {}, resources: {} };
  $: targets = ($state && $state.targets) || [];
  $: progress = computeProgress(targets, inv);
  $: resources = inv.resources || {};

  function go(id) { location.hash = '#' + id; }
  function gemCount(gem, tier) {
    return (inv.gems && inv.gems[gem] && inv.gems[gem][tier]) || 0;
  }
  function progressLabel(it) {
    if (it.kind === 'soul') {
      const lbl = soulConfig().tiers[it.tier]?.label || `Tier ${it.tier}`;
      return `Soul ${lbl}`;
    }
    return gemLabel(it.gem, it.tier);
  }
  $: coinsTotalCopper = coinsToCopper({
    diamond: resources.diamond || 0,
    gold:    resources.gold    || 0,
    silver:  resources.silver  || 0,
    copper:  resources.copper  || 0
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Progress Summary -->
  <Card>
    <span slot="header">Progress Summary</span>
    <span slot="actions"><span class="badge badge-gold">{progress.pct}%</span></span>

    {#if targets.length === 0}
      <div class="text-slate-500 text-sm">
        No targets set. Add targets in the Materials Plan.
      </div>
    {:else}
      <div class="space-y-3">
        {#each progress.items as it}
          {@const pct = it.qty ? Math.round((it.completed / it.qty) * 100) : 0}
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-slate-200">
                {progressLabel(it)} x{it.qty}
              </span>
              <span class="text-arcane-accent2">{it.have}/{it.qty}</span>
            </div>
            <div class="progress"><div class="bar" style="width:{pct}%"></div></div>
          </div>
        {/each}

        <div class="pt-3 border-t border-arcane-border grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Targets</div>
            <div class="text-lg font-semibold">{fmt(progress.totalNeeded)}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Completed</div>
            <div class="text-lg font-semibold text-emerald-400">{fmt(progress.totalHave)}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Missing</div>
            <div class="text-lg font-semibold text-rose-400">
              {fmt(Math.max(0, progress.totalNeeded - progress.totalHave))}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </Card>

  <!-- Resource Summary -->
  <Card title="Resource Summary">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      {#each [
        { label: 'Ruby T1',     val: gemCount('ruby','1'),    cls: 'text-arcane-ruby' },
        { label: 'Topaz T1',    val: gemCount('topaz','1'),   cls: 'text-arcane-topaz' },
        { label: 'Jade T1',     val: gemCount('jade','1'),    cls: 'text-arcane-jade' },
        { label: 'Speed T1',    val: gemCount('speed','1'),   cls: 'text-sky-300' },
        { label: 'Charge T1',   val: gemCount('charge','1'),  cls: 'text-violet-300' },
        { label: 'Purified Crystal', val: resources.purified || 0,         cls: 'text-cyan-300' },
        { label: 'Brilliance Shard', val: resources.brilliance_shard || 0, cls: 'text-amber-300' },
      ] as r}
        <div class="bg-arcane-panel2 border border-arcane-border rounded-lg p-3">
          <div class="text-xs text-slate-400 uppercase tracking-wider">{r.label}</div>
          <div class="font-semibold text-base {r.cls}">{fmt(r.val)}</div>
        </div>
      {/each}
      <div class="bg-arcane-panel2 border border-arcane-border rounded-lg p-3">
        <div class="text-xs text-slate-400 uppercase tracking-wider">Coins</div>
        <div class="font-semibold text-base text-arcane-gold">{coinsString(coinsTotalCopper)}</div>
      </div>
    </div>
  </Card>
</div>

<div class="mt-4">
  <Card title="Quick Actions">
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" on:click={() => go('synthesis')}>Open Gem Synthesis</button>
      <button class="btn"             on:click={() => go('synthesis/soul')}>Soul Crystals</button>
      <button class="btn"             on:click={() => go('materials')}>Manage Targets</button>
      <button class="btn"             on:click={() => go('inventory')}>Edit Inventory</button>
      <button class="btn btn-gold"    on:click={() => go('fragneron')}>Fragneron Planner</button>
    </div>
  </Card>
</div>

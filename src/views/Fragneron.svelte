<script>
  import Card from '../components/Card.svelte';
  import Field from '../components/Field.svelte';
  import { bestFragneronMethods } from '../lib/calc.js';
  import { fmt, gemLabel, coinsString } from '../lib/utils.js';

  let target = 200;
  let mode = 'bound';   // default to bound (more useful in practice)
  let result = null;

  function calc() {
    if (!target || target < 1) { result = null; return; }
    result = bestFragneronMethods(target);
  }
  calc();

  function sumGems(g) { return Object.values(g).reduce((a,b)=>a+b,0); }

  /* Pick the best/cheapest within ONE mode (normal or bound) */
  function bestForMode(plan, m) {
    const list = plan[m] || [];
    if (!list.length) return null;
    const score = p =>
      sumGems(p.expanded.gems) + p.expanded.purified*5 + p.expanded.brilliance*100;
    const best = [...list].sort((a,b) => score(a) - score(b))[0];
    const cheapestPurified = [...list].sort((a,b) =>
      a.expanded.purified - b.expanded.purified)[0];
    const cheapestGems = [...list].sort((a,b) =>
      sumGems(a.expanded.gems) - sumGems(b.expanded.gems))[0];
    return { best, cheapestPurified, cheapestGems };
  }

  $: methodsForMode = result ? (result.plan[mode] || []) : [];
  $: summaryForMode = result ? bestForMode(result.plan, mode) : null;
</script>

<Card title="Fragneron Planner">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
    <Field label="Target Fragneron">
      <input type="number" min="1" class="input" bind:value={target} />
    </Field>
    <button class="btn btn-primary" on:click={calc}>Recalculate</button>
    <div class="text-xs text-slate-400">
      Each method shows the full base-tier breakdown to obtain the listed runs.
    </div>
  </div>

  <!-- Mode tabs -->
  <div class="mt-3 flex border-b border-arcane-border" role="tablist">
    <button
      role="tab"
      aria-selected={mode === 'bound'}
      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors
             {mode === 'bound'
               ? 'border-arcane-gold text-arcane-gold'
               : 'border-transparent text-slate-400 hover:text-slate-200'}"
      on:click={() => (mode = 'bound')}
    >
      Bound Exchange
    </button>
    <button
      role="tab"
      aria-selected={mode === 'normal'}
      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors
             {mode === 'normal'
               ? 'border-arcane-gold text-arcane-gold'
               : 'border-transparent text-slate-400 hover:text-slate-200'}"
      on:click={() => (mode = 'normal')}
    >
      Normal Exchange
    </button>
  </div>

  <p class="text-xs text-slate-500 mt-2">
    {#if mode === 'bound'}
      <strong>Bound</strong> exchange consumes account-bound gems (the kind most
      players grind themselves). It costs more raw materials but is what you'll
      actually use day-to-day.
    {:else}
      <strong>Normal</strong> exchange uses tradeable gems and is always cheaper
      in raw materials, but those gems usually have to be bought from the market.
    {/if}
  </p>
</Card>

{#if result}
  <!-- Summary cards (best in selected mode) -->
  {#if summaryForMode}
    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card title="Best Overall" extraClass="border-arcane-gold">
        <div class="text-sm space-y-1">
          <div class="text-arcane-gold font-semibold">
            {summaryForMode.best.method}
          </div>
          <div>Runs: {fmt(summaryForMode.best.runs)} -
            Yields: {fmt(summaryForMode.best.totalFragneron)} fragneron</div>
          <div class="text-cyan-300">Purified: {fmt(summaryForMode.best.expanded.purified)}</div>
          <div class="text-amber-300">Brilliance: {fmt(summaryForMode.best.expanded.brilliance)}</div>
          <div class="text-orange-300">Coins: {coinsString(summaryForMode.best.expanded.copper)}</div>
          <div class="text-slate-400">Total base gems: {fmt(sumGems(summaryForMode.best.expanded.gems))}</div>
        </div>
      </Card>

      <Card title="Cheapest Purified Crystal">
        <div class="text-sm space-y-1">
          <div class="text-arcane-gold font-semibold">
            {summaryForMode.cheapestPurified.method}
          </div>
          <div>Runs: {fmt(summaryForMode.cheapestPurified.runs)} -
            Yields: {fmt(summaryForMode.cheapestPurified.totalFragneron)} fragneron</div>
          <div class="text-cyan-300">Purified: {fmt(summaryForMode.cheapestPurified.expanded.purified)}</div>
          <div class="text-amber-300">Brilliance: {fmt(summaryForMode.cheapestPurified.expanded.brilliance)}</div>
          <div class="text-orange-300">Coins: {coinsString(summaryForMode.cheapestPurified.expanded.copper)}</div>
          <div class="text-slate-400">Total base gems: {fmt(sumGems(summaryForMode.cheapestPurified.expanded.gems))}</div>
        </div>
      </Card>

      <Card title="Cheapest Gems">
        <div class="text-sm space-y-1">
          <div class="text-arcane-gold font-semibold">
            {summaryForMode.cheapestGems.method}
          </div>
          <div>Runs: {fmt(summaryForMode.cheapestGems.runs)} -
            Yields: {fmt(summaryForMode.cheapestGems.totalFragneron)} fragneron</div>
          <div class="text-cyan-300">Purified: {fmt(summaryForMode.cheapestGems.expanded.purified)}</div>
          <div class="text-amber-300">Brilliance: {fmt(summaryForMode.cheapestGems.expanded.brilliance)}</div>
          <div class="text-orange-300">Coins: {coinsString(summaryForMode.cheapestGems.expanded.copper)}</div>
          <div class="text-slate-400">Total base gems: {fmt(sumGems(summaryForMode.cheapestGems.expanded.gems))}</div>
        </div>
      </Card>
    </div>
  {/if}

  <!-- All methods in the selected mode -->
  <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
    {#each methodsForMode as m}
      <Card>
        <span slot="header">{m.method}</span>
        <span slot="actions"><span class="badge">{fmt(m.runs)} runs</span></span>

        <div class="space-y-3">
          <div>
            <div class="font-semibold text-arcane-accent2 mb-1 text-sm">Direct Cost</div>
            <ul class="space-y-1 text-sm">
              {#each m.direct as d}
                <li class="flex justify-between">
                  <span>{gemLabel(d.gem, d.tier)}</span>
                  <span class="text-arcane-accent2 font-semibold">x{fmt(d.qty)}</span>
                </li>
              {/each}
              <li class="flex justify-between text-cyan-300">
                <span>Purified Crystal (run cost)</span>
                <span class="font-semibold">x{fmt((m.purifiedPerRun || 0) * m.runs)}</span>
              </li>
            </ul>
          </div>

          <div>
            <div class="font-semibold text-arcane-accent2 mb-1 text-sm">Fully Expanded (T1 base)</div>
            <ul class="space-y-0.5 text-sm">
              {#each Object.entries(m.expanded.gems).sort((a,b)=>b[1]-a[1]).filter(([,q]) => q > 0) as [k, q]}
                {@const [g, t] = k.split('|')}
                <li class="flex justify-between">
                  <span class="text-slate-300">{gemLabel(g, t)}</span>
                  <span class="text-arcane-accent2 font-semibold">x{fmt(q)}</span>
                </li>
              {/each}
            </ul>
            <div class="mt-2 text-xs text-slate-400 space-y-0.5">
              <div>Purified Crystal total: {fmt(m.expanded.purified)}</div>
              <div>Brilliance Shard total: {fmt(m.expanded.brilliance)}</div>
              <div>Coins total: {coinsString(m.expanded.copper)}</div>
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}

<script>
  import { onMount } from 'svelte';
  import Card from '../components/Card.svelte';
  import { state, setEquipmentSocket, ensureEquipmentShape } from '../lib/stores.js';
  import { data } from '../lib/data.js';
  import { tierLabel, fmt, gemLabel } from '../lib/utils.js';

  const STAT_ORDER = [
    'PATK','MATK','HP','PDEF','MDEF','Heal',
    'Crit','Crit Damage','Crit Defense',
    'Attack Speed','Cast Speed','HP Regen'
  ];

  onMount(() => ensureEquipmentShape(data.equipmentSlots));

  /* Picker modal state */
  let pickerOpen = false;
  let pickerSlotKey = null;
  let pickerSlotDef = null;
  let pickerIdx = 0;
  let pickerGem = 'ruby';
  let pickerTier = '1';

  function openPicker(slotKey, slotDef, idx, current) {
    pickerSlotKey = slotKey;
    pickerSlotDef = slotDef;
    pickerIdx = idx;
    pickerGem  = current ? current.gem  : eligibleGemKeys(slotDef)[0];
    pickerTier = current ? current.tier : '1';
    pickerOpen = true;
  }

  function eligibleGemKeys(slotDef) {
    return Object.entries(data.allGems)
      .filter(([k, g]) => !g.slot || g.slot.some(s => slotDef.accepts.includes(s)))
      .map(([k]) => k);
  }

  function eligibleTiers(gemKey) {
    const g = data.allGems[gemKey];
    return data.tierOrder.filter(t => Object.keys(g.tiers).includes(t));
  }

  $: if (pickerOpen && pickerGem) {
    const tiers = eligibleTiers(pickerGem);
    if (!tiers.includes(pickerTier)) pickerTier = tiers[0];
  }

  function applyPicker() {
    setEquipmentSocket(pickerSlotKey, pickerIdx, { gem: pickerGem, tier: pickerTier });
    pickerOpen = false;
  }
  function clearPicker() {
    setEquipmentSocket(pickerSlotKey, pickerIdx, null);
    pickerOpen = false;
  }

  /* Stats aggregation */
  $: stats = (() => {
    const out = {};
    const eq = $state.equipment;
    for (const slotKey of Object.keys(data.equipmentSlots)) {
      for (const entry of (eq[slotKey] || [])) {
        if (!entry) continue;
        const g = data.allGems[entry.gem];
        if (!g || !g.tiers[entry.tier]) continue;
        out[g.stat] = (out[g.stat] || 0) + g.tiers[entry.tier];
      }
    }
    return out;
  })();
</script>

<Card title="Total Stats">
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
    {#each STAT_ORDER as s}
      <div class="bg-arcane-panel2 border border-arcane-border rounded-lg p-3">
        <div class="text-[10px] uppercase tracking-wider text-slate-400">{s}</div>
        <div class="text-lg font-semibold text-arcane-gold">{fmt(stats[s] || 0)}</div>
      </div>
    {/each}
  </div>
</Card>

<div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {#each Object.entries(data.equipmentSlots) as [slotKey, slot]}
    <Card>
      <span slot="header">{slot.name}</span>
      <span slot="actions"><span class="badge">{slot.sockets} sockets</span></span>
      <div class="flex flex-wrap gap-2">
        {#each ($state.equipment[slotKey] || new Array(slot.sockets).fill(null)) as entry, idx}
          <div
            class="socket {entry ? 'filled' : ''}"
            title={entry ? gemLabel(entry.gem, entry.tier) : 'Click to assign'}
            on:click={() => openPicker(slotKey, slot, idx, entry)}
            role="button" tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && openPicker(slotKey, slot, idx, entry)}
          >
            {#if entry}
              {data.allGems[entry.gem].name.substring(0, 4)}{'\n'}{tierLabel(entry.tier)}
            {:else}
              +
            {/if}
          </div>
        {/each}
      </div>
    </Card>
  {/each}
</div>

{#if pickerOpen}
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    on:click|self={() => (pickerOpen = false)}
    role="dialog"
  >
    <div class="card w-full max-w-md">
      <div class="card-header">Assign Gem</div>
      <div class="card-body space-y-3">
        <div class="font-semibold text-arcane-gold">
          {pickerSlotDef.name} - Socket {pickerIdx + 1}
        </div>

        <div>
          <label class="text-xs uppercase text-slate-400 block mb-1">Gem</label>
          <select class="select" bind:value={pickerGem}>
            {#each eligibleGemKeys(pickerSlotDef) as k}
              <option value={k}>{data.allGems[k].name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="text-xs uppercase text-slate-400 block mb-1">Tier</label>
          <select class="select" bind:value={pickerTier}>
            {#each eligibleTiers(pickerGem) as t}
              <option value={t}>{tierLabel(t)}</option>
            {/each}
          </select>
        </div>

        <div class="flex gap-2 pt-2">
          <button class="btn btn-primary flex-1" on:click={applyPicker}>Apply</button>
          <button class="btn btn-danger" on:click={clearPicker}>Clear</button>
          <button class="btn" on:click={() => (pickerOpen = false)}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<script>
  import GemSynthesis from './GemSynthesis.svelte';
  import SoulCrystals from './SoulCrystals.svelte';

  /* Tab key from the parent (driven by URL hash). 'gem' | 'soul' */
  export let tab = 'gem';

  function setTab(t) {
    /* Update URL so refresh / share keeps the tab. */
    location.hash = t === 'soul' ? '#synthesis/soul' : '#synthesis';
  }
</script>

<!-- Tabs -->
<div class="flex border-b border-arcane-border" role="tablist" aria-label="Synthesis kind">
  <button
    role="tab"
    aria-selected={tab === 'gem'}
    class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors
           {tab === 'gem'
             ? 'border-arcane-gold text-arcane-gold'
             : 'border-transparent text-slate-400 hover:text-slate-200'}"
    on:click={() => setTab('gem')}
  >
    Gem
  </button>
  <button
    role="tab"
    aria-selected={tab === 'soul'}
    class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors
           {tab === 'soul'
             ? 'border-arcane-gold text-arcane-gold'
             : 'border-transparent text-slate-400 hover:text-slate-200'}"
    on:click={() => setTab('soul')}
  >
    Soul Crystal
  </button>
</div>

<div class="mt-4">
  {#if tab === 'soul'}
    <SoulCrystals />
  {:else}
    <GemSynthesis />
  {/if}
</div>

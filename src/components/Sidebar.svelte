<script>
  import Icon from './Icon.svelte';
  export let nav = [];
  export let active = 'dashboard';
  export let open = false;

  function go(id) {
    location.hash = '#' + id;
    open = false;
  }
</script>

<aside
  class="fixed md:static inset-y-0 left-0 z-40 w-64 bg-arcane-panel border-r border-arcane-border
         transform transition-transform duration-200 flex flex-col
         {open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}"
>
  <div class="px-5 py-5 border-b border-arcane-border">
    <h1 class="font-display text-xl text-arcane-gold tracking-wider leading-tight">CS:Nova</h1>
    <p class="text-xs text-arcane-accent2 uppercase tracking-widest">Utility</p>
  </div>

  <nav class="flex-1 py-3 overflow-y-auto">
    {#each nav as item}
      <a
        href="#{item.id}"
        class="nav-item {active === item.id ? 'active' : ''}"
        on:click|preventDefault={() => go(item.id)}
      >
        <Icon name={item.id} />
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="px-4 py-3 border-t border-arcane-border text-xs text-slate-500">
    v1.0 · static build
  </div>
</aside>

{#if open}
  <div
    class="fixed inset-0 bg-black/60 z-30 md:hidden"
    on:click={() => (open = false)}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Escape' && (open = false)}
    aria-label="Close menu"
  ></div>
{/if}

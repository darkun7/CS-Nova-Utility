<script>
  import { gemLabel, fmt, COIN_EMOJI } from '../lib/utils.js';
  import { soulConfig } from '../lib/soul.js';
  import Self from './FusionTreeNode.svelte';

  export let node;
  export let expanded = true;

  let isOpen = expanded;

  $: hasChildren = node.children && node.children.length > 0;
  $: dr = node.direct;
  $: missing = node.missing != null ? node.missing : node.qty;
  $: owned   = node.owned   || 0;
  $: fullyOwned = owned > 0 && missing === 0;

  /* Label switches based on node kind:
     - Soul crystal nodes are flagged with node.gem === 'soul'
     - Everything else is treated as a gem and uses gemLabel() */
  $: label = node.gem === 'soul'
    ? (soulConfig().tiers[node.tier]?.label || `Tier ${node.tier}`)
    : gemLabel(node.gem, node.tier);

  function toggle() {
    if (hasChildren) isOpen = !isOpen;
  }
</script>

<li class:opacity-70={fullyOwned}>
  <span class="tree-toggle"
        on:click={toggle}
        role="button" tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && toggle()}>
    {hasChildren ? (isOpen ? '▾' : '▸') : '·'}
  </span>

  <span>
    <span class="text-slate-200">{label}</span>
    <span class="text-arcane-accent2 font-semibold ml-1">x{fmt(node.qty)}</span>
  </span>

  {#if owned > 0}
    <span class="ml-2 text-xs text-emerald-400">
      ✓ {fmt(owned)} owned{#if missing > 0}, {fmt(missing)} to make{/if}
    </span>
  {/if}

  {#if !fullyOwned && dr && (dr.purified || dr.brilliance || dr.copper)}
    <span class="ml-2 text-xs text-slate-500">
      (
      {#if dr.purified}+{dr.purified * missing} purified{/if}
      {#if dr.brilliance}{dr.purified ? ', ' : ''}+{dr.brilliance * missing} brilliance{/if}
      {#if dr.copper}{(dr.purified || dr.brilliance) ? ', ' : ''}+{fmt(dr.copper * missing)} {COIN_EMOJI.copper}{/if}
      )
    </span>
  {/if}

  {#if hasChildren && isOpen}
    <ul>
      {#each node.children as child}
        <Self node={child} expanded={false} />
      {/each}
    </ul>
  {/if}
</li>

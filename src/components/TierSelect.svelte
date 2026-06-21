<script>
  import { data } from '../lib/data.js';
  import { tierLabel } from '../lib/utils.js';

  export let gem = 'ruby';
  export let value = '1';

  $: gemDef = data.allGems[gem];
  $: tiers = gemDef
    ? data.tierOrder.filter(t => Object.keys(gemDef.tiers).includes(t))
    : [];

  // If current value isn't valid for this gem, fall back to last available
  $: if (tiers.length && !tiers.includes(value)) {
    value = tiers[tiers.length - 1];
  }
</script>

<select class="select" bind:value>
  {#each tiers as t}
    <option value={t}>{tierLabel(t)}</option>
  {/each}
</select>

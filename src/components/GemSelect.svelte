<script>
  import { data } from '../lib/data.js';
  import { tierLabel } from '../lib/utils.js';

  export let value = 'ruby';
  export let onlyKeys = null; // optional restriction

  $: gemKeys = onlyKeys || Object.keys(data.allGems);
</script>

<select class="select" bind:value>
  {#each gemKeys as k}
    <option value={k}>{data.allGems[k].name}</option>
  {/each}
</select>

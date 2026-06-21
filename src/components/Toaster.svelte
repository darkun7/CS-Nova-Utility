<script>
  import { toasts } from '../lib/stores.js';
  import { fly } from 'svelte/transition';
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
  {#each $toasts as t (t.id)}
    <div class="toast {t.type}" in:fly={{ x: 20, duration: 180 }} out:fly={{ x: 20, duration: 180 }}>
      {t.message}
    </div>
  {/each}
</div>

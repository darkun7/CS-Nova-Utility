<script>
  export let title = '';
  export let extraClass = '';
</script>

<div class="card {extraClass}">
  {#if title || $$slots.header}
    <div class="card-header flex items-center justify-between">
      {#if $$slots.header}
        <slot name="header" />
      {:else}
        <span>{title}</span>
      {/if}
      <slot name="actions" />
    </div>
  {/if}
  <div class="card-body">
    <slot />
  </div>
</div>

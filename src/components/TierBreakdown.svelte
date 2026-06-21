<script>
  import { createEventDispatcher, tick } from 'svelte';
  import { fmt, gemLabel, tierBreakdown } from '../lib/utils.js';

  export let gem;
  export let baseQty;       // qty at T1
  export let open = false;

  const dispatch = createEventDispatcher();

  $: rows = tierBreakdown(baseQty);

  let triggerEl;
  let popoverEl;
  let popStyle = '';

  /* Position the popover in viewport coordinates next to the trigger.
     Uses position: fixed so no ancestor overflow/sidebar can clip it. */
  async function position() {
    if (!open || !triggerEl) return;
    await tick(); // wait for popover to be in the DOM so we can measure

    const tr = triggerEl.getBoundingClientRect();
    const popW = (popoverEl && popoverEl.offsetWidth)  || 256;
    const popH = (popoverEl && popoverEl.offsetHeight) || 240;

    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: place to the right of the trigger, aligned to its top.
    let left = tr.right + margin;
    let top  = tr.top;

    // If overflows right edge, place to the LEFT of the trigger instead.
    if (left + popW > vw - margin) {
      left = tr.left - margin - popW;
    }
    // If still overflows the left (very narrow screen), pin to viewport edge.
    if (left < margin) left = margin;

    // Clamp vertically so it stays on screen.
    if (top + popH > vh - margin) top = vh - popH - margin;
    if (top < margin) top = margin;

    popStyle =
      `position: fixed; left: ${Math.round(left)}px; top: ${Math.round(top)}px;`;
  }

  // Reposition when opening, on resize, and on scroll
  $: if (open) position();

  function onWindow() {
    if (open) position();
  }

  function toggle() { dispatch('toggle'); }
  function close()  { dispatch('close'); }

  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<svelte:window on:resize={onWindow} on:scroll={onWindow} />

<button
  bind:this={triggerEl}
  type="button"
  class="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full
         border border-arcane-border text-[11px] text-arcane-accent2
         hover:bg-arcane-panel2 hover:border-arcane-accent
         {open ? 'bg-arcane-panel2 border-arcane-accent' : ''}"
  title="Show per-tier alternatives"
  aria-label="Show per-tier alternatives for {gem}"
  aria-expanded={open}
  on:click|stopPropagation={toggle}
  on:keydown={onKey}
>
  {open ? '×' : 'ⓘ'}
</button>

{#if open}
  <!-- Click-away backdrop. Sits above the sidebar (z-40) so taps outside
       the popover always close it, even on mobile when the sidebar is open. -->
  <div
    class="fixed inset-0 z-40"
    on:click={close}
    role="presentation"
  ></div>

  <div
    bind:this={popoverEl}
    class="z-50 w-64 max-w-[calc(100vw-1rem)]
           bg-arcane-panel border border-arcane-border rounded-lg
           shadow-xl p-2 text-xs"
    style={popStyle}
    role="dialog"
  >
    <div class="text-arcane-accent2 font-semibold mb-1 px-1">
      {gemLabel(gem, '1')} alternatives
    </div>
    <div class="text-slate-500 mb-2 px-1">
      Equivalent quantity if owned at higher tier:
    </div>
    <table class="w-full">
      <tbody>
        {#each rows as r}
          <tr class="hover:bg-arcane-panel2">
            <td class="py-0.5 px-1 text-slate-300 whitespace-nowrap">
              T{r.tier}
            </td>
            <td class="py-0.5 px-1 text-right text-arcane-accent2 font-semibold">
              x{fmt(r.qty)}
            </td>
            <td class="py-0.5 px-1 text-right text-slate-500">
              = {fmt(r.factor)}× T1
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

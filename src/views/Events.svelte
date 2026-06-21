<script>
  import { onMount, onDestroy } from 'svelte';
  import Card from '../components/Card.svelte';
  import { toast } from '../lib/stores.js';
  import { formatCountdown, diffForHumans } from '../lib/utils.js';

  /* Source of truth for the events feed. */
  const EVENTS_URL =
    'https://script.googleusercontent.com/macros/echo' +
    '?user_content_key=AUkAhnRG6D_YlyYdyK71ZTfmSPgPXcoUYXgllo_H7-o3vxRFaCSo2uHpUtXVWm6HGzK9Yb7j1zCHYqXhWiHib3jOHhwXlg7AvqkTL3OrCvkUbUeQlvXFAET__jJEzLHiYPBn78mMoLWyvtEHvTBq2SegGnLSkSvoBxpH6OPU1Ks7SSbTZTTCFrqt9diUGpscnsi0xlsIoFaOG00NHgAzobeq2otzxbgtkDaw8M2VVzNikOA1ejikaaoU78zLJiSAd3VGN4dKYAnW_64ccn0jvnBmL4iqXin-Mg' +
    '&lib=MJ-WxscKk8CCxLG9A5Acarf1AKxgSVOtc';

  /* Server is GMT-4, user clock for the planned target is GMT+7.
     We always compute event UTC instants from serverTime to avoid drift. */
  const SERVER_OFFSET_HOURS = -4;   // server clock minus UTC
  const LOCAL_OFFSET_HOURS  = 7;    // displayed "local" clock (GMT+7)

  let raw = null;            // last successful payload
  let loading = true;
  let error = '';
  let now = Date.now();
  let lastFetched = null;
  let category = 'all';
  let refreshTimer;
  let tickTimer;

  /* ----- Time math --------------------------------------------------- */

  /* Next UTC ms at which the server clock reads HH:MM today/tomorrow. */
  function nextOccurrenceUTC(hhmm, fromMs) {
    const [h, m] = hhmm.split(':').map(Number);
    const from = new Date(fromMs);
    /* The UTC hour matching server HH:MM today. */
    const utcH = (h - SERVER_OFFSET_HOURS + 24) % 24;
    let target = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      utcH, m, 0, 0
    );
    /* If we crossed midnight (server day is offset from UTC day) the
       computed instant may be in the past; bump by 24h until it is in
       the future of `fromMs`. */
    while (target <= fromMs) target += 24 * 60 * 60 * 1000;
    return target;
  }

  /* Format an absolute UTC ms as HH:MM in a fixed UTC-offset zone. */
  function fmtAtOffset(utcMs, offsetHours) {
    const d = new Date(utcMs + offsetHours * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  /* Render in the actual machine timezone too (handy if user isn't on GMT+7). */
  function fmtBrowserLocal(utcMs) {
    return new Date(utcMs).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  /* ----- Data load --------------------------------------------------- */

  async function load(showToast = false) {
    try {
      loading = !raw;
      error = '';
      /* Cache-buster keeps the Apps Script CDN from pinning a stale copy. */
      const res = await fetch(EVENTS_URL + '&_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json || !json.success || !Array.isArray(json.events)) {
        throw new Error('Malformed payload');
      }
      raw = json;
      lastFetched = Date.now();
      if (showToast) toast('Events refreshed', 'success');
    } catch (e) {
      error = e.message || String(e);
      if (showToast) toast('Refresh failed: ' + error, 'error');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    /* Live countdown ticks each second; data refresh every 5 minutes. */
    tickTimer    = setInterval(() => (now = Date.now()), 1000);
    refreshTimer = setInterval(() => load(false), 5 * 60 * 1000);
  });

  onDestroy(() => {
    clearInterval(tickTimer);
    clearInterval(refreshTimer);
  });

  /* ----- Derived view model ------------------------------------------ */

  $: enriched = (raw?.events || [])
    .filter(e => e && e.enabled !== false && e.serverTime)
    .map(e => {
      const nextUtc = nextOccurrenceUTC(e.serverTime, now);
      return {
        ...e,
        nextUtc,
        msLeft:        nextUtc - now,
        serverDisplay: fmtAtOffset(nextUtc, SERVER_OFFSET_HOURS), // GMT-4
        localDisplay:  fmtAtOffset(nextUtc, LOCAL_OFFSET_HOURS),  // GMT+7
        browserDisplay: fmtBrowserLocal(nextUtc)
      };
    })
    .sort((a, b) => a.msLeft - b.msLeft);

  $: categories = ['all', ...Array.from(new Set(enriched.map(e => e.category)))];

  $: visible = category === 'all'
    ? enriched
    : enriched.filter(e => e.category === category);

  $: nextUp = enriched[0];

  /* Visual urgency: <= 10 minutes => imminent; <= 1 hour => soon. */
  function urgencyClass(ms) {
    if (ms <= 10 * 60 * 1000) return 'text-rose-300';
    if (ms <= 60 * 60 * 1000) return 'text-amber-300';
    return 'text-arcane-accent2';
  }

  function categoryBadge(cat) {
    /* Tailwind utility classes layered on .badge — keeps colors close to
       the existing palette without relying on undefined badge-* variants. */
    switch (cat) {
      case 'PVP':    return 'bg-rose-900/40 text-rose-200 border-rose-700/50';
      case 'Boss':   return 'badge-gold';
      case 'Guild':  return 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50';
      case 'Timed':  return 'bg-amber-900/40 text-amber-200 border-amber-700/50';
      case 'Events': return 'bg-sky-900/40 text-sky-200 border-sky-700/50';
      default:       return '';
    }
  }
</script>

<div class="space-y-4">
  <!-- Hero / next-up card -->
  <Card>
    <span slot="header">Upcoming Events</span>
    <span slot="actions">
      <button class="btn" on:click={() => load(true)} disabled={loading}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </span>

    {#if error && !raw}
      <div class="text-rose-300 text-sm">Failed to load events: {error}</div>
    {:else if !raw}
      <div class="text-slate-500 text-sm">Loading…</div>
    {:else if !nextUp}
      <div class="text-slate-500 text-sm">No active events.</div>
    {:else}
      <div class="grid md:grid-cols-2 gap-4 items-center">
        <div>
          <div class="text-xs text-slate-400 uppercase tracking-widest">Next up</div>
          <div class="text-xl md:text-2xl font-semibold text-arcane-gold">
            {nextUp.event}
          </div>
          <div class="mt-1 text-sm text-slate-300">
            <span class="badge {categoryBadge(nextUp.category)}">{nextUp.category}</span>
            <span class="ml-2">{nextUp.message || ''}</span>
          </div>
          <div class="mt-3 text-sm text-slate-400">
            Starts {diffForHumans(nextUp.msLeft)}
          </div>
        </div>
        <div class="text-center md:text-right">
          <div class="text-xs text-slate-400 uppercase tracking-widest">Countdown</div>
          <div class="font-display text-4xl md:text-5xl tracking-wider {urgencyClass(nextUp.msLeft)}">
            {formatCountdown(nextUp.msLeft)}
          </div>
          <div class="mt-1 text-xs text-slate-500">
            Server {nextUp.serverDisplay} · Local {nextUp.localDisplay}
          </div>
        </div>
      </div>
    {/if}
  </Card>

  <!-- Category filter -->
  {#if raw && categories.length > 1}
    <div class="flex flex-wrap gap-2">
      {#each categories as c}
        <button
          class="btn {category === c ? 'btn-primary' : ''}"
          on:click={() => (category = c)}
        >{c === 'all' ? 'All' : c}</button>
      {/each}
    </div>
  {/if}

  <!-- Full list -->
  <Card title="Schedule">
    <span slot="actions">
      {#if lastFetched}
        <span class="text-xs text-slate-500">
          Updated {diffForHumans(lastFetched - now)}
        </span>
      {/if}
    </span>

    {#if !raw}
      <div class="text-slate-500 text-sm">Loading…</div>
    {:else if visible.length === 0}
      <div class="text-slate-500 text-sm">No events in this category.</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-arcane-border">
              <th class="py-2 pr-3">Event</th>
              <th class="py-2 pr-3">Category</th>
              <th class="py-2 pr-3">Server (GMT-4)</th>
              <th class="py-2 pr-3">Local (GMT+7)</th>
              <th class="py-2 pr-3">Starts</th>
              <th class="py-2 pr-3 text-right">Countdown</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as ev}
              <tr class="border-b border-arcane-border/50 hover:bg-arcane-panel2/40">
                <td class="py-2 pr-3">
                  <div class="text-slate-100">{ev.event}</div>
                  {#if ev.message}
                    <div class="text-xs text-slate-500">{ev.message}</div>
                  {/if}
                </td>
                <td class="py-2 pr-3">
                  <span class="badge {categoryBadge(ev.category)}">{ev.category}</span>
                </td>
                <td class="py-2 pr-3 tabular-nums text-slate-300">{ev.serverDisplay}</td>
                <td class="py-2 pr-3 tabular-nums text-slate-300">{ev.localDisplay}</td>
                <td class="py-2 pr-3 text-slate-400">{diffForHumans(ev.msLeft)}</td>
                <td class="py-2 pr-3 text-right tabular-nums font-semibold {urgencyClass(ev.msLeft)}">
                  {formatCountdown(ev.msLeft)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <p class="text-xs text-slate-500">
    Source: chronosphere events feed · server time GMT-4 · local time GMT+7.
    Auto-refreshes every 5 minutes.
  </p>
</div>

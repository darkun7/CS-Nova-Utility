<script>
  import { onMount, onDestroy } from 'svelte';
  import Card from '../components/Card.svelte';
  import { toast } from '../lib/stores.js';
  import { formatCountdown, diffForHumans } from '../lib/utils.js';

  const EVENTS_URL =
    'https://script.googleusercontent.com/macros/echo' +
    '?user_content_key=AUkAhnRG6D_YlyYdyK71ZTfmSPgPXcoUYXgllo_H7-o3vxRFaCSo2uHpUtXVWm6HGzK9Yb7j1zCHYqXhWiHib3jOHhwXlg7AvqkTL3OrCvkUbUeQlvXFAET__jJEzLHiYPBn78mMoLWyvtEHvTBq2SegGnLSkSvoBxpH6OPU1Ks7SSbTZTTCFrqt9diUGpscnsi0xlsIoFaOG00NHgAzobeq2otzxbgtkDaw8M2VVzNikOA1ejikaaoU78zLJiSAd3VGN4dKYAnW_64ccn0jvnBmL4iqXin-Mg' +
    '&lib=MJ-WxscKk8CCxLG9A5Acarf1AKxgSVOtc';

  const SERVER_OFFSET_HOURS = -4;
  const LOCAL_OFFSET_HOURS  = 7;

  let raw = null;
  let loading = true;
  let error = '';
  let now = Date.now();
  let lastFetched = null;
  let category = 'all';
  let section = 'upcoming'; // 'upcoming' | 'recent'
  let refreshTimer;
  let tickTimer;
  let notified = new Set();

  /* ----- Browser notifications --------------------------------------- */

  function requestNotifyPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  function sendNotify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: '/cs-util-logo.png' }); } catch (e) {}
  }

  function checkNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    for (const ev of enrichedUpcoming) {
      if (ev.msLeft > 0 && ev.msLeft <= 1500) {
        const key = ev.event + '@' + new Date(ev.nextUtc).toISOString().slice(0, 10) + '-' + ev.serverTime;
        if (!notified.has(key)) {
          notified.add(key);
          sendNotify(ev.event, ev.message || `${ev.category} event starting now!`);
        }
      }
    }
  }

  /* ----- Time math --------------------------------------------------- */

  function nextOccurrenceUTC(hhmm, fromMs) {
    const [h, m] = hhmm.split(':').map(Number);
    const from = new Date(fromMs);
    const utcH = (h - SERVER_OFFSET_HOURS + 24) % 24;
    let target = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      utcH, m, 0, 0
    );
    while (target <= fromMs) target += 24 * 60 * 60 * 1000;
    return target;
  }

  function previousOccurrenceUTC(hhmm, fromMs) {
    const [h, m] = hhmm.split(':').map(Number);
    const from = new Date(fromMs);
    const utcH = (h - SERVER_OFFSET_HOURS + 24) % 24;
    let target = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      utcH, m, 0, 0
    );
    while (target > fromMs) target -= 24 * 60 * 60 * 1000;
    return target;
  }

  function fmtAtOffset(utcMs, offsetHours) {
    const d = new Date(utcMs + offsetHours * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

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
    requestNotifyPermission();
    tickTimer    = setInterval(() => {
      now = Date.now();
      checkNotifications();
    }, 1000);
    refreshTimer = setInterval(() => load(false), 5 * 60 * 1000);
  });

  onDestroy(() => {
    clearInterval(tickTimer);
    clearInterval(refreshTimer);
  });

  /* ----- Derived view model ------------------------------------------ */

  $: enrichedUpcoming = (raw?.events || [])
    .filter(e => e && e.enabled !== false && e.serverTime)
    .map(e => {
      const nextUtc = nextOccurrenceUTC(e.serverTime, now);
      return {
        ...e,
        nextUtc,
        msLeft:        nextUtc - now,
        serverDisplay: fmtAtOffset(nextUtc, SERVER_OFFSET_HOURS),
        localDisplay:  fmtAtOffset(nextUtc, LOCAL_OFFSET_HOURS),
        browserDisplay: fmtBrowserLocal(nextUtc)
      };
    })
    .sort((a, b) => a.msLeft - b.msLeft);

  $: enrichedRecent = (raw?.events || [])
    .filter(e => e && e.enabled !== false && e.serverTime)
    .map(e => {
      const prevUtc = previousOccurrenceUTC(e.serverTime, now);
      const msAgo = now - prevUtc;
      return {
        ...e,
        prevUtc,
        msAgo,
        serverDisplay: fmtAtOffset(prevUtc, SERVER_OFFSET_HOURS),
        localDisplay:  fmtAtOffset(prevUtc, LOCAL_OFFSET_HOURS),
        browserDisplay: fmtBrowserLocal(prevUtc)
      };
    })
    .filter(e => e.msAgo >= 0 && e.msAgo <= 60 * 60 * 1000)
    .sort((a, b) => a.msAgo - b.msAgo);

  $: currentEnriched = section === 'upcoming' ? enrichedUpcoming : enrichedRecent;

  $: categories = ['all', ...Array.from(new Set(currentEnriched.map(e => e.category)))];

  $: visible = category === 'all'
    ? currentEnriched
    : currentEnriched.filter(e => e.category === category);

  $: nextUp = enrichedUpcoming[0];

  function urgencyClass(ms) {
    if (ms <= 10 * 60 * 1000) return 'text-rose-300';
    if (ms <= 60 * 60 * 1000) return 'text-amber-300';
    return 'text-arcane-accent2';
  }

  function categoryBadge(cat) {
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
  <!-- Section tabs -->
  <div class="flex gap-1 bg-arcane-panel2 rounded-lg p-1 border border-arcane-border w-fit">
    <button
      class="px-4 py-2 text-sm rounded-md font-medium transition-colors
             {section === 'upcoming' ? 'bg-arcane-panel text-arcane-gold shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
      on:click={() => (section = 'upcoming')}
    >Upcoming Events</button>
    <button
      class="px-4 py-2 text-sm rounded-md font-medium transition-colors
             {section === 'recent' ? 'bg-arcane-panel text-arcane-gold shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
      on:click={() => (section = 'recent')}
    >Recent Events</button>
  </div>

  <!-- Hero / next-up card -->
  <Card>
    <span slot="header">
      {section === 'upcoming' ? 'Upcoming Events' : 'Recent Events'}
    </span>
    <span slot="actions">
      <button class="btn" on:click={() => load(true)} disabled={loading}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </span>

    {#if error && !raw}
      <div class="text-rose-300 text-sm">Failed to load events: {error}</div>
    {:else if !raw}
      <div class="text-slate-500 text-sm">Loading…</div>
    {:else if section === 'upcoming'}
      {#if !nextUp}
        <div class="text-slate-500 text-sm">No upcoming events.</div>
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
    {:else}
      {#if enrichedRecent.length === 0}
        <div class="text-slate-500 text-sm">No events started in the last hour.</div>
      {:else}
        <div class="grid md:grid-cols-2 gap-4 items-center">
          <div>
            <div class="text-xs text-amber-400 uppercase tracking-widest">Running now</div>
            <div class="text-xl md:text-2xl font-semibold text-arcane-gold">
              {enrichedRecent[0].event}
            </div>
            <div class="mt-1 text-sm text-slate-300">
              <span class="badge {categoryBadge(enrichedRecent[0].category)}">{enrichedRecent[0].category}</span>
              <span class="ml-2">{enrichedRecent[0].message || ''}</span>
            </div>
            <div class="mt-3 text-sm text-slate-400">
              Started {diffForHumans(-enrichedRecent[0].msAgo)}
            </div>
          </div>
          <div class="text-center md:text-right">
            <div class="text-xs text-slate-400 uppercase tracking-widest">Elapsed</div>
            <div class="font-display text-4xl md:text-5xl tracking-wider text-emerald-400">
              {formatCountdown(enrichedRecent[0].msAgo)}
            </div>
            <div class="mt-1 text-xs text-slate-500">{diffForHumans(-enrichedRecent[0].msAgo)}</div>
          </div>
        </div>
      {/if}
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
  <Card title={section === 'upcoming' ? 'Schedule' : 'Recently Started'}>
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
    {:else if section === 'upcoming'}
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
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-arcane-border">
              <th class="py-2 pr-3">Event</th>
              <th class="py-2 pr-3">Category</th>
              <th class="py-2 pr-3">Server (GMT-4)</th>
              <th class="py-2 pr-3">Local (GMT+7)</th>
              <th class="py-2 pr-3">Started</th>
              <th class="py-2 pr-3 text-right">Elapsed</th>
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
                <td class="py-2 pr-3 text-slate-400">{diffForHumans(-ev.msAgo)}</td>
                <td class="py-2 pr-3 text-right tabular-nums font-semibold text-emerald-400">
                  {formatCountdown(ev.msAgo)}
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

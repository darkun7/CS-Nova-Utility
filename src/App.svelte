<script>
  import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import Toaster from './components/Toaster.svelte';
  import Icon from './components/Icon.svelte';

  import Dashboard from './views/Dashboard.svelte';
  import Synthesis from './views/Synthesis.svelte';
  import MaterialsPlan from './views/MaterialsPlan.svelte';
  import Fragneron from './views/Fragneron.svelte';
  import Inventory from './views/Inventory.svelte';
  import Equipment from './views/Equipment.svelte';
  import Settings  from './views/Settings.svelte';

  import { settings, state } from './lib/stores.js';

  const NAV = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'synthesis', label: 'Synthesis' },
    { id: 'materials', label: 'Materials Plan' },
    { id: 'fragneron', label: 'Fragneron Planner' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'equipment', label: 'Equipment Builder' },
    { id: 'settings',  label: 'Settings' }
  ];

  let active = 'dashboard';
  let synthesisTab = 'gem';   // 'gem' | 'soul', sub-route under #synthesis
  let menuOpen = false;

  /* Hash format:
     #dashboard, #materials, ...     -> a primary route
     #synthesis                       -> synthesis page, gem tab (default)
     #synthesis/soul                  -> synthesis page, soul tab
     #soul                            -> back-compat, redirects to #synthesis/soul */
  function readHash() {
    const raw = (location.hash || '').replace(/^#/, '');
    const [primary, sub] = raw.split('/');

    /* Back-compat: old #soul hash routes to the soul tab. */
    if (primary === 'soul') {
      synthesisTab = 'soul';
      active = 'synthesis';
      return;
    }

    if (NAV.find(n => n.id === primary)) {
      active = primary;
    } else {
      active = 'dashboard';
    }
    /* Pick up sub-route only when it makes sense for the active page. */
    if (active === 'synthesis') {
      synthesisTab = sub === 'soul' ? 'soul' : 'gem';
    }
  }

  onMount(() => {
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  });

  $: title = (NAV.find(n => n.id === active) || {}).label || '';

  /* Apply theme & compact dynamically */
  $: applyTheme($settings && $settings.theme);
  $: applyCompact($settings && $settings.compact);

  function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;
    if (theme === 'midnight') {
      root.style.setProperty('--arcane-bg', '#05060d');
      root.style.setProperty('--arcane-panel', '#0c1226');
      root.style.setProperty('--arcane-panel2', '#13193b');
      root.style.setProperty('--arcane-border', '#2a3370');
    } else if (theme === 'royal') {
      root.style.setProperty('--arcane-bg', '#0f0a1d');
      root.style.setProperty('--arcane-panel', '#1a1330');
      root.style.setProperty('--arcane-panel2', '#241944');
      root.style.setProperty('--arcane-border', '#5b3aa3');
    } else {
      root.style.setProperty('--arcane-bg', '#0b0814');
      root.style.setProperty('--arcane-panel', '#15101f');
      root.style.setProperty('--arcane-panel2', '#1d1530');
      root.style.setProperty('--arcane-border', '#3a2a55');
    }
  }
  function applyCompact(c) {
    document.body.classList.toggle('compact', !!c);
  }
</script>

<div class="flex min-h-screen">
  <Sidebar nav={NAV} {active} bind:open={menuOpen} />

  <main class="flex-1 flex flex-col min-w-0">
    <header class="bg-arcane-panel/80 backdrop-blur border-b border-arcane-border
                   px-3 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3 sticky top-0 z-20">
      <button
        class="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md
               border border-arcane-border bg-arcane-panel2 text-arcane-gold
               hover:bg-arcane-panel hover:border-arcane-accent
               active:bg-arcane-panel
               focus:outline-none focus-visible:ring-2 focus-visible:ring-arcane-accent"
        on:click={() => (menuOpen = !menuOpen)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
      </button>
      <h2 class="text-base md:text-2xl font-semibold text-arcane-accent2 tracking-wide truncate">
        {title}
      </h2>
    </header>

    <section class="flex-1 p-4 md:p-6 overflow-x-hidden">
      {#if active === 'dashboard'}<Dashboard />
      {:else if active === 'synthesis'}<Synthesis tab={synthesisTab} />
      {:else if active === 'materials'}<MaterialsPlan />
      {:else if active === 'fragneron'}<Fragneron />
      {:else if active === 'inventory'}<Inventory />
      {:else if active === 'equipment'}<Equipment />
      {:else if active === 'settings'}<Settings />
      {/if}
    </section>
  </main>
</div>

<Toaster />

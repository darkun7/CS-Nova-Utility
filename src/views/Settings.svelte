<script>
  import Card from '../components/Card.svelte';
  import {
    state, settings, setSetting, resetState,
    exportStateJSON, importStateJSON, toast
  } from '../lib/stores.js';
  import { downloadFile } from '../lib/utils.js';

  function exportJSON() {
    downloadFile('cs-planner-backup.json', exportStateJSON(), 'application/json');
    toast('Exported', 'success');
  }

  function importJSON(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importStateJSON(reader.result);
        toast('Imported', 'success');
      } catch (e) {
        toast('Invalid JSON: ' + e.message, 'error', 4000);
      }
    };
    reader.readAsText(file);
  }
</script>

<Card title="Data Management">
  <div class="flex flex-wrap gap-2">
    <button class="btn btn-primary" on:click={exportJSON}>Export JSON</button>

    <label class="btn cursor-pointer">
      Import JSON
      <input type="file" accept="application/json" class="hidden" on:change={importJSON} />
    </label>

    <button class="btn btn-danger" on:click={() => {
      if (confirm('Reset inventory to empty?')) {
        resetState('inventory');
        toast('Inventory reset', 'success');
      }
    }}>Reset Inventory</button>

    <button class="btn btn-danger" on:click={() => {
      if (confirm('Reset ALL data (inventory, targets, equipment)?')) {
        resetState();
        toast('All data reset', 'success');
      }
    }}>Reset All</button>
  </div>
</Card>

<div class="mt-4">
  <Card title="Display">
    <div class="space-y-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox"
               checked={$settings.compact}
               on:change={(e) => setSetting('compact', e.target.checked)} />
        Compact Mode
      </label>

      <div>
        <label class="text-xs uppercase text-slate-400 block mb-1">Theme</label>
        <select class="select w-48"
                value={$settings.theme}
                on:change={(e) => setSetting('theme', e.target.value)}>
          <option value="dark">Dark</option>
          <option value="midnight">Midnight</option>
          <option value="royal">Royal</option>
        </select>
      </div>
    </div>
  </Card>
</div>

<div class="mt-4">
  <Card title="About">
    <div class="text-sm text-slate-400 space-y-2">
      <p>CS:Nova Utility — a fan-made client-side companion app for Crystal Saga: Nova.</p>
      <p>
        All data lives in your browser via LocalStorage. Use the export/import
        controls above to back up or move your data.
      </p>
      <p class="text-xs">Built with Vite + Svelte. Output is fully static.</p>
    </div>
  </Card>
</div>

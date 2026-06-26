<script>
  import quiz from '../data/quiz.json';
  import Card from '../components/Card.svelte';

  let query = '';
  let searchIn = 'both'; // 'question' | 'answer' | 'both'
  let limit = 10;

  $: filtered = query.trim()
    ? quiz.filter(item => {
        const q = query.toLowerCase();
        const inQ = searchIn === 'both' || searchIn === 'question'
          ? item.question.toLowerCase().includes(q) : false;
        const inA = searchIn === 'both' || searchIn === 'answer'
          ? item.answer.toLowerCase().includes(q) : false;
        return inQ || inA;
      })
    : quiz;

  $: limited = query.trim() ? filtered : filtered.slice(0, limit);
  $: resultCount = limited.length;
</script>

<div class="space-y-4">
  <Card>
    <span slot="header">Quiz Search</span>
    <span slot="actions">
      <span class="text-xs text-slate-400">{resultCount} results</span>
    </span>

    <div class="flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs uppercase text-slate-400 mb-1 tracking-wider">Search</label>
        <input
          class="input"
          type="search"
          placeholder="Type query…"
          bind:value={query}
          autocomplete="off"
        />
      </div>
      <div>
        <label class="block text-xs uppercase text-slate-400 mb-1 tracking-wider">Search in</label>
        <select class="select" bind:value={searchIn}>
          <option value="both">Question & Answer</option>
          <option value="question">Question only</option>
          <option value="answer">Answer only</option>
        </select>
      </div>
    </div>
  </Card>

  <Card title="Results">
    {#if limited.length === 0}
      <div class="text-slate-500 text-sm">No matching questions.</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-arcane-border">
              <th class="py-2 pr-3 w-10">#</th>
              <th class="py-2 pr-3">Question</th>
              <th class="py-2 pr-3">Answer</th>
            </tr>
          </thead>
          <tbody>
            {#each limited as item, i}
              <tr class="border-b border-arcane-border/50 hover:bg-arcane-panel2/40">
                <td class="py-2 pr-3 text-slate-500 tabular-nums">{i + 1}</td>
                <td class="py-2 pr-3 text-slate-100">{item.question}</td>
                <td class="py-2 pr-3 text-arcane-accent2 font-medium">{item.answer}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

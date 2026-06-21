// utils.js — shared helpers
import { data } from './data.js';

/* Currency tiers (smallest -> largest):
   100 copper  = 1 silver
   100 silver  = 1 gold
   100 gold    = 1 diamond
   Internally we always store the value in the smallest unit ("copper"
   = 1 coin) for math, and convert for display.

   1 silver  = 100      copper
   1 gold    = 10,000   copper
   1 diamond = 1,000,000 copper
*/
export const COIN = {
  COPPER:  1,
  SILVER:  100,
  GOLD:    100 * 100,
  DIAMOND: 100 * 100 * 100
};

export const COIN_EMOJI = {
  copper:  '🟤',
  silver:  '⚪',
  gold:    '🟡',
  diamond: '💎'
};

export function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

export function tierLabel(t) {
  if (t === 'natural') return 'Natural';
  if (t === 'magical') return 'Magical';
  if (t === 'divine')  return 'Divine';
  return 'T' + t;
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function gemLabel(gemKey, tier) {
  const g = data.allGems[gemKey];
  const name = g ? g.name : capitalize(gemKey);
  if (tier === 'natural' || tier === 'magical' || tier === 'divine') {
    return `${capitalize(tier)} ${name}`;
  }
  return `${name} T${tier}`;
}

/* Break a copper-unit amount into diamond / gold / silver / copper. */
export function copperToCoins(copper) {
  copper = Math.max(0, Math.floor(copper));
  const diamond = Math.floor(copper / COIN.DIAMOND);
  copper -= diamond * COIN.DIAMOND;
  const gold = Math.floor(copper / COIN.GOLD);
  copper -= gold * COIN.GOLD;
  const silver = Math.floor(copper / COIN.SILVER);
  const cop = copper - silver * COIN.SILVER;
  return { diamond, gold, silver, copper: cop };
}

/* Add up a {diamond, gold, silver, copper} bag into total copper. */
export function coinsToCopper({ diamond = 0, gold = 0, silver = 0, copper = 0 }) {
  return diamond * COIN.DIAMOND + gold * COIN.GOLD
       + silver  * COIN.SILVER  + copper;
}

/* Compact human display, e.g. "💎2 🟡15 ⚪3 🟤7"  (skips zeros except final). */
export function coinsString(copper) {
  const c = copperToCoins(copper);
  const parts = [];
  if (c.diamond) parts.push(`${COIN_EMOJI.diamond}${fmt(c.diamond)}`);
  if (c.gold)    parts.push(`${COIN_EMOJI.gold}${fmt(c.gold)}`);
  if (c.silver)  parts.push(`${COIN_EMOJI.silver}${c.silver}`);
  // Always show the smallest unit so 0 isn't silent
  parts.push(`${COIN_EMOJI.copper}${c.copper}`);
  return parts.join(' ');
}

export function downloadFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return Promise.resolve();
}

/* Given a base T1 quantity, return the equivalent at each higher
   standard tier. T(n) is worth 3^(n-1) of T1, so qtyAt(n) = ceil(base/3^(n-1)).
   Used by the per-tier alternative breakdown popover. */
export function tierBreakdown(baseQty) {
  const out = [];
  for (let n = 1; n <= 10; n++) {
    const factor = Math.pow(3, n - 1);
    const qty = Math.ceil(baseQty / factor);
    out.push({ tier: String(n), factor, qty });
  }
  return out;
}

/* ---------- Human-readable durations (Carbon::diffForHumans-ish) ----------
   Inputs are milliseconds. Negative means past, positive means future. */

const _DUR_UNITS = [
  { k: 'year',   ms: 365 * 24 * 60 * 60 * 1000 },
  { k: 'month',  ms: 30  * 24 * 60 * 60 * 1000 },
  { k: 'week',   ms: 7   * 24 * 60 * 60 * 1000 },
  { k: 'day',    ms:       24 * 60 * 60 * 1000 },
  { k: 'hour',   ms:            60 * 60 * 1000 },
  { k: 'minute', ms:                 60 * 1000 },
  { k: 'second', ms:                      1000 }
];

/* humanizeDuration(ms, { parts: 2, short: false })
   - parts: how many largest non-zero units to include (default 2)
   - short: 'in 2h 5m' / '3d 4h ago'  vs 'in 2 hours 5 minutes' */
export function humanizeDuration(ms, opts = {}) {
  const { parts = 2, short = false } = opts;
  let abs = Math.max(0, Math.abs(Math.floor(ms)));
  const out = [];
  for (const u of _DUR_UNITS) {
    if (out.length >= parts) break;
    const v = Math.floor(abs / u.ms);
    if (v > 0) {
      abs -= v * u.ms;
      if (short) {
        const tag = u.k === 'month' ? 'mo' : u.k[0]; // y mo w d h m s
        out.push(`${v}${tag}`);
      } else {
        out.push(`${v} ${u.k}${v === 1 ? '' : 's'}`);
      }
    } else if (out.length > 0) {
      // Skip zero gaps to avoid "2 hours 0 minutes"
      break;
    }
  }
  if (out.length === 0) return short ? '0s' : '0 seconds';
  return out.join(' ');
}

/* Carbon-like "in 5 minutes" / "3 hours ago" / "now". */
export function diffForHumans(ms, opts = {}) {
  if (ms == null || isNaN(ms)) return '';
  const abs = Math.abs(ms);
  if (abs < 1000) return 'now';
  const text = humanizeDuration(abs, opts);
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

/* Strict HH:MM:SS countdown for live timers (always shows hours).
   Negative values are clamped to 0. */
export function formatCountdown(ms) {
  let s = Math.max(0, Math.floor((ms || 0) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* Format a quantity with stack info. e.g. stackInfo(4096, 999)
   -> "4,096 (5 stacks)". For qty < stackSize we show "(<1 stack)". */
export function stackInfo(qty, stackSize) {
  if (!stackSize || stackSize <= 0) return fmt(qty);
  const stacks = Math.ceil(qty / stackSize);
  if (stacks <= 1) return `${fmt(qty)} (~1 stack)`;
  return `${fmt(qty)} (${fmt(stacks)} stacks)`;
}

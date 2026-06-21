// stores.js — Svelte stores with LocalStorage persistence + toast queue
import { writable, derived, get } from 'svelte/store';

const KEY = 'cs_planner_state_v1';

const defaultState = {
  inventory: {
    gems: {},                  // gemKey -> { tierKey: count }
    soul: {},                  // soulTier ("VI"..."I") -> count
    resources: {
      purified: 0,
      brilliance_shard: 0,
      diamond: 0,
      gold: 0,
      silver: 0,
      copper: 0
    }
  },
  /* targets are objects of EITHER:
     { id, kind: "gem",  gem,  tier, qty }
     { id, kind: "soul",        tier, qty }
     Old entries without `kind` are treated as "gem" for back-compat. */
  targets: [],
  equipment: {},               // slotKey -> [ {gem,tier} | null ]
  settings: {
    theme: 'dark',
    compact: false
  }
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mergeDeep(target, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      target[k] = mergeDeep(target[k] || {}, src[k]);
    } else {
      target[k] = src[k];
    }
  }
  return target;
}

function loadInitial() {
  if (typeof localStorage === 'undefined') return clone(defaultState);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(defaultState);
    return mergeDeep(clone(defaultState), JSON.parse(raw));
  } catch (e) {
    console.warn('Failed to load state', e);
    return clone(defaultState);
  }
}

export const state = writable(loadInitial());

state.subscribe(s => {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); }
  catch (e) { console.warn('Failed saving state', e); }
});

/* ================ Helpers ================ */
export function resetState(scope) {
  if (scope === 'inventory') {
    state.update(s => ({ ...s, inventory: clone(defaultState.inventory) }));
  } else {
    state.set(clone(defaultState));
  }
}

export function exportStateJSON() {
  return JSON.stringify(get(state), null, 2);
}

export function importStateJSON(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  state.set(mergeDeep(clone(defaultState), parsed));
}

export function getGemCount(s, gem, tier) {
  return (s.inventory.gems[gem] && s.inventory.gems[gem][tier]) || 0;
}

export function setGemCount(gem, tier, count) {
  const v = Math.max(0, parseInt(count) || 0);
  state.update(s => {
    if (!s.inventory.gems[gem]) s.inventory.gems[gem] = {};
    s.inventory.gems[gem][tier] = v;
    return s;
  });
}

export function getResource(s, name) {
  return s.inventory.resources[name] || 0;
}

export function setResource(name, value) {
  const v = Math.max(0, parseInt(value) || 0);
  state.update(s => {
    s.inventory.resources[name] = v;
    return s;
  });
}

export function getSoulCount(s, tier) {
  return (s.inventory.soul && s.inventory.soul[tier]) || 0;
}

export function setSoulCount(tier, value) {
  const v = Math.max(0, parseInt(value) || 0);
  state.update(s => {
    if (!s.inventory.soul) s.inventory.soul = {};
    s.inventory.soul[tier] = v;
    return s;
  });
}

export function addTarget(target) {
  state.update(s => ({
    ...s,
    /* Default kind to "gem" so old call sites continue to work. */
    targets: [...s.targets, {
      id: Date.now() + Math.random(),
      kind: target.kind || 'gem',
      ...target
    }]
  }));
}

export function removeTarget(id) {
  state.update(s => ({ ...s, targets: s.targets.filter(t => t.id !== id) }));
}

export function clearTargets() {
  state.update(s => ({ ...s, targets: [] }));
}

export function setEquipmentSocket(slotKey, idx, gemEntry) {
  state.update(s => {
    if (!s.equipment[slotKey]) s.equipment[slotKey] = [];
    s.equipment[slotKey][idx] = gemEntry;
    return s;
  });
}

export function ensureEquipmentShape(slots) {
  state.update(s => {
    for (const k of Object.keys(slots)) {
      if (!s.equipment[k]) {
        s.equipment[k] = new Array(slots[k].sockets).fill(null);
      } else {
        while (s.equipment[k].length < slots[k].sockets) s.equipment[k].push(null);
        s.equipment[k].length = slots[k].sockets;
      }
    }
    return s;
  });
}

export function setSetting(key, value) {
  state.update(s => ({ ...s, settings: { ...s.settings, [key]: value } }));
}

/* ================ Toast store ================ */
export const toasts = writable([]);

let toastCounter = 0;
export function toast(message, type = 'info', timeout = 2500) {
  const id = ++toastCounter;
  toasts.update(list => [...list, { id, message, type }]);
  setTimeout(() => {
    toasts.update(list => list.filter(t => t.id !== id));
  }, timeout);
}

/* Derived: handy accessors */
export const inventory = derived(state, $s => $s.inventory);
export const targets   = derived(state, $s => $s.targets);
export const settings  = derived(state, $s => $s.settings);

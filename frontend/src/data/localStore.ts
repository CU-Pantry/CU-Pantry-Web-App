export const STORAGE_KEYS = {
  inventory: 'pantry_inventory_items',
  orders: 'pantry_orders',
  users: 'pantry_users',
  lockers: 'pantry_lockers',
} as const;

export function loadCollection<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveCollection<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  barcode: string;
  storageType: 'frozen' | 'refrigerated' | 'ambient';
  updatedAt: string;
};

export type PantryOrder = {
  id: string;
  requesterName: string;
  requesterType: 'student' | 'teacher';
  items: PantryOrderItem[];
  status: 'pending' | 'approved' | 'ready' | 'delivered';
  requestedAt: string;
  lockerId?: string | null;
  // Legacy fields kept for migration compatibility.
  itemName?: string;
  quantity?: number;
};

export type PantryOrderItem = {
  itemName: string;
  quantity: number;
  lockerId?: string | null;
};

export function getOrderItems(order: PantryOrder): PantryOrderItem[] {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }

  if (order.itemName) {
    return [{ itemName: order.itemName, quantity: Math.max(1, Number(order.quantity ?? 1)), lockerId: order.lockerId ?? null }];
  }

  return [];
}

export function getOrderTotalQuantity(order: PantryOrder): number {
  return getOrderItems(order).reduce((sum, item) => sum + item.quantity, 0);
}

export function migratePantryOrder(order: PantryOrder): PantryOrder {
  const items = getOrderItems(order).map((item) => ({
    ...item,
    lockerId: item.lockerId ?? order.lockerId ?? null,
  }));

  return {
    ...order,
    items,
    lockerId: order.lockerId ?? items[0]?.lockerId ?? null,
  };
}

export type LockerStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export type LockerSize = 'small' | 'medium' | 'large' | 'extra_large';

export type LockerStorageType = 'frozen' | 'refrigerated' | 'ambient';

function pickRandomLockerStorageType(seed: string): LockerStorageType {
  // Lockers use two effective groups: non-frozen (ambient/refrigerated) and frozen.
  // We persist non-frozen lockers as ambient in seed data for consistency.
  const types: LockerStorageType[] = ['ambient', 'frozen'];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return types[Math.abs(hash) % types.length];
}

export type Locker = {
  id: string;
  code: string;
  name: string;
  location: string;
  size: LockerSize;
  storageType: LockerStorageType;
  status: LockerStatus;
  currentOrderIds: string[];
  accessCode: string;
  note: string;
};

export type PantryUser = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'staff' | 'manager';
  status: 'active' | 'blocked';
  permissions: StaffPermissions;
};

export type StaffPermissionKey = 'inventory' | 'lockers' | 'orders' | 'users';

export type StaffPermissions = Record<StaffPermissionKey, boolean>;

export function createPermissions(role: PantryUser['role']): StaffPermissions {
  if (role === 'manager') {
    return { inventory: true, lockers: true, orders: true, users: true };
  }

  if (role === 'staff') {
    return { inventory: true, lockers: true, orders: true, users: true };
  }

  return { inventory: false, lockers: false, orders: false, users: false };
}

export const inventorySeed: InventoryItem[] = [
  // Grains
  {
    id: 'inv-1',
    name: 'Rice Bags',
    category: 'Grains',
    quantity: 42,
    unit: 'bags',
    barcode: '100100100001',
    storageType: 'ambient',
    updatedAt: '2026-04-10',
  },
  {
    id: 'inv-2',
    name: 'Wheat Flour',
    category: 'Grains',
    quantity: 28,
    unit: 'bags',
    barcode: '100100100002',
    storageType: 'ambient',
    updatedAt: '2026-04-11',
  },
  // Dairy
  {
    id: 'inv-3',
    name: 'Milk Cartons',
    category: 'Dairy',
    quantity: 85,
    unit: 'cartons',
    barcode: '100200100001',
    storageType: 'refrigerated',
    updatedAt: '2026-04-09',
  },
  {
    id: 'inv-4',
    name: 'Yogurt Cups',
    category: 'Dairy',
    quantity: 52,
    unit: 'cups',
    barcode: '100200100002',
    storageType: 'refrigerated',
    updatedAt: '2026-04-10',
  },
  // Protein
  {
    id: 'inv-5',
    name: 'Egg Trays',
    category: 'Protein',
    quantity: 21,
    unit: 'trays',
    barcode: '100300100001',
    storageType: 'refrigerated',
    updatedAt: '2026-04-11',
  },
  {
    id: 'inv-6',
    name: 'Canned Beans',
    category: 'Protein',
    quantity: 38,
    unit: 'cans',
    barcode: '100300100002',
    storageType: 'ambient',
    updatedAt: '2026-04-09',
  },
  // Vegetables
  {
    id: 'inv-7',
    name: 'Fresh Carrots',
    category: 'Vegetables',
    quantity: 64,
    unit: 'bags',
    barcode: '100400100001',
    storageType: 'refrigerated',
    updatedAt: '2026-04-11',
  },
  {
    id: 'inv-8',
    name: 'Tomatoes',
    category: 'Vegetables',
    quantity: 45,
    unit: 'boxes',
    barcode: '100400100002',
    storageType: 'refrigerated',
    updatedAt: '2026-04-10',
  },
  // Fruits
  {
    id: 'inv-9',
    name: 'Bananas',
    category: 'Fruits',
    quantity: 72,
    unit: 'bunches',
    barcode: '100500100001',
    storageType: 'ambient',
    updatedAt: '2026-04-11',
  },
  {
    id: 'inv-10',
    name: 'Apples',
    category: 'Fruits',
    quantity: 55,
    unit: 'boxes',
    barcode: '100500100002',
    storageType: 'ambient',
    updatedAt: '2026-04-10',
  },
  // Bakery
  {
    id: 'inv-11',
    name: 'Bread Loaves',
    category: 'Bakery',
    quantity: 48,
    unit: 'loaves',
    barcode: '100600100001',
    storageType: 'ambient',
    updatedAt: '2026-04-11',
  },
  {
    id: 'inv-12',
    name: 'Pastries',
    category: 'Bakery',
    quantity: 36,
    unit: 'packages',
    barcode: '100600100002',
    storageType: 'ambient',
    updatedAt: '2026-04-11',
  },
  // Beverages
  {
    id: 'inv-13',
    name: 'Orange Juice',
    category: 'Beverages',
    quantity: 40,
    unit: 'bottles',
    barcode: '100700100001',
    storageType: 'refrigerated',
    updatedAt: '2026-04-09',
  },
  {
    id: 'inv-14',
    name: 'Tea Boxes',
    category: 'Beverages',
    quantity: 25,
    unit: 'boxes',
    barcode: '100700100002',
    storageType: 'ambient',
    updatedAt: '2026-04-10',
  },
  // Pantry Essentials
  {
    id: 'inv-15',
    name: 'Cooking Oil',
    category: 'Pantry Essentials',
    quantity: 18,
    unit: 'bottles',
    barcode: '100800100001',
    storageType: 'ambient',
    updatedAt: '2026-04-09',
  },
  {
    id: 'inv-16',
    name: 'Salt & Sugar',
    category: 'Pantry Essentials',
    quantity: 32,
    unit: 'packages',
    barcode: '100800100002',
    storageType: 'ambient',
    updatedAt: '2026-04-11',
  },
];

export const ordersSeed: PantryOrder[] = [
  {
    id: 'ord-1',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Cooking Oil', quantity: 1 }],
    status: 'pending',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-2',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Orange Juice', quantity: 1 }],
    status: 'pending',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-3',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Fresh Carrots', quantity: 1 }],
    status: 'pending',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-4',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Egg Trays', quantity: 1 }],
    status: 'pending',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-5',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Milk Cartons', quantity: 1 }],
    status: 'pending',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-6',
    requesterName: 'Salma B.',
    requesterType: 'student',
    items: [{ itemName: 'Rice Bags', quantity: 1 }],
    status: 'ready',
    requestedAt: '2026-04-10',
    lockerId: 'locker-5',
  },
  {
    id: 'ord-7',
    requesterName: 'test',
    requesterType: 'student',
    items: [{ itemName: '5', quantity: 1 }],
    status: 'ready',
    requestedAt: '2026-04-11',
  },
  {
    id: 'ord-8',
    requesterName: 'Imane M.',
    requesterType: 'student',
    items: [{ itemName: 'Rice Bags', quantity: 1 }],
    status: 'approved',
    requestedAt: '2026-04-11',
    lockerId: 'locker-2',
  },
  {
    id: 'ord-9',
    requesterName: 'Yassine A.',
    requesterType: 'teacher',
    items: [{ itemName: 'Milk Cartons', quantity: 4 }],
    status: 'delivered',
    requestedAt: '2026-04-10',
    lockerId: 'locker-3',
  },
  {
    id: 'ord-10',
    requesterName: 'Fatima R.',
    requesterType: 'teacher',
    items: [{ itemName: 'Egg Trays', quantity: 2 }],
    status: 'approved',
    requestedAt: '2026-04-09',
    lockerId: 'locker-7',
  },
  {
    id: 'ord-11',
    requesterName: 'Nadia S.',
    requesterType: 'student',
    items: [{ itemName: 'Bread Loaves', quantity: 3 }],
    status: 'pending',
    requestedAt: '2026-04-08',
  },
];

export const lockerSeed: Locker[] = Array.from({ length: 16 }).map((_, i) => {
  const num = i + 1;
  const idStr = num.toString().padStart(2, '0');
  
  // Add some preset conditions to the first few to keep the mock active
  let status: LockerStatus = 'available';
  let currentOrderIds: string[] = [];
  let accessCode = '----';

  if (num === 2) {
    status = 'reserved';
    currentOrderIds = ['ord-1'];
    accessCode = '4827';
  } else if (num === 3) {
    status = 'occupied';
    currentOrderIds = ['ord-2'];
    accessCode = '7391';
  } else if (num === 4) {
    status = 'maintenance';
  } else if (num === 6) {
    status = 'occupied';
    currentOrderIds = ['ord-3'];
    accessCode = '5618';
  }

  // Randomly distribute sizes
  const sizes: LockerSize[] = ['small', 'medium', 'large', 'extra_large'];
  const size = sizes[i % 4] as LockerSize;

  // Distribute storage types in a random-looking but stable way
  let storageType = pickRandomLockerStorageType(`locker-${num}`);

  // Keep seeded order lockers in the non-frozen pool.
  if (num === 2) storageType = 'ambient';
  if (num === 3) storageType = 'ambient';
  if (num === 5) storageType = 'ambient';
  if (num === 6) storageType = 'ambient';
  if (num === 7) storageType = 'ambient';

  return {
    id: `locker-${num}`,
    code: `L-${idStr}`,
    name: `Locker ${num}`,
    location: `Aisle ${Math.ceil(num / 10)} / Layer ${((i % 5) + 1)}`,
    size,
    storageType,
    status,
    currentOrderIds,
    accessCode,
    note: status === 'maintenance' ? 'Out of service' : 'Ready',
  };
});

export const usersSeed: PantryUser[] = [
  {
    id: 'usr-1',
    name: 'Salma B.',
    email: 'salma@student.edu',
    role: 'student',
    status: 'active',
    permissions: createPermissions('student'),
  },
  {
    id: 'usr-2',
    name: 'Nabil K.',
    email: 'nabil.teacher@edu.org',
    role: 'teacher',
    status: 'active',
    permissions: createPermissions('teacher'),
  },
  {
    id: 'usr-3',
    name: 'Hind R.',
    email: 'hind.staff@pantry.org',
    role: 'staff',
    status: 'active',
    permissions: createPermissions('staff'),
  },
  {
    id: 'usr-4',
    name: 'Admin Staff',
    email: 'staff@pantry.org',
    role: 'staff',
    status: 'active',
    permissions: createPermissions('staff'),
  },
  {
    id: 'usr-5',
    name: 'Fehmi Manager',
    email: 'manager@pantry.org',
    role: 'manager',
    status: 'active',
    permissions: createPermissions('manager'),
  },
];

let idSequence = 100;

export function nextId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

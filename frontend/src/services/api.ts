const API_BASE_URL = 'http://localhost:8000/api';

// Helper function for all API calls
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.error || 'API request failed');
  }

  return response.json();
}

// ─── INVENTORY ────────────────────────────────────────────

export const inventoryApi = {
  getAll: (params?: { available?: boolean; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.available) query.append('available', 'true');
    if (params?.category) query.append('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<InventoryItem[]>(`/inventory/${qs}`);
  },

  getOne: (id: number) =>
    request<InventoryItem>(`/inventory/${id}/`),

  create: (data: Partial<InventoryItem>) =>
    request<InventoryItem>('/inventory/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<InventoryItem>) =>
    request<InventoryItem>(`/inventory/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/inventory/${id}/`, { method: 'DELETE' }),

  lookupBarcode: (barcode: string) =>
    request<BarcodeResult>(`/inventory/barcode/${barcode}/`),

  scanBarcode: (barcode: string, quantity: number) =>
    request<{ message: string; item: InventoryItem }>('/inventory/barcode/scan/', {
      method: 'POST',
      body: JSON.stringify({ barcode, quantity }),
    }),
};

// ─── ORDERS ───────────────────────────────────────────────

export const ordersApi = {
  getAll: () =>
    request<Order[]>('/orders/'),

  getOne: (id: number) =>
    request<Order>(`/orders/${id}/`),

  create: (data: CreateOrderPayload) =>
    request<Order>('/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: OrderStatus) =>
    request<Order>(`/orders/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ─── LOCKERS ──────────────────────────────────────────────

export const lockersApi = {
  getAll: () =>
    request<Locker[]>('/lockers/'),

  assign: (orderId: number, lockerId: number) =>
    request<AssignLockerResponse>('/lockers/assign/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, locker_id: lockerId }),
    }),

  getTemperatureLogs: () =>
    request<TemperatureLog[]>('/lockers/temperature-logs/'),
};

// ─── TYPES ────────────────────────────────────────────────

export type InventoryItem = {
  id: number;
  name: string;
  barcode: string | null;
  category: 'food' | 'hygiene' | 'other';
  quantity: number;
  unit: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type BarcodeResult = {
  found: boolean;
  barcode: string;
  name: string;
  image_url: string;
  brands: string;
  quantity: string;
  message: string;
  existing_item?: InventoryItem;
};

export type OrderStatus =
  | 'submitted'
  | 'approved'
  | 'locker_assigned'
  | 'ready'
  | 'picked_up'
  | 'expired'
  | 'compromised';

export type Order = {
  id: number;
  student_username: string;
  status: OrderStatus;
  requires_lower_locker: boolean;
  week_number: number;
  year: number;
  pickup_date: string | null;
  pickup_deadline: string | null;
  qr_token: string | null;
  pin_code: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateOrderPayload = {
  requires_lower_locker: boolean;
  items: number[];
};

export type Locker = {
  id: number;
  locker_number: string;
  temperature_type: 'frozen' | 'refrigerated' | 'ambient';
  status: 'available' | 'occupied' | 'maintenance';
  bell_howell_id: string | null;
  current_order: number | null;
  created_at: string;
  updated_at: string;
};

export type AssignLockerResponse = {
  message: string;
  order_id: number;
  locker_number: string;
  order_status: string;
};

export type TemperatureLog = {
  id: number;
  locker_number: string;
  temperature: number;
  recorded_at: string;
  is_violation: boolean;
};

// ─── USERS ────────────────────────────────────────────────

export type AppUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'volunteer' | 'manager' | 'admin';
  is_active: boolean;
};

export const usersApi = {
  getAll: () => request<AppUser[]>('/auth/users/'),
};
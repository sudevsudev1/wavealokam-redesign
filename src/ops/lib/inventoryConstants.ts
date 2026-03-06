export const INVENTORY_CATEGORIES = [
  'Vegetables', 'Fruits', 'Dairy & Eggs', 'Staples', 'Pulses', 'Spices',
  'Oils & Condiments', 'Proteins', 'Packaging & Cleaning',
  'Toiletries', 'Linens', 'Cleaning', 'F&B', 'Maintenance', 'Stationery', 'Safety',
] as const;

export const INVENTORY_UNITS = [
  'pcs', 'kg', 'liter', 'bunch', 'pack', 'loaf', 'roll',
  'bottles', 'cans', 'reams', 'boxes', 'books', 'kits',
] as const;

export const ORDER_STATUSES = [
  'Draft', 'Requested', 'Approved', 'Ordered', 'Received', 'Cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Requested: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-blue-100 text-blue-800',
  Ordered: 'bg-purple-100 text-purple-800',
  Received: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export const STOCK_STATUS = (current: number, par: number, reorder: number) => {
  if (current <= 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
  if (current <= reorder) return { label: 'Reorder', color: 'text-orange-600 bg-orange-50' };
  if (current <= par * 0.5) return { label: 'Low', color: 'text-yellow-600 bg-yellow-50' };
  return { label: 'OK', color: 'text-green-600 bg-green-50' };
};

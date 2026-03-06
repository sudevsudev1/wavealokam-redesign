// Master Purchase Catalog — all items available for purchase
// Each entry maps to ops_inventory_items when linked

export interface CatalogEntry {
  name: string;
  category: string;
  unit: string;
  shelfLifeDays: number;
  expiryApplicable: boolean;
  defaultQty: number;
}

export const MASTER_CATALOG: CatalogEntry[] = [
  // Vegetables
  { name: 'Onion', category: 'Vegetables', unit: 'kg', shelfLifeDays: 20, expiryApplicable: true, defaultQty: 2 },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg', shelfLifeDays: 5, expiryApplicable: true, defaultQty: 2 },
  { name: 'Potato', category: 'Vegetables', unit: 'kg', shelfLifeDays: 20, expiryApplicable: true, defaultQty: 2 },
  { name: 'Ginger', category: 'Vegetables', unit: 'kg', shelfLifeDays: 20, expiryApplicable: true, defaultQty: 0.5 },
  { name: 'Garlic', category: 'Vegetables', unit: 'kg', shelfLifeDays: 30, expiryApplicable: true, defaultQty: 0.5 },
  { name: 'Green chilli', category: 'Vegetables', unit: 'kg', shelfLifeDays: 10, expiryApplicable: true, defaultQty: 0.25 },
  { name: 'Curry leaves', category: 'Vegetables', unit: 'bunch', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 2 },
  { name: 'Coriander leaves', category: 'Vegetables', unit: 'bunch', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 2 },
  { name: 'Mint', category: 'Vegetables', unit: 'bunch', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 1 },
  { name: 'Lemon', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 10 },
  { name: 'Coconut', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 30, expiryApplicable: true, defaultQty: 5 },
  { name: 'Cucumber', category: 'Vegetables', unit: 'kg', shelfLifeDays: 5, expiryApplicable: true, defaultQty: 1 },
  { name: 'Carrot', category: 'Vegetables', unit: 'kg', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 1 },
  { name: 'Beetroot', category: 'Vegetables', unit: 'kg', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 1 },
  { name: 'Beans', category: 'Vegetables', unit: 'kg', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 1 },
  { name: 'Cabbage', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 2 },
  { name: 'Cauliflower', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 2 },
  { name: 'Brinjal (Eggplant)', category: 'Vegetables', unit: 'kg', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 1 },
  { name: 'Okra (Ladyfinger)', category: 'Vegetables', unit: 'kg', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 1 },
  { name: 'Pumpkin', category: 'Vegetables', unit: 'kg', shelfLifeDays: 30, expiryApplicable: true, defaultQty: 2 },
  { name: 'Raw banana', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 10, expiryApplicable: true, defaultQty: 10 },
  { name: 'Plantain', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 10, expiryApplicable: true, defaultQty: 10 },
  { name: 'Spinach/Leafy greens', category: 'Vegetables', unit: 'bunch', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 5 },
  { name: 'Drumstick (Moringa)', category: 'Vegetables', unit: 'pcs', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 10 },
  { name: 'Capsicum', category: 'Vegetables', unit: 'kg', shelfLifeDays: 10, expiryApplicable: true, defaultQty: 1 },
  { name: 'Mushroom', category: 'Vegetables', unit: 'kg', shelfLifeDays: 5, expiryApplicable: true, defaultQty: 1 },
  // Fruits
  { name: 'Banana', category: 'Fruits', unit: 'kg', shelfLifeDays: 5, expiryApplicable: true, defaultQty: 2 },
  { name: 'Apple', category: 'Fruits', unit: 'kg', shelfLifeDays: 21, expiryApplicable: true, defaultQty: 2 },
  { name: 'Orange', category: 'Fruits', unit: 'kg', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 2 },
  { name: 'Papaya', category: 'Fruits', unit: 'pcs', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 2 },
  { name: 'Pineapple', category: 'Fruits', unit: 'pcs', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 2 },
  { name: 'Watermelon', category: 'Fruits', unit: 'pcs', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 1 },
  { name: 'Grapes', category: 'Fruits', unit: 'kg', shelfLifeDays: 7, expiryApplicable: true, defaultQty: 1 },
  // Dairy and Eggs
  { name: 'Milk (pasteurized)', category: 'Dairy & Eggs', unit: 'liter', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 10 },
  { name: 'Curd', category: 'Dairy & Eggs', unit: 'kg', shelfLifeDays: 4, expiryApplicable: true, defaultQty: 5 },
  { name: 'Butter', category: 'Dairy & Eggs', unit: 'kg', shelfLifeDays: 30, expiryApplicable: true, defaultQty: 2 },
  { name: 'Cheese slices', category: 'Dairy & Eggs', unit: 'pack', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 5 },
  { name: 'Paneer', category: 'Dairy & Eggs', unit: 'kg', shelfLifeDays: 4, expiryApplicable: true, defaultQty: 2 },
  { name: 'Eggs', category: 'Dairy & Eggs', unit: 'pcs', shelfLifeDays: 14, expiryApplicable: true, defaultQty: 60 },
  // Staples
  { name: 'Rice', category: 'Staples', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 25 },
  { name: 'Matta rice', category: 'Staples', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 25 },
  { name: 'Wheat flour (atta)', category: 'Staples', unit: 'kg', shelfLifeDays: 90, expiryApplicable: true, defaultQty: 25 },
  { name: 'Maida', category: 'Staples', unit: 'kg', shelfLifeDays: 90, expiryApplicable: true, defaultQty: 10 },
  { name: 'Rava (semolina)', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Poha', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Vermicelli', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Bread', category: 'Staples', unit: 'loaf', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 10 },
  { name: 'Idli batter', category: 'Staples', unit: 'kg', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 5 },
  { name: 'Dosa batter', category: 'Staples', unit: 'kg', shelfLifeDays: 3, expiryApplicable: true, defaultQty: 5 },
  { name: 'Oats', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Cornflakes', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Muesli', category: 'Staples', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  // Pulses
  { name: 'Toor dal', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 10 },
  { name: 'Moong dal', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  { name: 'Urad dal', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  { name: 'Chana dal', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  { name: 'Rajma', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  { name: 'Chickpeas', category: 'Pulses', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  // Spices
  { name: 'Salt', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 5 },
  { name: 'Sugar', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 10 },
  { name: 'Jaggery', category: 'Spices', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Turmeric powder', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  { name: 'Chilli powder', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  { name: 'Coriander powder', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  { name: 'Garam masala', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Sambar powder', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Rasam powder', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Pepper', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Mustard seeds', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Cumin', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Fennel', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Fenugreek', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 1 },
  { name: 'Asafoetida', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 0.5 },
  { name: 'Cinnamon', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 0.5 },
  { name: 'Clove', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 0.5 },
  { name: 'Cardamom', category: 'Spices', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 0.5 },
  // Oils and Condiments
  { name: 'Coconut oil', category: 'Oils & Condiments', unit: 'liter', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Sunflower oil', category: 'Oils & Condiments', unit: 'liter', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 5 },
  { name: 'Ghee', category: 'Oils & Condiments', unit: 'liter', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 2 },
  { name: 'Vinegar', category: 'Oils & Condiments', unit: 'liter', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  { name: 'Soy sauce', category: 'Oils & Condiments', unit: 'liter', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  { name: 'Tomato ketchup', category: 'Oils & Condiments', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 2 },
  { name: 'Chilli sauce', category: 'Oils & Condiments', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 2 },
  { name: 'Mayonnaise', category: 'Oils & Condiments', unit: 'kg', shelfLifeDays: 60, expiryApplicable: true, defaultQty: 2 },
  { name: 'Pickle', category: 'Oils & Condiments', unit: 'kg', shelfLifeDays: 180, expiryApplicable: true, defaultQty: 2 },
  { name: 'Tamarind', category: 'Oils & Condiments', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  // Proteins
  { name: 'Chicken (fresh)', category: 'Proteins', unit: 'kg', shelfLifeDays: 2, expiryApplicable: true, defaultQty: 5 },
  { name: 'Fish (fresh)', category: 'Proteins', unit: 'kg', shelfLifeDays: 1, expiryApplicable: true, defaultQty: 5 },
  { name: 'Prawns (fresh)', category: 'Proteins', unit: 'kg', shelfLifeDays: 1, expiryApplicable: true, defaultQty: 5 },
  { name: 'Soya chunks', category: 'Proteins', unit: 'kg', shelfLifeDays: 365, expiryApplicable: true, defaultQty: 2 },
  // Packaging and Cleaning (kitchen)
  { name: 'Aluminium foil', category: 'Packaging & Cleaning', unit: 'roll', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 5 },
  { name: 'Cling film', category: 'Packaging & Cleaning', unit: 'roll', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 5 },
  { name: 'Tissue rolls', category: 'Packaging & Cleaning', unit: 'pcs', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 20 },
  { name: 'Garbage bags', category: 'Packaging & Cleaning', unit: 'pack', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 10 },
  { name: 'Dishwash liquid', category: 'Packaging & Cleaning', unit: 'liter', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 5 },
  { name: 'Scrub pads', category: 'Packaging & Cleaning', unit: 'pack', shelfLifeDays: 365, expiryApplicable: false, defaultQty: 10 },
];

// All categories including existing ops ones and new kitchen/grocery ones
export const ALL_CATALOG_CATEGORIES = [
  'Vegetables', 'Fruits', 'Dairy & Eggs', 'Staples', 'Pulses', 'Spices',
  'Oils & Condiments', 'Proteins', 'Packaging & Cleaning',
  'Toiletries', 'Linens', 'Cleaning', 'F&B', 'Maintenance', 'Stationery', 'Safety',
] as const;

// Simple fuzzy matcher: Levenshtein distance
export function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp = Array.from({ length: la + 1 }, (_, i) => {
    const row = new Array(lb + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

// Find close matches in catalog/inventory
export function findSimilarItems(query: string, items: { name: string; id?: string }[], threshold = 3): typeof items {
  const q = query.toLowerCase();
  return items.filter(item => {
    const name = item.name.toLowerCase();
    if (name.includes(q) || q.includes(name)) return false; // exact match, not a typo
    return levenshtein(q, name) <= threshold || 
           levenshtein(q, name.slice(0, q.length)) <= Math.ceil(threshold / 2);
  });
}

// Calculate expiry date from shelf life
export function calculateExpiryDate(purchaseDate: Date, shelfLifeDays: number): Date {
  // Manufacturing date = purchase date - 2 days
  const mfgDate = new Date(purchaseDate);
  mfgDate.setDate(mfgDate.getDate() - 2);
  // Expiry = mfg date + shelf life
  const expiry = new Date(mfgDate);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry;
}

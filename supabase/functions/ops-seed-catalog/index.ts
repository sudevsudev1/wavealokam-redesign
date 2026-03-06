import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Full catalog data
const CATALOG_ITEMS = [
  { name: 'Onion', category: 'Vegetables', unit: 'kg', shelf_life: 20, default_qty: 2 },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg', shelf_life: 5, default_qty: 2 },
  { name: 'Potato', category: 'Vegetables', unit: 'kg', shelf_life: 20, default_qty: 2 },
  { name: 'Ginger', category: 'Vegetables', unit: 'kg', shelf_life: 20, default_qty: 0.5 },
  { name: 'Garlic', category: 'Vegetables', unit: 'kg', shelf_life: 30, default_qty: 0.5 },
  { name: 'Green chilli', category: 'Vegetables', unit: 'kg', shelf_life: 10, default_qty: 0.25 },
  { name: 'Curry leaves', category: 'Vegetables', unit: 'bunch', shelf_life: 3, default_qty: 2 },
  { name: 'Coriander leaves', category: 'Vegetables', unit: 'bunch', shelf_life: 3, default_qty: 2 },
  { name: 'Mint', category: 'Vegetables', unit: 'bunch', shelf_life: 3, default_qty: 1 },
  { name: 'Lemon', category: 'Vegetables', unit: 'pcs', shelf_life: 14, default_qty: 10 },
  { name: 'Coconut', category: 'Vegetables', unit: 'pcs', shelf_life: 30, default_qty: 5 },
  { name: 'Cucumber', category: 'Vegetables', unit: 'kg', shelf_life: 5, default_qty: 1 },
  { name: 'Carrot', category: 'Vegetables', unit: 'kg', shelf_life: 14, default_qty: 1 },
  { name: 'Beetroot', category: 'Vegetables', unit: 'kg', shelf_life: 14, default_qty: 1 },
  { name: 'Beans', category: 'Vegetables', unit: 'kg', shelf_life: 7, default_qty: 1 },
  { name: 'Cabbage', category: 'Vegetables', unit: 'pcs', shelf_life: 14, default_qty: 2 },
  { name: 'Cauliflower', category: 'Vegetables', unit: 'pcs', shelf_life: 7, default_qty: 2 },
  { name: 'Brinjal (Eggplant)', category: 'Vegetables', unit: 'kg', shelf_life: 7, default_qty: 1 },
  { name: 'Okra (Ladyfinger)', category: 'Vegetables', unit: 'kg', shelf_life: 7, default_qty: 1 },
  { name: 'Pumpkin', category: 'Vegetables', unit: 'kg', shelf_life: 30, default_qty: 2 },
  { name: 'Raw banana', category: 'Vegetables', unit: 'pcs', shelf_life: 10, default_qty: 10 },
  { name: 'Plantain', category: 'Vegetables', unit: 'pcs', shelf_life: 10, default_qty: 10 },
  { name: 'Spinach/Leafy greens', category: 'Vegetables', unit: 'bunch', shelf_life: 3, default_qty: 5 },
  { name: 'Drumstick (Moringa)', category: 'Vegetables', unit: 'pcs', shelf_life: 7, default_qty: 10 },
  { name: 'Capsicum', category: 'Vegetables', unit: 'kg', shelf_life: 10, default_qty: 1 },
  { name: 'Mushroom', category: 'Vegetables', unit: 'kg', shelf_life: 5, default_qty: 1 },
  { name: 'Banana', category: 'Fruits', unit: 'kg', shelf_life: 5, default_qty: 2 },
  { name: 'Apple', category: 'Fruits', unit: 'kg', shelf_life: 21, default_qty: 2 },
  { name: 'Orange', category: 'Fruits', unit: 'kg', shelf_life: 14, default_qty: 2 },
  { name: 'Papaya', category: 'Fruits', unit: 'pcs', shelf_life: 7, default_qty: 2 },
  { name: 'Pineapple', category: 'Fruits', unit: 'pcs', shelf_life: 7, default_qty: 2 },
  { name: 'Watermelon', category: 'Fruits', unit: 'pcs', shelf_life: 7, default_qty: 1 },
  { name: 'Grapes', category: 'Fruits', unit: 'kg', shelf_life: 7, default_qty: 1 },
  { name: 'Milk (pasteurized)', category: 'Dairy & Eggs', unit: 'liter', shelf_life: 3, default_qty: 10 },
  { name: 'Curd', category: 'Dairy & Eggs', unit: 'kg', shelf_life: 4, default_qty: 5 },
  { name: 'Butter', category: 'Dairy & Eggs', unit: 'kg', shelf_life: 30, default_qty: 2 },
  { name: 'Cheese slices', category: 'Dairy & Eggs', unit: 'pack', shelf_life: 14, default_qty: 5 },
  { name: 'Paneer', category: 'Dairy & Eggs', unit: 'kg', shelf_life: 4, default_qty: 2 },
  { name: 'Eggs', category: 'Dairy & Eggs', unit: 'pcs', shelf_life: 14, default_qty: 60 },
  { name: 'Rice', category: 'Staples', unit: 'kg', shelf_life: 365, default_qty: 25 },
  { name: 'Matta rice', category: 'Staples', unit: 'kg', shelf_life: 365, default_qty: 25 },
  { name: 'Wheat flour (atta)', category: 'Staples', unit: 'kg', shelf_life: 90, default_qty: 25 },
  { name: 'Maida', category: 'Staples', unit: 'kg', shelf_life: 90, default_qty: 10 },
  { name: 'Rava (semolina)', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Poha', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Vermicelli', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Bread', category: 'Staples', unit: 'loaf', shelf_life: 3, default_qty: 10 },
  { name: 'Idli batter', category: 'Staples', unit: 'kg', shelf_life: 3, default_qty: 5 },
  { name: 'Dosa batter', category: 'Staples', unit: 'kg', shelf_life: 3, default_qty: 5 },
  { name: 'Oats', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Cornflakes', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Muesli', category: 'Staples', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Toor dal', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 10 },
  { name: 'Moong dal', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Urad dal', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Chana dal', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Rajma', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Chickpeas', category: 'Pulses', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Salt', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 5 },
  { name: 'Sugar', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 10 },
  { name: 'Jaggery', category: 'Spices', unit: 'kg', shelf_life: 180, default_qty: 5 },
  { name: 'Turmeric powder', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 2 },
  { name: 'Chilli powder', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 2 },
  { name: 'Coriander powder', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 2 },
  { name: 'Garam masala', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Sambar powder', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Rasam powder', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Pepper', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Mustard seeds', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Cumin', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Fennel', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Fenugreek', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 1 },
  { name: 'Asafoetida', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 0.5 },
  { name: 'Cinnamon', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 0.5 },
  { name: 'Clove', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 0.5 },
  { name: 'Cardamom', category: 'Spices', unit: 'kg', shelf_life: 365, default_qty: 0.5 },
  { name: 'Coconut oil', category: 'Oils & Condiments', unit: 'liter', shelf_life: 180, default_qty: 5 },
  { name: 'Sunflower oil', category: 'Oils & Condiments', unit: 'liter', shelf_life: 180, default_qty: 5 },
  { name: 'Ghee', category: 'Oils & Condiments', unit: 'liter', shelf_life: 180, default_qty: 2 },
  { name: 'Vinegar', category: 'Oils & Condiments', unit: 'liter', shelf_life: 365, default_qty: 2 },
  { name: 'Soy sauce', category: 'Oils & Condiments', unit: 'liter', shelf_life: 365, default_qty: 2 },
  { name: 'Tomato ketchup', category: 'Oils & Condiments', unit: 'kg', shelf_life: 180, default_qty: 2 },
  { name: 'Chilli sauce', category: 'Oils & Condiments', unit: 'kg', shelf_life: 180, default_qty: 2 },
  { name: 'Mayonnaise', category: 'Oils & Condiments', unit: 'kg', shelf_life: 60, default_qty: 2 },
  { name: 'Pickle', category: 'Oils & Condiments', unit: 'kg', shelf_life: 180, default_qty: 2 },
  { name: 'Tamarind', category: 'Oils & Condiments', unit: 'kg', shelf_life: 365, default_qty: 2 },
  { name: 'Chicken (fresh)', category: 'Proteins', unit: 'kg', shelf_life: 2, default_qty: 5 },
  { name: 'Fish (fresh)', category: 'Proteins', unit: 'kg', shelf_life: 1, default_qty: 5 },
  { name: 'Prawns (fresh)', category: 'Proteins', unit: 'kg', shelf_life: 1, default_qty: 5 },
  { name: 'Soya chunks', category: 'Proteins', unit: 'kg', shelf_life: 365, default_qty: 2 },
  { name: 'Aluminium foil', category: 'Packaging & Cleaning', unit: 'roll', shelf_life: 365, default_qty: 5 },
  { name: 'Cling film', category: 'Packaging & Cleaning', unit: 'roll', shelf_life: 365, default_qty: 5 },
  { name: 'Tissue rolls', category: 'Packaging & Cleaning', unit: 'pcs', shelf_life: 365, default_qty: 20 },
  { name: 'Garbage bags', category: 'Packaging & Cleaning', unit: 'pack', shelf_life: 365, default_qty: 10 },
  { name: 'Dishwash liquid', category: 'Packaging & Cleaning', unit: 'liter', shelf_life: 365, default_qty: 5 },
  { name: 'Scrub pads', category: 'Packaging & Cleaning', unit: 'pack', shelf_life: 365, default_qty: 10 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify calling user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get user's branch
    const { data: profile } = await adminClient
      .from('ops_user_profiles')
      .select('branch_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') throw new Error('Admin only');

    const branchId = profile.branch_id;

    // Get existing items to avoid duplicates
    const { data: existing } = await adminClient
      .from('ops_inventory_items')
      .select('name_en')
      .eq('branch_id', branchId);
    const existingNames = new Set((existing || []).map((e: any) => e.name_en.toLowerCase()));

    // Insert new items
    const newItems = CATALOG_ITEMS
      .filter(item => !existingNames.has(item.name.toLowerCase()))
      .map(item => ({
        branch_id: branchId,
        name_en: item.name,
        category: item.category,
        unit: item.unit,
        par_level: Math.ceil(item.default_qty),
        reorder_point: Math.max(1, Math.ceil(item.default_qty * 0.3)),
        current_stock: 0,
        expiry_warn_days: item.shelf_life <= 7 ? 1 : item.shelf_life <= 30 ? 3 : 7,
        is_active: true,
      }));

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: 'All items already exist' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert in batches of 20
    let inserted = 0;
    for (let i = 0; i < newItems.length; i += 20) {
      const batch = newItems.slice(i, i + 20);
      const { error } = await adminClient.from('ops_inventory_items').insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ inserted, total: CATALOG_ITEMS.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

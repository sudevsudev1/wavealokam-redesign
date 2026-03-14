import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useEffect } from 'react';

export interface InventoryItem {
  id: string;
  branch_id: string;
  name_en: string;
  name_ml: string | null;
  category: string;
  unit: string;
  par_level: number;
  current_stock: number;
  reorder_point: number;
  expiry_warn_days: number | null;
  mfg_offset_days: number;
  last_received_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  ordered_at: string | null;
  received_at: string | null;
  receive_proof_url: string | null;
  receive_notes: string | null;
  vendor: string | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  received_quantity: number | null;
  unit_price: number | null;
  branch_id: string;
}

export interface InventoryExpiry {
  id: string;
  branch_id: string;
  item_id: string;
  batch_label: string | null;
  quantity: number;
  expiry_date: string;
  is_disposed: boolean;
  disposed_at: string | null;
  disposed_by: string | null;
  created_at: string;
}

export interface RefillTemplate {
  id: string;
  branch_id: string;
  room_type: string;
  item_id: string;
  quantity: number;
  is_active: boolean;
}

export function useInventoryItems() {
  const { profile } = useOpsAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ops_inventory_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name_en');
      if (error) throw error;
      return (data || []) as unknown as InventoryItem[];
    },
    enabled: !!profile,
  });

  useEffect(() => {
    const channel = supabase
      .channel('ops_inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_inventory_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (item: {
      name_en: string;
      category: string;
      unit: string;
      par_level: number;
      reorder_point: number;
      expiry_warn_days: number | null;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('ops_inventory_items')
        .insert({
          branch_id: profile.branchId,
          name_en: item.name_en,
          category: item.category,
          unit: item.unit,
          par_level: item.par_level,
          reorder_point: item.reorder_point,
          expiry_warn_days: item.expiry_warn_days,
          current_stock: 0,
          is_active: true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
    },
  });
}

// Reverse map: inventory item name → linen item_type for lifecycle sync
const INVENTORY_TO_LINEN_TYPE: Record<string, string> = {
  'Bed Sheet (Double)': 'Bedsheet',
  'Bed Sheet (Single)': 'Duvet Cover',
  'Pillow Cover': 'Pillow Cover',
  'Hand Towel': 'Hand Towel',
  'Bath Towel (Large)': 'Bath Towel',
  'Blanket': 'Blanket',
  'Bath Mat': 'Mattress Protector',
  'Towel': 'Towel',
};

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemId, quantity, type, notes }: {
      itemId: string;
      quantity: number;
      type: 'in' | 'out' | 'adjust' | 'expire' | 'refill' | 'damage' | 'waste';
      notes?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      // Insert transaction
      const { error: txError } = await supabase.from('ops_inventory_transactions').insert({
        branch_id: profile.branchId,
        item_id: itemId,
        type,
        quantity,
        notes: notes || null,
        performed_by: profile.userId,
      } as any);
      if (txError) throw txError;

      // Get current item details (need name for linen mapping)
      const { data: item } = await supabase
        .from('ops_inventory_items')
        .select('current_stock, name_en, category')
        .eq('id', itemId)
        .single();
      if (!item) throw new Error('Item not found');

      const currentStock = (item as any).current_stock as number;
      const itemName = (item as any).name_en as string;
      const itemCategory = (item as any).category as string;
      let newStock: number;
      const isDeduction = type === 'out' || type === 'expire' || type === 'refill' || type === 'damage' || type === 'waste';
      if (type === 'adjust') {
        newStock = quantity;
      } else if (isDeduction) {
        newStock = Math.max(0, currentStock - Math.abs(quantity));
      } else {
        newStock = currentStock + Math.abs(quantity);
      }

      // FIFO batch deduction: remove earliest batches when stock is used
      if (isDeduction) {
        let remaining = Math.abs(quantity);
        const { data: batches } = await supabase
          .from('ops_inventory_expiry')
          .select('id, quantity, received_date')
          .eq('item_id', itemId)
          .eq('is_disposed', false)
          .order('received_date', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true });

        if (batches) {
          for (const batch of batches) {
            if (remaining <= 0) break;
            const batchQty = (batch as any).quantity as number;
            if (batchQty <= remaining) {
              await supabase
                .from('ops_inventory_expiry')
                .update({ is_disposed: true, disposed_at: new Date().toISOString(), disposed_by: profile.userId } as any)
                .eq('id', batch.id);
              remaining -= batchQty;
            } else {
              await supabase
                .from('ops_inventory_expiry')
                .update({ quantity: batchQty - remaining } as any)
                .eq('id', batch.id);
              remaining = 0;
            }
          }
        }
      }

      const updatePayload: any = { current_stock: newStock };
      if (type === 'in') updatePayload.last_received_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('ops_inventory_items')
        .update(updatePayload)
        .eq('id', itemId);
      if (updateError) throw updateError;

      // ── Linen lifecycle sync ──
      // When linen-category items are issued, transition ops_linen_items fresh→in_use
      if (isDeduction && itemCategory === 'Linens') {
        const linenType = INVENTORY_TO_LINEN_TYPE[itemName];
        if (linenType) {
          // Parse room from notes if present (e.g. "Room 102" or "Issue template: Room")
          const roomMatch = notes?.match(/(?:Room\s*)(\d+)/i);
          const roomId = roomMatch ? roomMatch[1] : null;

          // Find fresh linen items of this type to transition
          const { data: freshLinens } = await supabase
            .from('ops_linen_items')
            .select('id')
            .eq('branch_id', profile.branchId)
            .eq('item_type', linenType)
            .eq('status', 'fresh')
            .limit(Math.abs(quantity));

          if (freshLinens && freshLinens.length > 0) {
            const ids = freshLinens.map(l => l.id);
            const updateData: any = {
              status: 'in_use',
              status_changed_at: new Date().toISOString(),
              status_changed_by: profile.userId,
            };
            if (roomId) updateData.room_id = roomId;

            await supabase
              .from('ops_linen_items')
              .update(updateData)
              .in('id', ids);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_expiry'] });
      queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
    },
  });
}

export function usePurchaseOrders() {
  const { profile } = useOpsAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ops_purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseOrder[];
    },
    enabled: !!profile,
  });

  useEffect(() => {
    const channel = supabase
      .channel('ops_purchase_orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_purchase_orders'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function usePurchaseOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['ops_purchase_order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_purchase_order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return (data || []) as unknown as PurchaseOrderItem[];
    },
    enabled: !!orderId,
  });
}

export interface PurchaseListItem extends PurchaseOrderItem {
  completed_at: string | null;
  completed_by: string | null;
  added_by: string | null;
}

const ACTIVE_PURCHASE_ORDER_STATUSES = ['Draft', 'Requested', 'Approved', 'Ordered', 'Active'] as const;

// Get or create the single active purchase list for the branch
export function usePurchaseList() {
  const { profile } = useOpsAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ops_purchase_list', profile?.branchId],
    queryFn: async () => {
      if (!profile) return { order: null, items: [] };

      // Find latest non-finalized order
      const { data: orders } = await supabase
        .from('ops_purchase_orders')
        .select('*')
        .eq('branch_id', profile.branchId)
        .in('status', [...ACTIVE_PURCHASE_ORDER_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1);

      const order = (orders && orders.length > 0) ? orders[0] as unknown as PurchaseOrder : null;
      
      if (!order) return { order: null, items: [] };

      const { data: items } = await supabase
        .from('ops_purchase_order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('completed_at', { ascending: true, nullsFirst: true });

      return { order, items: (items || []) as unknown as PurchaseListItem[] };
    },
    enabled: !!profile,
  });

  useEffect(() => {
    const channel = supabase
      .channel('ops_purchase_list_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_order_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// Ensures an active purchase list exists, returns the order id
async function ensureActiveList(branchId: string, userId: string): Promise<string> {
  const { data: orders } = await supabase
    .from('ops_purchase_orders')
    .select('id')
    .eq('branch_id', branchId)
    .in('status', [...ACTIVE_PURCHASE_ORDER_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1);

  if (orders && orders.length > 0) return (orders[0] as any).id;

  const { data: newOrder, error } = await supabase
    .from('ops_purchase_orders')
    .insert({
      branch_id: branchId,
      requested_by: userId,
      status: 'Draft',
    } as any)
    .select()
    .single();
  if (error) throw error;
  return (newOrder as any).id;
}

export function useAddToPurchaseList() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (items: { item_id: string; quantity: number; name?: string }[]) => {
      if (!profile) throw new Error('Not authenticated');

      const orderId = await ensureActiveList(profile.branchId, profile.userId);

      // Get existing items to check for duplicates
      const { data: existingItems } = await supabase
        .from('ops_purchase_order_items')
        .select('id, item_id, quantity, completed_at')
        .eq('order_id', orderId);

      const duplicates: { item_id: string; name?: string; existingQty: number }[] = [];
      const newItems: { item_id: string; quantity: number }[] = [];

      for (const item of items) {
        const existing = (existingItems || []).find((ei: any) => ei.item_id === item.item_id && !ei.completed_at);
        if (existing) {
          duplicates.push({ item_id: item.item_id, name: item.name, existingQty: (existing as any).quantity });
        } else {
          newItems.push(item);
        }
      }

      // Insert non-duplicate items
      if (newItems.length > 0) {
        const insertPayload = newItems.map(i => ({
          order_id: orderId,
          item_id: i.item_id,
          quantity: i.quantity,
          branch_id: profile.branchId,
          added_by: profile.userId,
        }));
        const { error } = await supabase.from('ops_purchase_order_items').insert(insertPayload as any);
        if (error) throw error;
      }

      // Log to audit
      for (const item of newItems) {
        await supabase.from('ops_audit_log').insert({
          entity_type: 'purchase_list_item',
          entity_id: orderId,
          action: 'add_item',
          performed_by: profile.userId,
          branch_id: profile.branchId,
          after_json: { item_id: item.item_id, quantity: item.quantity },
        } as any);
      }

      return { added: newItems.length, duplicates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
    },
  });
}

export function useCompleteListItem() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemRowId, itemId, quantity }: { itemRowId: string; itemId: string; quantity: number }) => {
      if (!profile) throw new Error('Not authenticated');

      // Mark item as completed
      const { error } = await supabase
        .from('ops_purchase_order_items')
        .update({ completed_at: new Date().toISOString(), completed_by: profile.userId } as any)
        .eq('id', itemRowId);
      if (error) throw error;

      // Add to inventory
      const { data: inv } = await supabase
        .from('ops_inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();

      if (inv) {
        const newStock = ((inv as any).current_stock as number) + quantity;
        await supabase
          .from('ops_inventory_items')
          .update({ current_stock: newStock, last_received_at: new Date().toISOString() } as any)
          .eq('id', itemId);

        // Log inventory transaction
        await supabase.from('ops_inventory_transactions').insert({
          branch_id: profile.branchId,
          item_id: itemId,
          type: 'in',
          quantity,
          notes: 'Added from purchase list',
          performed_by: profile.userId,
        } as any);

        // Create expiry batch (FIFO) using item's shelf life and mfg offset
        const { data: itemMeta } = await supabase
          .from('ops_inventory_items')
          .select('mfg_offset_days, expiry_warn_days')
          .eq('id', itemId)
          .single();

        if (itemMeta) {
          const today = new Date();
          const mfgOffset = (itemMeta as any).mfg_offset_days ?? 2;
          const shelfLife = (itemMeta as any).expiry_warn_days;
          const receivedDate = today.toISOString().slice(0, 10);
          const mfgDate = new Date(today);
          mfgDate.setDate(mfgDate.getDate() - mfgOffset);
          // Expiry = mfg date + shelf life (or default 30 days)
          const expiryDate = new Date(mfgDate);
          expiryDate.setDate(expiryDate.getDate() + (shelfLife || 30));

          await supabase.from('ops_inventory_expiry').insert({
            branch_id: profile.branchId,
            item_id: itemId,
            quantity,
            received_date: receivedDate,
            mfg_date: mfgDate.toISOString().slice(0, 10),
            expiry_date: expiryDate.toISOString().slice(0, 10),
            batch_label: `PL-${today.toISOString().slice(0, 10)}`,
          } as any);
        }
      }

      // Audit log
      await supabase.from('ops_audit_log').insert({
        entity_type: 'purchase_list_item',
        entity_id: itemRowId,
        action: 'complete_item',
        performed_by: profile.userId,
        branch_id: profile.branchId,
        after_json: { item_id: itemId, quantity },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_expiry'] });
    },
  });
}

export function useUncompleteListItem() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemRowId, itemId, quantity }: { itemRowId: string; itemId: string; quantity: number }) => {
      if (!profile) throw new Error('Not authenticated');

      // Unmark completion
      const { error } = await supabase
        .from('ops_purchase_order_items')
        .update({ completed_at: null, completed_by: null } as any)
        .eq('id', itemRowId);
      if (error) throw error;

      // Reverse inventory addition
      const { data: inv } = await supabase
        .from('ops_inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();

      if (inv) {
        const newStock = Math.max(0, ((inv as any).current_stock as number) - quantity);
        await supabase
          .from('ops_inventory_items')
          .update({ current_stock: newStock } as any)
          .eq('id', itemId);

        await supabase.from('ops_inventory_transactions').insert({
          branch_id: profile.branchId,
          item_id: itemId,
          type: 'out',
          quantity,
          notes: 'Reversed: unchecked from purchase list',
          performed_by: profile.userId,
        } as any);
      }

      await supabase.from('ops_audit_log').insert({
        entity_type: 'purchase_list_item',
        entity_id: itemRowId,
        action: 'uncomplete_item',
        performed_by: profile.userId,
        branch_id: profile.branchId,
        after_json: { item_id: itemId, quantity },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_transactions'] });
    },
  });
}

export function useEditListItemQty() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemRowId, newQty, oldQty }: { itemRowId: string; newQty: number; oldQty: number }) => {
      if (!profile) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ops_purchase_order_items')
        .update({ quantity: newQty } as any)
        .eq('id', itemRowId);
      if (error) throw error;

      await supabase.from('ops_audit_log').insert({
        entity_type: 'purchase_list_item',
        entity_id: itemRowId,
        action: 'edit_quantity',
        performed_by: profile.userId,
        branch_id: profile.branchId,
        before_json: { quantity: oldQty },
        after_json: { quantity: newQty },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
    },
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemRowId, itemId, quantity }: { itemRowId: string; itemId: string; quantity: number }) => {
      if (!profile) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ops_purchase_order_items')
        .delete()
        .eq('id', itemRowId);
      if (error) throw error;

      await supabase.from('ops_audit_log').insert({
        entity_type: 'purchase_list_item',
        entity_id: itemRowId,
        action: 'delete_item',
        performed_by: profile.userId,
        branch_id: profile.branchId,
        before_json: { item_id: itemId, quantity },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
    },
  });
}

// Keep legacy hook for backward compatibility
export function useCreatePurchaseOrder() {
  const addToList = useAddToPurchaseList();
  return addToList;
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ops_purchase_orders')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_transactions'] });
    },
  });
}

export function useRefillTemplates(roomType?: string) {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_room_refill_templates', roomType],
    queryFn: async () => {
      let q = supabase
        .from('ops_room_refill_templates')
        .select('*')
        .eq('is_active', true);
      if (roomType) q = q.eq('room_type', roomType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RefillTemplate[];
    },
    enabled: !!profile,
  });
}

export function useExpiryItems() {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_inventory_expiry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_inventory_expiry')
        .select('*')
        .eq('is_disposed', false)
        .order('expiry_date');
      if (error) throw error;
      return (data || []) as unknown as InventoryExpiry[];
    },
    enabled: !!profile,
  });
}

export function useAddExpiry() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (entry: { item_id: string; batch_label?: string; quantity: number; expiry_date: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('ops_inventory_expiry').insert({
        branch_id: profile.branchId,
        ...entry,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_expiry'] });
    },
  });
}

export function useDisposeExpiry() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (expiryId: string) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ops_inventory_expiry')
        .update({ is_disposed: true, disposed_at: new Date().toISOString(), disposed_by: profile.userId } as any)
        .eq('id', expiryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_expiry'] });
    },
  });
}

export interface InventoryTransaction {
  id: string;
  branch_id: string;
  item_id: string;
  type: string;
  quantity: number;
  notes: string | null;
  performed_by: string;
  related_order_id: string | null;
  created_at: string;
}

export function useInventoryTransactions(itemId?: string) {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_inventory_transactions', itemId],
    queryFn: async () => {
      let q = supabase
        .from('ops_inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (itemId) q = q.eq('item_id', itemId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as InventoryTransaction[];
    },
    enabled: !!profile,
  });
}

export function useRooms() {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_rooms')
        .select('*')
        .eq('is_active', true)
        .order('id');
      if (error) throw error;
      return (data || []) as { id: string; room_type: string; branch_id: string; is_active: boolean }[];
    },
    enabled: !!profile,
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<InventoryItem, 'par_level' | 'reorder_point' | 'expiry_warn_days' | 'mfg_offset_days' | 'last_received_at' | 'name_en' | 'category' | 'unit' | 'current_stock'>> }) => {
      const { error } = await supabase
        .from('ops_inventory_items')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
    },
  });
}

export function useBatchDeleteInventoryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from('ops_inventory_items')
        .update({ is_active: false } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_transactions'] });
    },
  });
}

export interface PurchaseTemplate {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  created_by: string;
  items_json: { item_id: string; quantity: number }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePurchaseTemplates() {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_purchase_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_purchase_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as PurchaseTemplate[];
    },
    enabled: !!profile,
  });
}

export function useCreatePurchaseTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (template: { name: string; description?: string; items_json: { item_id: string; quantity: number }[] }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('ops_purchase_templates').insert({
        branch_id: profile.branchId,
        created_by: profile.userId,
        name: template.name,
        description: template.description || null,
        items_json: template.items_json as any,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_templates'] });
    },
  });
}

export function useDeletePurchaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ops_purchase_templates')
        .update({ is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_templates'] });
    },
  });
}

export function useUpdatePurchaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, items_json }: { id: string; name?: string; description?: string; items_json?: { item_id: string; quantity: number }[] }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (items_json !== undefined) updates.items_json = items_json;
      const { error } = await supabase.from('ops_purchase_templates').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_templates'] });
    },
  });
}

export function useApplyRefillTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ roomType, roomId }: { roomType: string; roomId: string }) => {
      if (!profile) throw new Error('Not authenticated');
      // Get templates for this room type
      const { data: templates, error: tErr } = await supabase
        .from('ops_room_refill_templates')
        .select('*')
        .eq('room_type', roomType)
        .eq('is_active', true)
        .eq('branch_id', profile.branchId);
      if (tErr) throw tErr;
      if (!templates || templates.length === 0) throw new Error('No refill template for this room type');

      // Create transactions for each template item
      for (const t of templates) {
        const { error: txErr } = await supabase.from('ops_inventory_transactions').insert({
          branch_id: profile.branchId,
          item_id: (t as any).item_id,
          type: 'refill',
          quantity: -Math.abs((t as any).quantity),
          notes: `Room refill: ${roomId}`,
          performed_by: profile.userId,
        } as any);
        if (txErr) throw txErr;

        // Update stock
        const { data: item } = await supabase
          .from('ops_inventory_items')
          .select('current_stock')
          .eq('id', (t as any).item_id)
          .single();
        if (item) {
          const newStock = Math.max(0, ((item as any).current_stock as number) - Math.abs((t as any).quantity));
          await supabase.from('ops_inventory_items').update({ current_stock: newStock } as any).eq('id', (t as any).item_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_transactions'] });
    },
  });
}

export function useCreateRefillTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (entry: { room_type: string; item_id: string; quantity: number }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('ops_room_refill_templates').insert({
        branch_id: profile.branchId,
        room_type: entry.room_type,
        item_id: entry.item_id,
        quantity: entry.quantity,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_room_refill_templates'] });
    },
  });
}

export function useDeleteRefillTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ops_room_refill_templates')
        .update({ is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_room_refill_templates'] });
    },
  });
}

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

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ itemId, quantity, type, notes }: {
      itemId: string;
      quantity: number;
      type: 'in' | 'out' | 'adjust' | 'expire' | 'refill';
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

      // Get current stock
      const { data: item } = await supabase
        .from('ops_inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      if (!item) throw new Error('Item not found');

      const currentStock = (item as any).current_stock as number;
      let newStock: number;
      if (type === 'adjust') {
        newStock = quantity;
      } else if (type === 'out' || type === 'expire' || type === 'refill') {
        newStock = Math.max(0, currentStock - Math.abs(quantity));
      } else {
        newStock = currentStock + Math.abs(quantity);
      }

      const { error: updateError } = await supabase
        .from('ops_inventory_items')
        .update({ current_stock: newStock } as any)
        .eq('id', itemId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_items'] });
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

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (items: { item_id: string; quantity: number }[]) => {
      if (!profile) throw new Error('Not authenticated');

      const { data: order, error: orderError } = await supabase
        .from('ops_purchase_orders')
        .insert({
          branch_id: profile.branchId,
          requested_by: profile.userId,
          status: 'Requested',
        } as any)
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: (order as any).id,
        item_id: i.item_id,
        quantity: i.quantity,
        branch_id: profile.branchId,
      }));

      const { error: itemsError } = await supabase
        .from('ops_purchase_order_items')
        .insert(orderItems as any);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_orders'] });
    },
  });
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

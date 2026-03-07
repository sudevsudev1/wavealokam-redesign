import { useState, useEffect } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, usePurchaseOrderItems } from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { ORDER_STATUS_COLORS } from '../lib/inventoryConstants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Camera, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// Sub-component to display order items inline
function OrderItemsList({ orderId, items }: { orderId: string; items: { id: string; name_en: string; name_ml: string | null; unit: string }[] }) {
  const { data: orderItems = [] } = usePurchaseOrderItems(orderId);
  const { language } = useOpsLanguage();

  if (orderItems.length === 0) return null;

  const getName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 6);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const getUnit = (itemId: string) => items.find(i => i.id === itemId)?.unit || '';

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
      {orderItems.map(oi => (
        <span key={oi.id} className="text-[10px] text-muted-foreground">
          {getName(oi.item_id)} <span className="font-medium text-foreground">{oi.quantity}{getUnit(oi.item_id)}</span>
        </span>
      ))}
    </div>
  );
}

// Sub-component for admin editing order items before approval
function EditOrderItemsDialog({
  orderId,
  open,
  onClose,
  items,
  branchId,
  requestedBy,
  onApprove,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  items: { id: string; name_en: string; name_ml: string | null; unit: string }[];
  branchId: string;
  requestedBy: string;
  onApprove: () => void;
}) {
  const { data: orderItems = [], refetch } = usePurchaseOrderItems(orderId);
  const { language, t } = useOpsLanguage();
  const { profile } = useOpsAuth();
  const [editItems, setEditItems] = useState<{ id: string; item_id: string; quantity: number }[]>([]);
  const [newItemId, setNewItemId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && orderItems.length > 0) {
      setEditItems(orderItems.map(oi => ({ id: oi.id, item_id: oi.item_id, quantity: oi.quantity })));
    }
  }, [open, orderItems]);

  const getName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 6);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const updateQty = (id: string, qty: number) => {
    setEditItems(prev => prev.map(e => e.id === id ? { ...e, quantity: Math.round(qty * 100) / 100 } : e));
  };

  const removeItem = (id: string) => {
    setEditItems(prev => prev.filter(e => e.id !== id));
  };

  const addItem = (itemId: string) => {
    if (!itemId || editItems.some(e => e.item_id === itemId)) return;
    setEditItems(prev => [...prev, { id: `new-${crypto.randomUUID()}`, item_id: itemId, quantity: 1 }]);
    setNewItemId('');
  };

  const handleSaveAndApprove = async () => {
    if (editItems.length === 0) return;
    setSaving(true);
    try {
      const original = orderItems;
      const changes: string[] = [];

      // Delete removed items
      const removedIds = original.filter(o => !editItems.find(e => e.id === o.id)).map(o => o.id);
      for (const rid of removedIds) {
        const removed = original.find(o => o.id === rid);
        if (removed) changes.push(`Removed: ${getName(removed.item_id)}`);
        await supabase.from('ops_purchase_order_items').delete().eq('id', rid);
      }

      // Update existing & add new
      for (const ei of editItems) {
        if (ei.id.startsWith('new-')) {
          // New item
          await supabase.from('ops_purchase_order_items').insert({
            order_id: orderId,
            item_id: ei.item_id,
            quantity: ei.quantity,
            branch_id: branchId,
          } as any);
          changes.push(`Added: ${getName(ei.item_id)} ×${ei.quantity}`);
        } else {
          const orig = original.find(o => o.id === ei.id);
          if (orig && orig.quantity !== ei.quantity) {
            await supabase.from('ops_purchase_order_items').update({ quantity: ei.quantity } as any).eq('id', ei.id);
            changes.push(`${getName(ei.item_id)}: ${orig.quantity}→${ei.quantity}`);
          }
        }
      }

      // If changes were made, send notification to order creator
      if (changes.length > 0 && profile) {
        await supabase.from('ops_notifications').insert({
          branch_id: branchId,
          user_id: requestedBy,
          title: 'Purchase Order Modified',
          body: `Your PO ${orderId.slice(0, 8)} was modified before approval: ${changes.join(', ')}`,
          type: 'purchase',
          action_url: '/ops/purchase',
        } as any);
      }

      // Approve
      onApprove();
      await refetch();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-sm">{t('purchase.reviewOrder')}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {editItems.map(ei => (
            <div key={ei.id} className="flex items-center justify-between text-xs p-2 border rounded">
              <span className="truncate mr-2">{getName(ei.item_id)}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number" min="0.25" step="0.01" value={ei.quantity}
                  onChange={e => updateQty(ei.id, parseFloat(e.target.value) || 0.25)}
                  className="w-16 h-7 text-center text-xs"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(ei.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <Select value={newItemId} onValueChange={addItem}>
            <SelectTrigger className="text-xs"><SelectValue placeholder={t('purchase.addItem')} /></SelectTrigger>
            <SelectContent>
              {items.filter(i => !editItems.some(e => e.item_id === i.id)).map(i => (
                <SelectItem key={i.id} value={i.id}>{getName(i.id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSaveAndApprove} disabled={editItems.length === 0 || saving} className="w-full text-xs">
            {saving ? '...' : t('purchase.approveWithChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchasePage() {
  const { t, language } = useOpsLanguage();
  const { isAdmin, profile } = useOpsAuth();
  const { data: items = [] } = useInventoryItems();
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: profiles = [] } = useOpsProfiles();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();

  const [createOpen, setCreateOpen] = useState(false);
  const [cart, setCart] = useState<{ item_id: string; quantity: number }[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [receiveProofFile, setReceiveProofFile] = useState<File | null>(null);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  const getName = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return itemId;
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.display_name || userId.slice(0, 8);
  };

  const addToCart = (itemId: string) => {
    const existing = cart.find((c) => c.item_id === itemId);
    if (existing) {
      setCart(cart.map((c) => c.item_id === itemId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item_id: itemId, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item_id !== itemId));
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    try {
      await createOrder.mutateAsync(cart);
      toast.success(t('purchase.orderCreated'));
      setCart([]);
      setCreateOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'Approved') updates.approved_by = profile?.userId;
      if (newStatus === 'Ordered') updates.ordered_at = new Date().toISOString();
      await updateOrder.mutateAsync({ id: orderId, updates });
      toast.success(`Order ${newStatus.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReceive = async (orderId: string) => {
    if (!receiveProofFile) {
      toast.error(t('purchase.proofRequired'));
      return;
    }
    try {
      const filePath = `${profile!.branchId}/purchase/${orderId}/${crypto.randomUUID()}-${receiveProofFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ops-attachments')
        .upload(filePath, receiveProofFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ops-attachments')
        .getPublicUrl(filePath);

      const { data: orderItems, error: orderItemsError } = await supabase
        .from('ops_purchase_order_items')
        .select('item_id, quantity, received_quantity')
        .eq('order_id', orderId);
      if (orderItemsError) throw orderItemsError;

      if (orderItems && orderItems.length > 0) {
        for (const oi of orderItems) {
          const addQty = Math.max(0, Number((oi as any).received_quantity ?? (oi as any).quantity ?? 0));
          if (!addQty) continue;

          const { data: inv, error: invError } = await supabase
            .from('ops_inventory_items')
            .select('current_stock')
            .eq('id', (oi as any).item_id)
            .single();
          if (invError) throw invError;

          const { error: updateStockError } = await supabase
            .from('ops_inventory_items')
            .update({ current_stock: ((inv as any).current_stock as number) + addQty, last_received_at: new Date().toISOString() } as any)
            .eq('id', (oi as any).item_id);
          if (updateStockError) throw updateStockError;

          const { error: txError } = await supabase
            .from('ops_inventory_transactions')
            .insert({
              branch_id: profile!.branchId,
              item_id: (oi as any).item_id,
              type: 'in',
              quantity: addQty,
              notes: `PO received: ${orderId.slice(0, 8)}`,
              performed_by: profile!.userId,
              related_order_id: orderId,
            } as any);
          if (txError) throw txError;
        }
      }

      // Build item summary for the auto-task
      const order = orders.find(o => o.id === orderId);
      const itemSummary = (orderItems || []).map(oi => {
        const name = getName((oi as any).item_id);
        const qty = (oi as any).received_quantity ?? (oi as any).quantity ?? 0;
        return `${name} ×${qty}`;
      }).join(', ');

      await updateOrder.mutateAsync({
        id: orderId,
        updates: {
          status: 'Received',
          received_at: new Date().toISOString(),
          receive_proof_url: urlData.publicUrl,
          receive_notes: receiveNotes || null,
        },
      });

      // Auto-create task for the order creator
      if (order && profile) {
        await supabase.from('ops_tasks').insert({
          branch_id: profile.branchId,
          created_by: profile.userId,
          assigned_to: [order.requested_by],
          title_original: `PO ${orderId.slice(0, 8)} received – verify & store`,
          title_en: `PO ${orderId.slice(0, 8)} received – verify & store`,
          description_en: `Purchase order received. Items: ${itemSummary}. Please verify quantities and store properly.`,
          description_original: `Purchase order received. Items: ${itemSummary}. Please verify quantities and store properly.`,
          original_language: 'en',
          category: 'Inventory',
          priority: 'Medium',
          status: 'To Do',
          proof_required: false,
          receipt_required: false,
        } as any);
      }

      toast.success(t('purchase.received'));
      setSelectedOrder(null);
      setReceiveProofFile(null);
      setReceiveNotes('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reorderItems = items.filter((i) => i.current_stock <= i.reorder_point);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">{t('purchase.title')}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" />{t('purchase.newOrder')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">{t('purchase.newOrder')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {reorderItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{t('purchase.suggestedItems')}</p>
                  <div className="space-y-1">
                    {reorderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded bg-orange-50 border border-orange-200">
                        <span className="truncate mr-2">{getName(item.id)} <span className="text-muted-foreground">({item.current_stock}/{item.par_level})</span></span>
                        <Button size="sm" variant="outline" onClick={() => addToCart(item.id)} className="h-6 w-6 p-0 shrink-0">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Select onValueChange={(val) => addToCart(val)}>
                <SelectTrigger className="text-xs"><SelectValue placeholder={t('purchase.addItem')} /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {getName(i.id)} ({i.current_stock} {i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {cart.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium">{t('purchase.cart')} ({cart.length})</p>
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex items-center justify-between text-xs p-2 border rounded">
                      <span className="truncate mr-2">{getName(c.item_id)}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number" min="0.25" step="0.01" value={c.quantity}
                          onChange={(e) => setCart(cart.map((x) => x.item_id === c.item_id ? { ...x, quantity: parseFloat(e.target.value) || 0.25 } : x))}
                          className="w-14 h-7 text-center text-xs"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(c.item_id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleCreateOrder} disabled={cart.length === 0 || createOrder.isPending} className="w-full text-xs">
                {createOrder.isPending ? '...' : t('purchase.submitOrder')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">{order.id.slice(0, 8)}</span>
                    <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ''}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5">{getProfileName(order.requested_by)} · {format(parseISO(order.created_at), 'dd/MM/yyyy')}</p>
                  {/* Inline items list */}
                  <OrderItemsList orderId={order.id} items={items} />
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {isAdmin && order.status === 'Requested' && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditOrderId(order.id)}>
                        <Pencil className="h-3 w-3 mr-0.5" />{t('purchase.review')}
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleStatusChange(order.id, 'Approved')}>
                        {t('purchase.approve')}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => handleStatusChange(order.id, 'Cancelled')}>
                        ✕
                      </Button>
                    </>
                  )}
                  {isAdmin && order.status === 'Approved' && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleStatusChange(order.id, 'Ordered')}>
                      {t('purchase.markOrdered')}
                    </Button>
                  )}
                  {order.status === 'Ordered' && (
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={() => setSelectedOrder(order.id)}>
                      <Camera className="h-3 w-3 mr-1" />{t('purchase.receive')}
                    </Button>
                  )}
                  {order.status === 'Received' && order.receive_proof_url && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" asChild>
                      <a href={order.receive_proof_url} target="_blank" rel="noopener noreferrer">
                        <CheckCircle className="h-3 w-3 mr-1" />Proof
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">{t('purchase.noOrders')}</div>
        )}
      </div>

      {/* Edit Order Items Dialog (admin review before approval) */}
      {editOrderId && (
        <EditOrderItemsDialog
          orderId={editOrderId}
          open={!!editOrderId}
          onClose={() => setEditOrderId(null)}
          items={items}
          branchId={profile?.branchId || ''}
          requestedBy={orders.find(o => o.id === editOrderId)?.requested_by || ''}
          onApprove={() => handleStatusChange(editOrderId, 'Approved')}
        />
      )}

      {/* Receive Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">{t('purchase.receiveOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">{t('purchase.proofPhoto')} *</label>
              <Input
                type="file" accept="image/*" capture="environment"
                onChange={(e) => setReceiveProofFile(e.target.files?.[0] || null)}
                className="mt-1 text-xs"
              />
              {!receiveProofFile && (
                <p className="text-[10px] text-destructive mt-1">{t('purchase.proofRequired')}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium">{t('purchase.notes')}</label>
              <Input
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder={t('purchase.notesPlaceholder')}
                className="mt-1 text-xs"
              />
            </div>
            <Button
              onClick={() => selectedOrder && handleReceive(selectedOrder)}
              disabled={!receiveProofFile || updateOrder.isPending}
              className="w-full text-xs"
            >
              {updateOrder.isPending ? '...' : t('purchase.confirmReceive')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

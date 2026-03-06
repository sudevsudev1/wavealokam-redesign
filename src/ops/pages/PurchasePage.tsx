import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder } from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { ORDER_STATUS_COLORS } from '../lib/inventoryConstants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plus, Trash2, Camera, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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

      await updateOrder.mutateAsync({
        id: orderId,
        updates: {
          status: 'Received',
          received_at: new Date().toISOString(),
          receive_proof_url: urlData.publicUrl,
          receive_notes: receiveNotes || null,
        },
      });
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
                          type="number" min="1" value={c.quantity}
                          onChange={(e) => setCart(cart.map((x) => x.item_id === c.item_id ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))}
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

      {/* Orders list - mobile card layout */}
      <div className="space-y-2">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">{order.id.slice(0, 8)}</span>
                    <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ''}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5">{getProfileName(order.requested_by)} · {format(parseISO(order.created_at), 'dd MMM')}</p>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {isAdmin && order.status === 'Requested' && (
                    <>
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
import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, usePurchaseOrders, usePurchaseOrderItems, useCreatePurchaseOrder, useUpdatePurchaseOrder } from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { ORDER_STATUS_COLORS } from '../lib/inventoryConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  // Items needing reorder
  const reorderItems = items.filter((i) => i.current_stock <= i.reorder_point);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('purchase.title')}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('purchase.newOrder')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('purchase.newOrder')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {/* Quick add from reorder items */}
              {reorderItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('purchase.suggestedItems')}</p>
                  <div className="space-y-1">
                    {reorderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded bg-orange-50 border border-orange-200">
                        <span>{getName(item.id)} <span className="text-xs text-muted-foreground">({item.current_stock}/{item.par_level})</span></span>
                        <Button size="sm" variant="outline" onClick={() => addToCart(item.id)} className="h-7">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All items select */}
              <Select onValueChange={(val) => addToCart(val)}>
                <SelectTrigger><SelectValue placeholder={t('purchase.addItem')} /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {getName(i.id)} ({i.current_stock} {i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">{t('purchase.cart')} ({cart.length})</p>
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <span>{getName(c.item_id)}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" min="1" value={c.quantity}
                          onChange={(e) => setCart(cart.map((x) => x.item_id === c.item_id ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))}
                          className="w-16 h-7 text-center"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.item_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleCreateOrder} disabled={cart.length === 0 || createOrder.isPending} className="w-full">
                {createOrder.isPending ? '...' : t('purchase.submitOrder')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders list */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('purchase.orderId')}</TableHead>
              <TableHead>{t('purchase.requestedBy')}</TableHead>
              <TableHead>{t('purchase.date')}</TableHead>
              <TableHead className="text-center">{t('purchase.status')}</TableHead>
              <TableHead className="text-right">{t('inv.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="text-sm">{getProfileName(order.requested_by)}</TableCell>
                <TableCell className="text-sm">{format(parseISO(order.created_at), 'dd MMM')}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${ORDER_STATUS_COLORS[order.status] || ''}`}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {isAdmin && order.status === 'Requested' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(order.id, 'Approved')}>
                          {t('purchase.approve')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleStatusChange(order.id, 'Cancelled')}>
                          {t('purchase.cancel')}
                        </Button>
                      </>
                    )}
                    {isAdmin && order.status === 'Approved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(order.id, 'Ordered')}>
                        {t('purchase.markOrdered')}
                      </Button>
                    )}
                    {order.status === 'Ordered' && (
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setSelectedOrder(order.id)}>
                        <Camera className="h-3 w-3 mr-1" />{t('purchase.receive')}
                      </Button>
                    )}
                    {order.status === 'Received' && order.receive_proof_url && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <a href={order.receive_proof_url} target="_blank" rel="noopener noreferrer">
                          <CheckCircle className="h-3 w-3 mr-1" />{t('purchase.viewProof')}
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('purchase.noOrders')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Receive Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('purchase.receiveOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('purchase.proofPhoto')} *</label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setReceiveProofFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              {!receiveProofFile && (
                <p className="text-xs text-destructive mt-1">{t('purchase.proofRequired')}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t('purchase.notes')}</label>
              <Input
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder={t('purchase.notesPlaceholder')}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => selectedOrder && handleReceive(selectedOrder)}
              disabled={!receiveProofFile || updateOrder.isPending}
              className="w-full"
            >
              {updateOrder.isPending ? '...' : t('purchase.confirmReceive')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

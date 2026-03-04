import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import {
  useInventoryItems, useExpiryItems, useAddExpiry, useDisposeExpiry,
  useUpdateStock, usePurchaseOrders, usePurchaseOrderItems,
  useUpdatePurchaseOrder, useCreatePurchaseOrder,
  useInventoryTransactions, useRooms, useRefillTemplates, useApplyRefillTemplate,
  InventoryItem, InventoryTransaction,
} from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { STOCK_STATUS, INVENTORY_CATEGORIES, ORDER_STATUS_COLORS } from '../lib/inventoryConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, AlertTriangle, Search, Plus, Camera, CheckCircle,
  Loader2, ArrowDown, ArrowUp, Truck, ClipboardList, RotateCcw,
  ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export default function InventoryPage() {
  const { t, language } = useOpsLanguage();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: orders = [] } = usePurchaseOrders();

  const lowStockCount = items.filter((i) => i.current_stock <= i.reorder_point).length;
  const activeOrders = orders.filter(o => ['Approved', 'Ordered'].includes(o.status)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold leading-tight">{items.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('inv.totalItems')}</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-orange-300' : ''}>
          <CardContent className="p-2.5 text-center">
            <p className={`text-lg font-bold leading-tight ${lowStockCount > 0 ? 'text-orange-600' : ''}`}>{lowStockCount}</p>
            <p className="text-[10px] text-muted-foreground">{t('inv.lowStock')}</p>
          </CardContent>
        </Card>
        <Card className={activeOrders > 0 ? 'border-purple-300' : ''}>
          <CardContent className="p-2.5 text-center">
            <p className={`text-lg font-bold leading-tight ${activeOrders > 0 ? 'text-purple-600' : ''}`}>{activeOrders}</p>
            <p className="text-[10px] text-muted-foreground">{t('inv.orderedTab')}</p>
          </CardContent>
        </Card>
      </div>

      {/* 4-Tab Interface */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="text-[10px] sm:text-xs">{t('inv.overviewTab')}</TabsTrigger>
          <TabsTrigger value="due" className="text-[10px] sm:text-xs">
            {t('inv.dueTab')}
            {lowStockCount > 0 && <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{lowStockCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ordered" className="text-[10px] sm:text-xs">
            {t('inv.orderedTab')}
            {activeOrders > 0 && <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{activeOrders}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="log" className="text-[10px] sm:text-xs">{t('inv.logTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab items={items} /></TabsContent>
        <TabsContent value="due"><DueForOrderTab items={items} /></TabsContent>
        <TabsContent value="ordered"><OrderedOnWayTab /></TabsContent>
        <TabsContent value="log"><LogUsageTab items={items} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Tab 1: Overview ─── */
function OverviewTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const getName = (item: { name_en: string; name_ml: string | null }) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const name = getName(item);
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || item.name_en.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter, language]);

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('inv.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inv.allCategories')}</SelectItem>
            {INVENTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        {filtered.map((item) => {
          const status = STOCK_STATUS(item.current_stock, item.par_level, item.reorder_point);
          const isExpanded = expandedItem === item.id;
          return (
            <Card key={item.id}>
              <CardContent className="p-2.5">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm truncate block">{getName(item)}</span>
                    <span className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-semibold text-sm">{item.current_stock}</span>
                      <span className="text-[10px] text-muted-foreground block">/{item.par_level}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && <ItemLedger itemId={item.id} itemName={getName(item)} />}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">No items found</div>
        )}
      </div>
    </div>
  );
}

function ItemLedger({ itemId, itemName }: { itemId: string; itemName: string }) {
  const { t } = useOpsLanguage();
  const { data: txns, isLoading } = useInventoryTransactions(itemId);
  const { data: profiles } = useOpsProfiles();
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  const typeIcon: Record<string, { icon: typeof ArrowDown; color: string; label: string }> = {
    in: { icon: ArrowDown, color: 'text-emerald-600', label: 'Stock In' },
    out: { icon: ArrowUp, color: 'text-orange-600', label: 'Issue' },
    adjust: { icon: RotateCcw, color: 'text-blue-600', label: 'Adjust' },
    expire: { icon: Trash2, color: 'text-red-600', label: 'Expired' },
    refill: { icon: Package, color: 'text-purple-600', label: 'Refill' },
    damage: { icon: AlertTriangle, color: 'text-red-600', label: 'Damage' },
    waste: { icon: Trash2, color: 'text-amber-600', label: 'Waste' },
  };

  if (isLoading) return <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="mt-2 pt-2 border-t border-border space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t('inv.ledger')}</p>
      {(!txns || txns.length === 0) ? (
        <p className="text-xs text-muted-foreground py-2">{t('inv.noTransactions')}</p>
      ) : (
        txns.slice(0, 15).map(tx => {
          const info = typeIcon[tx.type] || typeIcon['adjust'];
          const Icon = info.icon;
          return (
            <div key={tx.id} className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${info.color}`} />
                <span className="text-foreground/70">{info.label}</span>
                {tx.notes && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">· {tx.notes}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-mono font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                </span>
                <span className="text-[10px] text-muted-foreground">{format(parseISO(tx.created_at), 'dd MMM HH:mm')}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Tab 2: Due for Order ─── */
function DueForOrderTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const createOrder = useCreatePurchaseOrder();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const dueItems = items.filter(i => i.current_stock <= i.reorder_point);

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };

  const handleGeneratePO = async () => {
    if (selectedItems.size === 0) return;
    const cart = Array.from(selectedItems).map(id => {
      const item = items.find(i => i.id === id)!;
      return { item_id: id, quantity: Math.max(1, item.par_level - item.current_stock) };
    });
    try {
      await createOrder.mutateAsync(cart);
      toast.success(t('purchase.orderCreated'));
      setSelectedItems(new Set());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {dueItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('inv.noDueItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedItems.size > 0 && (
            <Button
              onClick={handleGeneratePO}
              disabled={createOrder.isPending}
              className="w-full gap-1.5 text-xs"
            >
              {createOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
              {t('inv.generatePO')} ({selectedItems.size} items)
            </Button>
          )}

          {dueItems.map(item => {
            const deficit = item.par_level - item.current_stock;
            const isSelected = selectedItems.has(item.id);
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-orange-200'}`}
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">{getName(item)}</span>
                        <span className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm font-bold text-orange-600">{item.current_stock}</span>
                        <span className="text-[10px] text-muted-foreground">/ {item.par_level}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Need: {deficit > 0 ? deficit : 0} {item.unit}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ─── Tab 3: Ordered on Way ─── */
function OrderedOnWayTab() {
  const { t, language } = useOpsLanguage();
  const { profile, isAdmin } = useOpsAuth();
  const { data: items = [] } = useInventoryItems();
  const { data: orders = [] } = usePurchaseOrders();
  const { data: profiles = [] } = useOpsProfiles();
  const updateOrder = useUpdatePurchaseOrder();
  const addExpiry = useAddExpiry();

  const [receivingOrder, setReceivingOrder] = useState<string | null>(null);
  const [receiveProofFile, setReceiveProofFile] = useState<File | null>(null);
  const [receiveNotes, setReceiveNotes] = useState('');

  const getName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.display_name || userId.slice(0, 8);
  };

  const activeOrders = orders.filter(o => ['Requested', 'Approved', 'Ordered'].includes(o.status));

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

      const receiveDate = new Date();
      await updateOrder.mutateAsync({
        id: orderId,
        updates: {
          status: 'Received',
          received_at: receiveDate.toISOString(),
          receive_proof_url: urlData.publicUrl,
          receive_notes: receiveNotes || null,
        },
      });

      // Auto-create expiry entries: mfg date = receive date - 2 days
      // For items with expiry_warn_days, calculate expiry from manufacture
      const { data: orderItems } = await supabase
        .from('ops_purchase_order_items')
        .select('*')
        .eq('order_id', orderId);

      if (orderItems) {
        for (const oi of orderItems) {
          const item = items.find(i => i.id === (oi as any).item_id);
          if (item?.expiry_warn_days) {
            // mfg = receive - 2 days, expiry = mfg + typical shelf life (use expiry_warn_days * 3 as rough shelf life)
            const mfgDate = new Date(receiveDate);
            mfgDate.setDate(mfgDate.getDate() - 2);
            const expiryDate = new Date(mfgDate);
            expiryDate.setDate(expiryDate.getDate() + (item.expiry_warn_days * 3));

            await addExpiry.mutateAsync({
              item_id: item.id,
              quantity: (oi as any).quantity,
              expiry_date: format(expiryDate, 'yyyy-MM-dd'),
              batch_label: `PO-${orderId.slice(0, 6)}-${format(receiveDate, 'ddMMM')}`,
            });
          }
        }
      }

      toast.success(t('purchase.received'));
      setReceivingOrder(null);
      setReceiveProofFile(null);
      setReceiveNotes('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {activeOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('inv.noActiveOrders')}</p>
          </CardContent>
        </Card>
      ) : (
        activeOrders.map(order => (
          <Card key={order.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">{order.id.slice(0, 8)}</span>
                    <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ''}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5">{getProfileName(order.requested_by)} · {format(parseISO(order.created_at), 'dd MMM')}</p>
                  {order.vendor && <p className="text-[10px] text-muted-foreground">Vendor: {order.vendor}</p>}
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
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={() => setReceivingOrder(order.id)}>
                      <Camera className="h-3 w-3 mr-1" />{t('inv.receiveOrder')}
                    </Button>
                  )}
                </div>
              </div>

              <OrderItemsList orderId={order.id} />
            </CardContent>
          </Card>
        ))
      )}

      {/* Receive Dialog */}
      <Dialog open={!!receivingOrder} onOpenChange={(open) => { if (!open) setReceivingOrder(null); }}>
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
            <p className="text-[10px] text-muted-foreground">
              Expiry dates will be auto-calculated for perishable items (mfg = receive date − 2 days)
            </p>
            <Button
              onClick={() => receivingOrder && handleReceive(receivingOrder)}
              disabled={!receiveProofFile || updateOrder.isPending}
              className="w-full text-xs"
            >
              {updateOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('purchase.confirmReceive')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderItemsList({ orderId }: { orderId: string }) {
  const { data: orderItems, isLoading } = usePurchaseOrderItems(orderId);
  const { data: items = [] } = useInventoryItems();
  const { language } = useOpsLanguage();

  if (isLoading) return <Loader2 className="h-3 w-3 animate-spin" />;
  if (!orderItems || orderItems.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {orderItems.map(oi => {
        const item = items.find(i => i.id === oi.item_id);
        const name = item ? (language === 'ml' && item.name_ml ? item.name_ml : item.name_en) : oi.item_id.slice(0, 6);
        return (
          <Badge key={oi.id} variant="secondary" className="text-[10px]">
            {name} ×{oi.quantity}
          </Badge>
        );
      })}
    </div>
  );
}

/* ─── Tab 4: Log Usage / Refill ─── */
function LogUsageTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const { data: rooms = [] } = useRooms();
  const updateStock = useUpdateStock();
  const applyRefill = useApplyRefillTemplate();

  const [logType, setLogType] = useState<'issue' | 'damage' | 'waste' | 'refill'>('issue');
  const [selectedItem, setSelectedItem] = useState('');
  const [logQty, setLogQty] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const handleQuickLog = async () => {
    if (!selectedItem || !logQty) return;
    try {
      const type = logType === 'issue' ? 'out' : logType;
      await updateStock.mutateAsync({
        itemId: selectedItem,
        quantity: parseInt(logQty) || 1,
        type: type as any,
        notes: logNote || `${logType}${selectedRoom ? ` - Room ${selectedRoom}` : ''}`,
      });
      toast.success(`${logType} logged`);
      setSelectedItem('');
      setLogQty('1');
      setLogNote('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRoomRefill = async () => {
    if (!selectedRoom) return;
    const room = rooms.find(r => r.id === selectedRoom);
    if (!room) return;
    try {
      await applyRefill.mutateAsync({ roomType: room.room_type, roomId: room.id });
      toast.success(`Room ${room.id} refilled`);
      setSelectedRoom('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Group room types
  const roomTypes = [...new Set(rooms.map(r => r.room_type))];

  return (
    <div className="space-y-3 mt-2">
      {/* Room Refill Section */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="h-4 w-4 text-primary" />
            {t('inv.refillRoom')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="text-xs"><SelectValue placeholder={t('inv.selectRoom')} /></SelectTrigger>
            <SelectContent>
              {rooms.map(r => (
                <SelectItem key={r.id} value={r.id}>Room {r.id} ({r.room_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRoomRefill}
            disabled={!selectedRoom || applyRefill.isPending}
            className="w-full text-xs gap-1.5"
            variant="outline"
          >
            {applyRefill.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            {t('inv.applyTemplate')}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Log Section */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t('inv.quickLog')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {/* Log type selector */}
          <div className="flex gap-1">
            {(['issue', 'damage', 'waste'] as const).map(type => (
              <Button
                key={type}
                size="sm"
                variant={logType === type ? 'default' : 'outline'}
                className="flex-1 text-[10px] h-7"
                onClick={() => setLogType(type)}
              >
                {t(`inv.${type}`)}
              </Button>
            ))}
          </div>

          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="text-xs"><SelectValue placeholder={t('inv.selectItem')} /></SelectTrigger>
            <SelectContent>
              {items.map(i => (
                <SelectItem key={i.id} value={i.id}>
                  {getName(i)} ({i.current_stock} {i.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="number" min="1" value={logQty}
              onChange={e => setLogQty(e.target.value)}
              placeholder={t('inv.quantity')}
              className="w-20 text-xs"
            />
            <Input
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              placeholder={t('inv.logNote')}
              className="flex-1 text-xs"
            />
          </div>

          <Button
            onClick={handleQuickLog}
            disabled={!selectedItem || updateStock.isPending}
            className="w-full text-xs gap-1.5"
          >
            {updateStock.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t('inv.quickLog')}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm">{t('inv.ledger')}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <RecentTransactions items={items} />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentTransactions({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const { data: txns, isLoading } = useInventoryTransactions();
  const { data: profiles } = useOpsProfiles();
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  const getName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 6);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin mx-auto" />;

  return (
    <div className="space-y-1">
      {(!txns || txns.length === 0) ? (
        <p className="text-xs text-muted-foreground py-3 text-center">{t('inv.noTransactions')}</p>
      ) : (
        txns.slice(0, 20).map(tx => (
          <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
            <div className="min-w-0 flex-1">
              <span className="font-medium truncate block">{getName(tx.item_id)}</span>
              <span className="text-[10px] text-muted-foreground">
                {tx.type} · {profileMap.get(tx.performed_by) || '?'} {tx.notes ? `· ${tx.notes}` : ''}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className={`font-mono font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {tx.quantity > 0 ? '+' : ''}{tx.quantity}
              </span>
              <p className="text-[10px] text-muted-foreground">{format(parseISO(tx.created_at), 'dd MMM HH:mm')}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

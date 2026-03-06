import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import {
  useInventoryItems, useExpiryItems, useAddExpiry, useDisposeExpiry,
  useUpdateStock, usePurchaseOrders, usePurchaseOrderItems,
  useUpdatePurchaseOrder, useCreatePurchaseOrder,
  useInventoryTransactions, useRooms, useRefillTemplates, useApplyRefillTemplate,
  useUpdateInventoryItem, useBatchDeleteInventoryItems, usePurchaseTemplates, useCreatePurchaseTemplate, useDeletePurchaseTemplate,
  InventoryItem, InventoryTransaction, PurchaseTemplate,
} from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { STOCK_STATUS, INVENTORY_CATEGORIES, INVENTORY_UNITS, ORDER_STATUS_COLORS } from '../lib/inventoryConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Package, AlertTriangle, Search, Plus, Camera, CheckCircle,
  Loader2, ArrowDown, ArrowUp, Truck, ClipboardList, RotateCcw,
  ChevronDown, ChevronUp, Trash2, Pencil, Save, ListPlus, Play,
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

      {/* 5-Tab Interface */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-5">
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
          <TabsTrigger value="templates" className="text-[10px] sm:text-xs">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab items={items} /></TabsContent>
        <TabsContent value="due"><DueForOrderTab items={items} /></TabsContent>
        <TabsContent value="ordered"><OrderedOnWayTab /></TabsContent>
        <TabsContent value="log"><LogUsageTab items={items} /></TabsContent>
        <TabsContent value="templates"><TemplatesTab items={items} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Tab 1: Overview ─── */
function OverviewTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const batchDeleteItems = useBatchDeleteInventoryItems();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

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

  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selectedForDelete.has(item.id));

  const toggleSelect = (id: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((item) => next.delete(item.id));
      } else {
        filtered.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedForDelete);
    if (!ids.length) return;
    const confirmed = window.confirm(`Delete ${ids.length} selected item(s)?`);
    if (!confirmed) return;

    try {
      await batchDeleteItems.mutateAsync(ids);
      toast.success(`${ids.length} item(s) deleted`);
      setSelectedForDelete(new Set());
      setEditMode(false);
      setExpandedItem(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

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

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={editMode ? 'secondary' : 'outline'}
            className="text-xs"
            onClick={() => {
              setEditMode((prev) => !prev);
              setExpandedItem(null);
              if (editMode) setSelectedForDelete(new Set());
            }}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
          </Button>

          {editMode && filtered.length > 0 && (
            <Button size="sm" variant="outline" className="text-xs" onClick={toggleSelectAllFiltered}>
              {allFilteredSelected ? 'Unselect Visible' : 'Select Visible'}
            </Button>
          )}

          {editMode && selectedForDelete.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="text-xs gap-1.5"
              onClick={handleBatchDelete}
              disabled={batchDeleteItems.isPending}
            >
              {batchDeleteItems.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Selected ({selectedForDelete.size})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map((item) => {
          const status = STOCK_STATUS(item.current_stock, item.par_level, item.reorder_point);
          const isExpanded = expandedItem === item.id;
          const isSelected = selectedForDelete.has(item.id);

          return (
            <Card key={item.id}>
              <CardContent className="p-2.5">
                <div className="flex items-start gap-2">
                  {isAdmin && editMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="mt-1"
                    />
                  )}

                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => {
                      if (!editMode) setExpandedItem(isExpanded ? null : item.id);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{getName(item)}</span>
                      <span className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && !editMode && (
                        <Button
                          size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      <div className="text-right">
                        <span className="font-mono font-semibold text-sm">{item.current_stock}</span>
                        <span className="text-[10px] text-muted-foreground block">/{item.par_level}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                      {!editMode && (isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />)}
                    </div>
                  </button>
                </div>
                {isExpanded && !editMode && <ItemLedger itemId={item.id} itemName={getName(item)} />}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">No items found</div>
        )}
      </div>

      {editingItem && (
        <EditItemDialog item={editingItem} onClose={() => setEditingItem(null)} />
      )}
    </div>
  );
}

/* ─── Admin Edit Item Dialog ─── */
function EditItemDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const updateItem = useUpdateInventoryItem();
  const [parLevel, setParLevel] = useState(String(item.par_level));
  const [reorderPoint, setReorderPoint] = useState(String(item.reorder_point));
  const [expiryWarnDays, setExpiryWarnDays] = useState(String(item.expiry_warn_days ?? ''));
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);

  const handleSave = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        updates: {
          par_level: parseInt(parLevel) || 1,
          reorder_point: parseInt(reorderPoint) || 1,
          expiry_warn_days: expiryWarnDays ? parseInt(expiryWarnDays) : null,
          category,
          unit,
        },
      });
      toast.success(`${item.name_en} updated`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit: {item.name_en}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Par Level</label>
              <Input type="number" min="1" value={parLevel} onChange={e => setParLevel(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reorder Point</label>
              <Input type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Expiry Warning (days)</label>
            <Input type="number" min="0" value={expiryWarnDays} onChange={e => setExpiryWarnDays(e.target.value)} placeholder="Optional" className="mt-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unit</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateItem.isPending} className="w-full text-xs gap-1.5">
            {updateItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

/* ─── Tab 5: Templates ─── */
function TemplatesTab({ items }: { items: InventoryItem[] }) {
  const { language } = useOpsLanguage();
  const { data: templates = [], isLoading } = usePurchaseTemplates();
  const { data: profiles = [] } = useOpsProfiles();
  const createTemplate = useCreatePurchaseTemplate();
  const deleteTemplate = useDeletePurchaseTemplate();
  const createOrder = useCreatePurchaseOrder();
  const [showCreate, setShowCreate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateItems, setTemplateItems] = useState<{ item_id: string; quantity: number }[]>([]);
  const [searchItem, setSearchItem] = useState('');

  const getName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.display_name || '?';
  };

  const filteredItems = useMemo(() => {
    if (!searchItem) return [];
    return items.filter(i =>
      i.name_en.toLowerCase().includes(searchItem.toLowerCase()) &&
      !templateItems.some(ti => ti.item_id === i.id)
    ).slice(0, 8);
  }, [items, searchItem, templateItems]);

  const addToTemplate = (itemId: string) => {
    setTemplateItems(prev => [...prev, { item_id: itemId, quantity: 1 }]);
    setSearchItem('');
  };

  const removeFromTemplate = (itemId: string) => {
    setTemplateItems(prev => prev.filter(ti => ti.item_id !== itemId));
  };

  const updateTemplateQty = (itemId: string, qty: number) => {
    setTemplateItems(prev => prev.map(ti => ti.item_id === itemId ? { ...ti, quantity: Math.max(1, qty) } : ti));
  };

  const handleCreate = async () => {
    if (!templateName.trim() || templateItems.length === 0) return;
    try {
      await createTemplate.mutateAsync({
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        items_json: templateItems,
      });
      toast.success('Template created');
      setShowCreate(false);
      setTemplateName('');
      setTemplateDesc('');
      setTemplateItems([]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUseTemplate = async (template: PurchaseTemplate) => {
    try {
      const cart = template.items_json.map(ti => ({ item_id: ti.item_id, quantity: ti.quantity }));
      await createOrder.mutateAsync(cart);
      toast.success('Purchase order created from template');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Template removed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-2">
      <Button onClick={() => setShowCreate(true)} className="w-full text-xs gap-1.5" variant="outline">
        <ListPlus className="h-3.5 w-3.5" /> Create Template
      </Button>

      {templates.length === 0 && !showCreate && (
        <Card>
          <CardContent className="py-8 text-center">
            <ListPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No templates yet. Create one for quick recurring orders.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Template Form */}
      {showCreate && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm">New Template</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <Input
              value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name (e.g., Daily Kitchen)" className="text-sm"
            />
            <Input
              value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
              placeholder="Description (optional)" className="text-xs"
            />

            {/* Search and add items */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchItem} onChange={e => setSearchItem(e.target.value)}
                placeholder="Search items to add..." className="pl-7 text-xs h-8"
              />
              {filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToTemplate(item.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex justify-between"
                    >
                      <span>{item.name_en}</span>
                      <span className="text-muted-foreground">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected items */}
            {templateItems.length > 0 && (
              <div className="space-y-1 border border-border rounded-md p-2">
                {templateItems.map(ti => (
                  <div key={ti.item_id} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{getName(ti.item_id)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => updateTemplateQty(ti.item_id, ti.quantity - 1)}>−</Button>
                      <span className="w-6 text-center font-mono">{ti.quantity}</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => updateTemplateQty(ti.item_id, ti.quantity + 1)}>+</Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => removeFromTemplate(ti.item_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!templateName.trim() || templateItems.length === 0 || createTemplate.isPending} className="flex-1 text-xs gap-1">
                {createTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setTemplateItems([]); setTemplateName(''); }} className="text-xs">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Templates */}
      {templates.map(tpl => (
        <Card key={tpl.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{tpl.name}</p>
                {tpl.description && <p className="text-[10px] text-muted-foreground">{tpl.description}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {tpl.items_json.length} items · by {getProfileName(tpl.created_by)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm" variant="default" className="h-7 text-[10px] px-2 gap-1"
                  onClick={() => handleUseTemplate(tpl)}
                  disabled={createOrder.isPending}
                >
                  <Play className="h-3 w-3" /> Use
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                  onClick={() => handleDelete(tpl.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {tpl.items_json.map(ti => (
                <Badge key={ti.item_id} variant="secondary" className="text-[10px]">
                  {getName(ti.item_id)} ×{ti.quantity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

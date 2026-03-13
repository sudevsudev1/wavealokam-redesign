import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import {
  useInventoryItems, useExpiryItems, useAddExpiry, useDisposeExpiry,
  useUpdateStock, useInventoryTransactions, useRooms, useRefillTemplates, useApplyRefillTemplate,
  useUpdateInventoryItem, useBatchDeleteInventoryItems, usePurchaseTemplates, useCreatePurchaseTemplate, useDeletePurchaseTemplate, useUpdatePurchaseTemplate,
  useCreateRefillTemplate, useDeleteRefillTemplate, useAddToPurchaseList, useCreateInventoryItem,
  InventoryItem, InventoryTransaction, PurchaseTemplate, InventoryExpiry,
} from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { STOCK_STATUS, INVENTORY_CATEGORIES, INVENTORY_UNITS, CONSUMABLE_CATEGORIES } from '../lib/inventoryConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import BulkActionBar from '../components/BulkActionBar';
import {
  Package, AlertTriangle, Search, Plus, CheckCircle,
  Loader2, ArrowDown, ArrowUp, ClipboardList, RotateCcw,
  ChevronDown, ChevronUp, Trash2, Pencil, Save, ListPlus, Minus, ShoppingCart, PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ItemBatchDates, fmtDate } from '../components/ItemBatchDates';


/** Quantity editor with +/- buttons */
function QtyEditor({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number" min={min} value={value}
        onChange={e => onChange(Math.max(min, parseInt(e.target.value) || min))}
        className="w-12 h-6 text-center text-xs px-1"
        onClick={e => e.stopPropagation()}
      />
      <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => onChange(value + 1)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

/** Quick issue button for inventory items */
function QuickIssueButton({ item, getName }: { item: InventoryItem; getName: (i: InventoryItem) => string }) {
  const updateStock = useUpdateStock();
  const [showDialog, setShowDialog] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const handleIssue = async () => {
    if (qty <= 0 || qty > item.current_stock) {
      toast.error(qty > item.current_stock ? 'Quantity exceeds stock' : 'Invalid quantity');
      return;
    }
    try {
      await updateStock.mutateAsync({
        itemId: item.id,
        quantity: qty,
        type: 'out',
        notes: note || `Quick issue: ${getName(item)}`,
      });
      toast.success(`Issued ${qty} ${item.unit} of ${getName(item)}`);
      setShowDialog(false);
      setQty(1);
      setNote('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Button
        size="sm" variant="ghost" className="h-6 w-6 p-0"
        onClick={(e) => { e.stopPropagation(); setShowDialog(true); }}
        title="Quick Issue"
      >
        <ArrowUp className="h-3 w-3 text-orange-500" />
      </Button>
      {showDialog && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
          <DialogContent className="max-w-xs" onClick={e => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="text-sm">Issue: {getName(item)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Stock: {item.current_stock} {item.unit}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                <Input type="number" min="1" max={item.current_stock} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Room 102" className="mt-1 text-sm" />
              </div>
              <Button onClick={handleIssue} disabled={updateStock.isPending} className="w-full text-xs gap-1.5">
                {updateStock.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                Issue {qty} {item.unit}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function getDueReason(item: InventoryItem, batches: InventoryExpiry[]): string | null {
  // Skip inactive/zero-par items
  if (!item.is_active || item.par_level <= 0) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const activeBatches = batches.filter(b => b.item_id === item.id && !b.is_disposed);
  const isConsumable = CONSUMABLE_CATEGORIES.includes(item.category);

  // Check expiry on active batches (applies to both consumable and non-consumable)
  if (activeBatches.length > 0) {
    const hasExpired = activeBatches.some(b => b.expiry_date <= todayStr);
    if (hasExpired) return 'expired';
    const nearExpiry = activeBatches.some(b => b.expiry_date <= tomorrowStr);
    if (nearExpiry) return 'nearing_expiry';
  }

  // For consumables: only expiry matters, quantity check is skipped
  if (isConsumable) return null;

  // For non-consumables: also check quantity-based reorder
  if (item.current_stock <= item.reorder_point && item.current_stock < item.par_level) {
    return 'low_quantity';
  }

  return null;
}

const DUE_REASON_LABELS: Record<string, { label: string; icon: string; className: string }> = {
  expired: { label: 'Expired', icon: '⚠', className: 'text-destructive font-medium' },
  nearing_expiry: { label: 'Nearing expiry', icon: '⏰', className: 'text-amber-600' },
  low_quantity: { label: 'Low quantity', icon: '📉', className: 'text-orange-600' },
};


export default function InventoryPage() {
  const [searchParams] = useSearchParams();
  const { t } = useOpsLanguage();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: expiryBatches = [], isLoading: expiryLoading } = useExpiryItems();

  const lowStockCount = useMemo(() => {
    return items.filter(i => getDueReason(i, expiryBatches) !== null).length;
  }, [items, expiryBatches]);

  if (isLoading || expiryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {/* 3-Tab Interface */}
      <Tabs defaultValue={searchParams.get('tab') || 'overview'}>
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-shrink-0 text-xs px-3">{t('inv.overviewTab')}</TabsTrigger>
          <TabsTrigger value="due" className="flex-shrink-0 text-xs px-3">
            {t('inv.dueTab')}
            {lowStockCount > 0 && <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{lowStockCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-shrink-0 text-xs px-3">Templates</TabsTrigger>
          <TabsTrigger value="ledger" className="flex-shrink-0 text-xs px-3">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab items={items} /></TabsContent>
        <TabsContent value="due"><DueForOrderTab items={items} expiryBatches={expiryBatches} /></TabsContent>
        <TabsContent value="templates"><TemplatesTab items={items} /></TabsContent>
        <TabsContent value="ledger"><FullLedgerTab items={items} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Tab 1: Overview ─── */
function OverviewTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const batchDeleteItems = useBatchDeleteInventoryItems();
  const updateItem = useUpdateInventoryItem();
  const addToList = useAddToPurchaseList();
  const createInventoryItem = useCreateInventoryItem();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listMode, setListMode] = useState(false);
  const [listQuantities, setListQuantities] = useState<Record<string, number>>({});
  const [showAddItem, setShowAddItem] = useState(false);

  // Bulk edit state
  const [bulkPending, setBulkPending] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleListSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        const item = items.find(i => i.id === id);
        if (item) {
          setListQuantities(q => ({ ...q, [id]: Math.max(1, item.par_level - item.current_stock) }));
        }
      }
      return next;
    });
  };

  const handleAddToList = async () => {
    if (selectedIds.size === 0) return;
    const cart = Array.from(selectedIds).map(id => ({
      item_id: id,
      quantity: listQuantities[id] || 1,
    }));
    try {
      await addToList.mutateAsync(cart);
      toast.success(`${cart.length} item(s) added to purchase list`);
      setSelectedIds(new Set());
      setListMode(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (action === 'delete') {
      const confirmed = window.confirm(`Delete ${ids.length} selected item(s)?`);
      if (!confirmed) return;
      setBulkPending(true);
      try {
        await batchDeleteItems.mutateAsync(ids);
        toast.success(`${ids.length} item(s) deleted`);
        setSelectedIds(new Set());
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBulkPending(false);
      }
      return;
    }

    if (action === 'edit') {
      setShowBulkEdit(true);
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
            size="sm" variant="outline" className="text-xs gap-1"
            onClick={() => setShowAddItem(true)}
          >
            <PlusCircle className="h-3 w-3" /> Add Item
          </Button>

          <Button
            size="sm"
            variant={editMode ? 'secondary' : 'outline'}
            className="text-xs"
            onClick={() => {
              setEditMode((prev) => !prev);
              setExpandedItem(null);
              if (editMode) { setSelectedIds(new Set()); }
              if (listMode) { setListMode(false); setSelectedIds(new Set()); }
            }}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
          </Button>

          {!editMode && (
            <Button
              size="sm"
              variant={listMode ? 'secondary' : 'outline'}
              className="text-xs gap-1"
              onClick={() => {
                setListMode((prev) => !prev);
                if (listMode) setSelectedIds(new Set());
              }}
            >
              <ShoppingCart className="h-3 w-3" />
              {listMode ? 'Cancel' : 'Add to List'}
            </Button>
          )}

          {listMode && selectedIds.size > 0 && (
            <Button
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleAddToList}
              disabled={addToList.isPending}
            >
              {addToList.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
              Add to List ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      {/* Bulk Action Bar for edit mode */}
      {editMode && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filtered.length}
          onSelectAll={() => setSelectedIds(new Set(filtered.map(i => i.id)))}
          onDeselectAll={() => setSelectedIds(new Set())}
          actions={[
            { label: 'Edit Selected', value: 'edit', icon: <Pencil className="h-3 w-3" /> },
            { label: 'Delete', value: 'delete', variant: 'destructive', icon: <Trash2 className="h-3 w-3" /> },
          ]}
          onAction={handleBulkAction}
          isPending={bulkPending}
        />
      )}

      <div className="space-y-1.5">
        {filtered.map((item) => {
          const status = STOCK_STATUS(item.current_stock, item.par_level, item.reorder_point);
          const isExpanded = expandedItem === item.id;
          const isSelected = selectedIds.has(item.id);

          return (
            <Card key={item.id} className={listMode && isSelected ? 'border-primary bg-primary/5' : ''}>
              <CardContent className="p-2.5">
                <div className="flex items-start gap-2">
                  {isAdmin && editMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="mt-1"
                    />
                  )}
                  {listMode && !editMode && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleListSelect(item.id)}
                      />
                      {isSelected && (
                        <QtyEditor
                          value={listQuantities[item.id] || Math.max(1, item.par_level - item.current_stock)}
                          onChange={v => setListQuantities(q => ({ ...q, [item.id]: v }))}
                        />
                      )}
                    </div>
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
                      <ItemBatchDates itemId={item.id} editable={isAdmin} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick Issue Button */}
                      {!editMode && !listMode && (
                        <QuickIssueButton item={item} getName={getName} />
                      )}
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

      {showAddItem && (
        <AddItemDialog onClose={() => setShowAddItem(false)} />
      )}

      {showBulkEdit && (
        <BulkEditDialog
          itemIds={Array.from(selectedIds)}
          items={items}
          isSingleCategory={categoryFilter !== 'all'}
          onClose={() => setShowBulkEdit(false)}
          onDone={() => { setShowBulkEdit(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}

/* ─── Add New Inventory Item Dialog ─── */
function AddItemDialog({ onClose }: { onClose: () => void }) {
  const createItem = useCreateInventoryItem();
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('F&B');
  const [unit, setUnit] = useState('pcs');
  const [parLevel, setParLevel] = useState('5');
  const [reorderPoint, setReorderPoint] = useState('2');
  const [shelfLife, setShelfLife] = useState('');
  const [mfgOffset, setMfgOffset] = useState('2');

  const handleSave = async () => {
    if (!nameEn.trim()) { toast.error('Name is required'); return; }
    try {
      await createItem.mutateAsync({
        name_en: nameEn.trim(),
        category,
        unit,
        par_level: parseInt(parLevel) || 5,
        reorder_point: parseInt(reorderPoint) || 2,
        expiry_warn_days: shelfLife ? parseInt(shelfLife) : null,
      });
      toast.success(`${nameEn} added to inventory`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Add New Inventory Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="e.g. Coffee Sachets" className="mt-1 text-sm" />
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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Par Level</label>
              <Input type="number" min="1" value={parLevel} onChange={e => setParLevel(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reorder Point</label>
              <Input type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Shelf Life (days)</label>
              <Input type="number" min="0" value={shelfLife} onChange={e => setShelfLife(e.target.value)} placeholder="Optional" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mfg Offset (days)</label>
              <Input type="number" min="0" value={mfgOffset} onChange={e => setMfgOffset(e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={createItem.isPending} className="w-full text-xs gap-1.5">
            {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
            Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Admin Edit Item Dialog ─── */
function EditItemDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const updateItem = useUpdateInventoryItem();
  const [parLevel, setParLevel] = useState(String(item.par_level));
  const [reorderPoint, setReorderPoint] = useState(String(item.reorder_point));
  const [currentStock, setCurrentStock] = useState(String(item.current_stock));
  const [expiryWarnDays, setExpiryWarnDays] = useState(String(item.expiry_warn_days ?? ''));
  const [mfgOffsetDays, setMfgOffsetDays] = useState(String(item.mfg_offset_days ?? 2));
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);
  const [lastPurchased, setLastPurchased] = useState(
    item.last_received_at ? new Date(item.last_received_at).toISOString().split('T')[0] : ''
  );

  const handleSave = async () => {
    try {
      const newMfgOffset = parseInt(mfgOffsetDays) || 2;
      const newShelfLife = expiryWarnDays ? parseInt(expiryWarnDays) : null;

      await updateItem.mutateAsync({
        id: item.id,
        updates: {
          par_level: parseInt(parLevel) || 1,
          reorder_point: parseInt(reorderPoint) || 1,
          current_stock: Math.max(0, parseInt(currentStock) || 0),
          expiry_warn_days: newShelfLife,
          mfg_offset_days: newMfgOffset,
          category,
          unit,
          last_received_at: lastPurchased ? new Date(lastPurchased).toISOString() : null,
        },
      });

      // Recalculate mfg & expiry dates on all active batches based on new offsets
      const { data: batches } = await supabase
        .from('ops_inventory_expiry')
        .select('id, received_date')
        .eq('item_id', item.id)
        .eq('is_disposed', false);

      if (batches && batches.length > 0) {
        for (const batch of batches) {
          if (batch.received_date) {
            const rcvd = new Date(batch.received_date);
            const mfgDate = new Date(rcvd);
            mfgDate.setDate(mfgDate.getDate() - newMfgOffset);
            const updates: Record<string, unknown> = {
              mfg_date: mfgDate.toISOString().split('T')[0],
            };
            if (newShelfLife) {
              const expDate = new Date(rcvd);
              expDate.setDate(expDate.getDate() + newShelfLife);
              updates.expiry_date = expDate.toISOString().split('T')[0];
            }
            await supabase
              .from('ops_inventory_expiry')
              .update(updates as any)
              .eq('id', batch.id);
          }
        }
      }

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
              <label className="text-xs font-medium text-muted-foreground">Current Stock</label>
              <Input type="number" min="0" value={currentStock} onChange={e => setCurrentStock(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Par Level</label>
              <Input type="number" min="1" value={parLevel} onChange={e => setParLevel(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reorder Point</label>
              <Input type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Shelf Life (days)</label>
              <Input type="number" min="0" value={expiryWarnDays} onChange={e => setExpiryWarnDays(e.target.value)} placeholder="Optional" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mfg Offset (days)</label>
              <Input type="number" min="0" value={mfgOffsetDays} onChange={e => setMfgOffsetDays(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Last Purchased</label>
              <Input type="date" value={lastPurchased} onChange={e => setLastPurchased(e.target.value)} className="mt-1 text-sm" />
            </div>
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

/* ─── Bulk Edit Dialog ─── */
function BulkEditDialog({ itemIds, items, isSingleCategory, onClose, onDone }: {
  itemIds: string[];
  items: InventoryItem[];
  isSingleCategory: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const updateItem = useUpdateInventoryItem();
  const selectedItems = items.filter(i => itemIds.includes(i.id));

  // Track which fields the user wants to apply
  const [applyFields, setApplyFields] = useState<Record<string, boolean>>({});
  const [parLevel, setParLevel] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [expiryWarnDays, setExpiryWarnDays] = useState('');
  const [mfgOffsetDays, setMfgOffsetDays] = useState('');
  const [category, setCategory] = useState(selectedItems[0]?.category || 'F&B');
  const [unit, setUnit] = useState(selectedItems[0]?.unit || 'pcs');
  const [saving, setSaving] = useState(false);

  const toggleField = (field: string) => setApplyFields(prev => ({ ...prev, [field]: !prev[field] }));

  const handleSave = async () => {
    const activeFields = Object.entries(applyFields).filter(([, v]) => v).map(([k]) => k);
    if (activeFields.length === 0) { toast.error('Check at least one field to update'); return; }

    const confirmed = window.confirm(`Update ${activeFields.join(', ')} for ${itemIds.length} item(s)?`);
    if (!confirmed) return;

    setSaving(true);
    try {
      for (const id of itemIds) {
        const updates: Record<string, unknown> = {};
        if (applyFields.par_level) updates.par_level = parseInt(parLevel) || 1;
        if (applyFields.reorder_point) updates.reorder_point = parseInt(reorderPoint) || 0;
        if (applyFields.current_stock) updates.current_stock = Math.max(0, parseInt(currentStock) || 0);
        if (applyFields.expiry_warn_days) updates.expiry_warn_days = expiryWarnDays ? parseInt(expiryWarnDays) : null;
        if (applyFields.mfg_offset_days) updates.mfg_offset_days = parseInt(mfgOffsetDays) || 2;
        if (applyFields.category && isSingleCategory) updates.category = category;
        if (applyFields.unit && isSingleCategory) updates.unit = unit;

        await updateItem.mutateAsync({ id, updates: updates as any });

        // Recalculate batches if offsets changed
        if (applyFields.mfg_offset_days || applyFields.expiry_warn_days) {
          const newMfgOffset = applyFields.mfg_offset_days ? (parseInt(mfgOffsetDays) || 2) : undefined;
          const newShelfLife = applyFields.expiry_warn_days ? (expiryWarnDays ? parseInt(expiryWarnDays) : null) : undefined;

          const { data: batches } = await supabase
            .from('ops_inventory_expiry')
            .select('id, received_date')
            .eq('item_id', id)
            .eq('is_disposed', false);
          if (batches) {
            for (const batch of batches) {
              if (batch.received_date) {
                const rcvd = new Date(batch.received_date);
                const batchUpdates: Record<string, unknown> = {};
                if (newMfgOffset !== undefined) {
                  const mfgDate = new Date(rcvd);
                  mfgDate.setDate(mfgDate.getDate() - newMfgOffset);
                  batchUpdates.mfg_date = mfgDate.toISOString().split('T')[0];
                }
                if (newShelfLife !== undefined && newShelfLife) {
                  const expDate = new Date(rcvd);
                  expDate.setDate(expDate.getDate() + newShelfLife);
                  batchUpdates.expiry_date = expDate.toISOString().split('T')[0];
                }
                if (Object.keys(batchUpdates).length > 0) {
                  await supabase.from('ops_inventory_expiry').update(batchUpdates as any).eq('id', batch.id);
                }
              }
            }
          }
        }
      }
      toast.success(`${itemIds.length} item(s) updated`);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldRow = (field: string, label: string, input: React.ReactNode, disabled = false) => (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <Checkbox checked={!!applyFields[field]} onCheckedChange={() => !disabled && toggleField(field)} />
      <div className="flex-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {input}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Bulk Edit ({itemIds.length} items)</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground -mt-2">Check the fields you want to update across all selected items.</p>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {fieldRow('current_stock', 'Current Stock',
            <Input type="number" min="0" value={currentStock} onChange={e => setCurrentStock(e.target.value)} className="mt-1 text-sm" placeholder="New value" />
          )}
          {fieldRow('par_level', 'Par Level',
            <Input type="number" min="1" value={parLevel} onChange={e => setParLevel(e.target.value)} className="mt-1 text-sm" placeholder="New value" />
          )}
          {fieldRow('reorder_point', 'Reorder Point',
            <Input type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="mt-1 text-sm" placeholder="New value" />
          )}
          {fieldRow('expiry_warn_days', 'Shelf Life (days)',
            <Input type="number" min="0" value={expiryWarnDays} onChange={e => setExpiryWarnDays(e.target.value)} className="mt-1 text-sm" placeholder="Optional" />
          )}
          {fieldRow('mfg_offset_days', 'Mfg Offset (days)',
            <Input type="number" min="0" value={mfgOffsetDays} onChange={e => setMfgOffsetDays(e.target.value)} className="mt-1 text-sm" placeholder="Default: 2" />
          )}
          {fieldRow('category', 'Category',
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVENTORY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>,
            !isSingleCategory
          )}
          {fieldRow('unit', 'Unit',
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVENTORY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>,
            !isSingleCategory
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full text-xs gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Apply to {itemIds.length} Item(s)
        </Button>
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
                {(() => {
                  const isDeduction = ['out', 'expire', 'refill', 'damage', 'waste'].includes(tx.type);
                  const displayQty = isDeduction ? -Math.abs(tx.quantity) : Math.abs(tx.quantity);
                  return (
                    <span className={`font-mono font-medium ${isDeduction ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {isDeduction ? '' : '+'}{displayQty}
                    </span>
                  );
                })()}
                <span className="text-[10px] text-muted-foreground">{format(parseISO(tx.created_at), 'dd MMM HH:mm')}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Tab 2: Due For Order ─── */
function DueForOrderTab({ items, expiryBatches }: { items: InventoryItem[]; expiryBatches: InventoryExpiry[] }) {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const addToList = useAddToPurchaseList();
  const updateItem = useUpdateInventoryItem();
  const batchDeleteItems = useBatchDeleteInventoryItems();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dueQuantities, setDueQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;




  const dueItemsWithReason = useMemo(() => {
    return items
      .map(i => ({ item: i, reason: getDueReason(i, expiryBatches) }))
      .filter(({ item, reason }) => {
        if (!reason) return false;
        const name = getName(item);
        const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || item.name_en.toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCat;
      });
  }, [items, expiryBatches, search, categoryFilter, language]);

  const dueItems = useMemo(() => dueItemsWithReason.map(d => d.item), [dueItemsWithReason]);
  const dueReasonMap = useMemo(() => {
    const m: Record<string, string> = {};
    dueItemsWithReason.forEach(d => { m[d.item.id] = d.reason!; });
    return m;
  }, [dueItemsWithReason]);

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedItems);
    const allSelected = dueItems.every(i => next.has(i.id));
    if (allSelected) {
      dueItems.forEach(i => next.delete(i.id));
    } else {
      dueItems.forEach(i => next.add(i.id));
    }
    setSelectedItems(next);
  };

  const handleAddToList = async () => {
    if (selectedItems.size === 0) return;
    const cart = Array.from(selectedItems).map(id => ({
      item_id: id,
      quantity: dueQuantities[id] || Math.max(1, (items.find(i => i.id === id)?.par_level || 1) - (items.find(i => i.id === id)?.current_stock || 0)),
    }));
    try {
      await addToList.mutateAsync(cart);
      toast.success(`${cart.length} item(s) added to purchase list`);
      setSelectedItems(new Set());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedItems);
    if (!ids.length) return;
    if (action === 'delete') {
      const confirmed = window.confirm(`Delete ${ids.length} selected item(s)?`);
      if (!confirmed) return;
      setBulkPending(true);
      try {
        await batchDeleteItems.mutateAsync(ids);
        toast.success(`${ids.length} item(s) deleted`);
        setSelectedItems(new Set());
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBulkPending(false);
      }
      return;
    }
    if (action === 'edit') {
      setShowBulkEdit(true);
    }
  };

  const totalDue = useMemo(() => {
    return items.filter(i => getDueReason(i, expiryBatches) !== null).length;
  }, [items, expiryBatches]);

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

      {totalDue === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('inv.noDueItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant={editMode ? 'secondary' : 'outline'}
                className="text-xs"
                onClick={() => {
                  setEditMode(prev => !prev);
                  if (editMode) setSelectedItems(new Set());
                }}
              >
                {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
              </Button>
            )}

            {!editMode && dueItems.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs" onClick={selectAllVisible}>
                {dueItems.every(i => selectedItems.has(i.id)) ? 'Unselect Visible' : 'Select Visible'}
              </Button>
            )}
            {!editMode && selectedItems.size > 0 && (
              <Button
                size="sm"
                onClick={handleAddToList}
                disabled={addToList.isPending}
                className="text-xs gap-1.5"
              >
                {addToList.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                Add to List ({selectedItems.size} items)
              </Button>
            )}
          </div>

          {/* Bulk Action Bar for edit mode */}
          {editMode && selectedItems.size > 0 && (
            <BulkActionBar
              selectedCount={selectedItems.size}
              totalCount={dueItems.length}
              onSelectAll={() => setSelectedItems(new Set(dueItems.map(i => i.id)))}
              onDeselectAll={() => setSelectedItems(new Set())}
              actions={[
                { label: 'Edit Selected', value: 'edit', icon: <Pencil className="h-3 w-3" /> },
                { label: 'Delete', value: 'delete', variant: 'destructive', icon: <Trash2 className="h-3 w-3" /> },
              ]}
              onAction={handleBulkAction}
              isPending={bulkPending}
            />
          )}

          {dueItems.length === 0 && (search || categoryFilter !== 'all') && (
            <p className="text-xs text-muted-foreground text-center py-4">No matching due items</p>
          )}

          {dueItems.map(item => {
            const deficit = item.par_level - item.current_stock;
            const isSelected = selectedItems.has(item.id);
            const reason = dueReasonMap[item.id] || 'low_quantity';
            const reasonMeta = DUE_REASON_LABELS[reason] || DUE_REASON_LABELS.low_quantity;
            const isExpiryReason = reason === 'expired' || reason === 'nearing_expiry';

            // Find earliest expiring batch for expiry-based reasons
            const earliestExpiry = isExpiryReason
              ? expiryBatches
                  .filter(b => b.item_id === item.id && !b.is_disposed)
                  .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0]?.expiry_date
              : null;

            const borderClass = isSelected
              ? 'border-primary bg-primary/5'
              : reason === 'expired' ? 'border-destructive/50'
              : reason === 'nearing_expiry' ? 'border-amber-300'
              : 'border-orange-200';

            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-colors ${borderClass}`}
                onClick={() => { if (!editMode) toggleItem(item.id); }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {editMode ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="shrink-0"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                          {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">{getName(item)}</span>
                        <span className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</span>
                        <span className={`text-[10px] block ${reasonMeta.className}`}>
                          {reasonMeta.icon} {reasonMeta.label}
                          {earliestExpiry && `: ${fmtDate(earliestExpiry)}`}
                        </span>
                        <ItemBatchDates itemId={item.id} editable={isAdmin && editMode} />
                      </div>
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
                      <div className="text-right space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className={`font-mono text-sm font-bold ${reasonMeta.className}`}>{item.current_stock}</span>
                          <span className="text-[10px] text-muted-foreground">/ {item.par_level}</span>
                        </div>
                        {!editMode && isSelected && (
                          <QtyEditor
                            value={dueQuantities[item.id] || Math.max(1, isExpiryReason ? item.par_level : deficit)}
                            onChange={v => setDueQuantities(q => ({ ...q, [item.id]: v }))}
                          />
                        )}
                        {!editMode && !isSelected && deficit > 0 && !isExpiryReason && (
                          <span className="text-[10px] text-muted-foreground">
                            Need: {deficit} {item.unit}
                          </span>
                        )}
                        {!editMode && !isSelected && isExpiryReason && (
                          <span className="text-[10px] text-muted-foreground">
                            Replenish: {item.par_level} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {editingItem && (
        <EditItemDialog item={editingItem} onClose={() => setEditingItem(null)} />
      )}

      {showBulkEdit && (
        <BulkEditDialog
          itemIds={Array.from(selectedItems)}
          items={items}
          isSingleCategory={categoryFilter !== 'all'}
          onClose={() => setShowBulkEdit(false)}
          onDone={() => { setShowBulkEdit(false); setSelectedItems(new Set()); }}
        />
      )}
    </div>
  );
}



/* ─── Tab 3: Templates (Issue + Purchase List) ─── */
function TemplatesTab({ items }: { items: InventoryItem[] }) {
  const { language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const [templateType, setTemplateType] = useState<'issue' | 'purchase'>('issue');

  return (
    <div className="space-y-3 mt-2">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={templateType === 'issue' ? 'default' : 'outline'}
          className="flex-1 text-xs"
          onClick={() => setTemplateType('issue')}
        >
          Issue Templates
        </Button>
        <Button
          size="sm"
          variant={templateType === 'purchase' ? 'default' : 'outline'}
          className="flex-1 text-xs"
          onClick={() => setTemplateType('purchase')}
        >
          Purchase Templates
        </Button>
      </div>

      {templateType === 'issue' ? (
        <IssueTemplatesSection items={items} />
      ) : (
        <PurchaseTemplatesSection items={items} />
      )}
    </div>
  );
}

/* ─── Linen Set Composition Mapping ─── */
const LINEN_SET_INVENTORY_MAP: Record<string, string> = {
  'Bedsheet': 'Bed Sheet (Double)',
  'Pillow Cover': 'Pillow Cover',
  'Towel': 'Hand Towel',
  'Bath Towel': 'Bath Towel (Large)',
  'Hand Towel': 'Hand Towel',
  'Blanket': 'Blanket',
  'Duvet Cover': 'Bed Sheet (Single)',
  'Mattress Protector': 'Bath Mat',
};

const DEFAULT_ISSUE_SET_COMPOSITION: Record<string, number> = {
  'Bedsheet': 1, 'Pillow Cover': 2, 'Towel': 1, 'Bath Towel': 1,
  'Hand Towel': 1, 'Blanket': 1, 'Duvet Cover': 1, 'Mattress Protector': 1,
};

/* ─── Issue Templates Section ─── */
function IssueTemplatesSection({ items }: { items: InventoryItem[] }) {
  const { language } = useOpsLanguage();
  const { profile } = useOpsAuth();
  const { data: rooms = [] } = useRooms();
  const { data: refillTemplates = [] } = useRefillTemplates();
  const updateStock = useUpdateStock();
  const createRefillTemplate = useCreateRefillTemplate();
  const deleteRefillTemplate = useDeleteRefillTemplate();
  

  const [showCreate, setShowCreate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState<{ item_id: string; quantity: number }[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return getName(item);
  };

  const templateGroups = useMemo(() => {
    const groups: Record<string, typeof refillTemplates> = {};
    for (const rt of refillTemplates) {
      const key = (rt as any).room_type || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(rt);
    }
    return groups;
  }, [refillTemplates]);

  const filteredSearchItems = useMemo(() => {
    if (!searchItem) return [];
    return items.filter(i =>
      i.name_en.toLowerCase().includes(searchItem.toLowerCase()) &&
      !newTemplateItems.some(ti => ti.item_id === i.id)
    ).slice(0, 8);
  }, [items, searchItem, newTemplateItems]);

  const addItemToNew = (itemId: string) => {
    setNewTemplateItems(prev => [...prev, { item_id: itemId, quantity: 1 }]);
    setSearchItem('');
  };

  const removeItemFromNew = (itemId: string) => {
    setNewTemplateItems(prev => prev.filter(ti => ti.item_id !== itemId));
  };

  const updateNewQty = (itemId: string, qty: number) => {
    setNewTemplateItems(prev => prev.map(ti => ti.item_id === itemId ? { ...ti, quantity: Math.max(1, qty) } : ti));
  };

  // Add entire linen set to template items
  const handleAddLinenSet = () => {
    const setItems: { item_id: string; quantity: number }[] = [];
    // Deduplicate inventory names to avoid double-adding Hand Towel
    const added = new Set(newTemplateItems.map(ti => ti.item_id));
    const namesSeen = new Set<string>();
    for (const [linenType, qty] of Object.entries(DEFAULT_ISSUE_SET_COMPOSITION)) {
      if (qty <= 0) continue;
      const inventoryName = LINEN_SET_INVENTORY_MAP[linenType];
      if (!inventoryName || namesSeen.has(inventoryName)) continue;
      namesSeen.add(inventoryName);
      const invItem = items.find(i => i.name_en === inventoryName && i.category === 'Linens');
      if (invItem && !added.has(invItem.id)) {
        setItems.push({ item_id: invItem.id, quantity: qty });
        added.add(invItem.id);
      }
    }
    if (setItems.length === 0) {
      toast.error('No matching linen items found in inventory');
      return;
    }
    setNewTemplateItems(prev => [...prev, ...setItems]);
    toast.success(`Added ${setItems.length} linen items`);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || newTemplateItems.length === 0) return;
    try {
      for (const ti of newTemplateItems) {
        await createRefillTemplate.mutateAsync({
          room_type: newTemplateName.trim(),
          item_id: ti.item_id,
          quantity: ti.quantity,
        });
      }
      toast.success(`Template "${newTemplateName}" saved`);
      setShowCreate(false);
      setNewTemplateName('');
      setNewTemplateItems([]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    setApplyingTemplate(templateName);
    try {
      const tplItems = templateGroups[templateName] || [];
      for (const t of tplItems) {
        const tAny = t as any;
        await updateStock.mutateAsync({
          itemId: tAny.item_id,
          quantity: tAny.quantity,
          type: 'out',
          notes: `Issue template: ${templateName}`,
        });
      }
      toast.success(`Issued ${tplItems.length} items from "${templateName}"`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplyingTemplate(null);
    }
  };

  const handleDeleteEntireTemplate = async (templateName: string) => {
    const tplItems = templateGroups[templateName] || [];
    try {
      for (const t of tplItems) {
        await deleteRefillTemplate.mutateAsync((t as any).id);
      }
      toast.success(`Template "${templateName}" deleted`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleStartEdit = (templateName: string) => {
    const tplItems = templateGroups[templateName] || [];
    setEditingTemplate(templateName);
    setNewTemplateName(templateName);
    setNewTemplateItems(tplItems.map((t: any) => ({ item_id: t.item_id, quantity: t.quantity })));
    setShowCreate(false);
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !newTemplateName.trim() || newTemplateItems.length === 0) return;
    try {
      const oldItems = templateGroups[editingTemplate] || [];
      for (const t of oldItems) {
        await deleteRefillTemplate.mutateAsync((t as any).id);
      }
      for (const ti of newTemplateItems) {
        await createRefillTemplate.mutateAsync({
          room_type: newTemplateName.trim(),
          item_id: ti.item_id,
          quantity: ti.quantity,
        });
      }
      toast.success(`Template "${newTemplateName}" updated`);
      setEditingTemplate(null);
      setNewTemplateName('');
      setNewTemplateItems([]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isEditing = editingTemplate !== null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">Issue templates deduct grouped items from inventory (e.g., room refresh, kitchen daily, office).</p>

      {!isEditing && (
        <Button onClick={() => { setShowCreate(true); setNewTemplateItems([]); setNewTemplateName(''); }} className="w-full text-xs gap-1.5" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Create Issue Template
        </Button>
      )}

      {/* Create / Edit Template Form */}
      {(showCreate || isEditing) && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm">{isEditing ? `Edit: ${editingTemplate}` : 'New Issue Template'}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <Input
              value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
              placeholder="Template name (e.g., Kitchen Daily, Room 101, Office)" className="text-sm"
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchItem} onChange={e => setSearchItem(e.target.value)}
                  placeholder="Search items..." className="pl-7 text-xs h-8"
                />
                {filteredSearchItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredSearchItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addItemToNew(item.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex justify-between"
                      >
                        <span>{item.name_en}</span>
                        <span className="text-muted-foreground">{item.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 shrink-0 whitespace-nowrap" onClick={handleAddLinenSet}>
                🛏️ + Linen Set
              </Button>
            </div>

            {newTemplateItems.length > 0 && (
              <div className="space-y-1 border border-border rounded-md p-2">
                {newTemplateItems.map(ti => (
                  <div key={ti.item_id} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{getItemName(ti.item_id)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => updateNewQty(ti.item_id, ti.quantity - 1)}>−</Button>
                      <span className="w-6 text-center font-mono">{ti.quantity}</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => updateNewQty(ti.item_id, ti.quantity + 1)}>+</Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => removeItemFromNew(ti.item_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => { setShowCreate(false); setEditingTemplate(null); setNewTemplateItems([]); }}>Cancel</Button>
              <Button
                className="flex-1 text-xs gap-1"
                onClick={isEditing ? handleSaveEdit : handleSaveTemplate}
                disabled={!newTemplateName.trim() || newTemplateItems.length === 0 || createRefillTemplate.isPending}
              >
                {createRefillTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {isEditing ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Templates */}
      {Object.keys(templateGroups).length === 0 && !showCreate && !isEditing && (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No issue templates yet.</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(templateGroups).map(([name, tplItems]) => (
        <Card key={name}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <p className="font-medium text-sm">{name}</p>
                <p className="text-[10px] text-muted-foreground">{tplItems.length} items</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleStartEdit(name)} title="Edit">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteEntireTemplate(name)} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => handleApplyTemplate(name)}
                  disabled={applyingTemplate === name}
                >
                  {applyingTemplate === name ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
                  Issue All
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {tplItems.map((rt: any) => (
                <Badge key={rt.id} variant="secondary" className="text-[10px] gap-0.5">
                  {getItemName(rt.item_id)} ×{rt.quantity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Purchase List Templates Section ─── */
function PurchaseTemplatesSection({ items }: { items: InventoryItem[] }) {
  const { language } = useOpsLanguage();
  const { data: templates = [], isLoading } = usePurchaseTemplates();
  const { data: profiles = [] } = useOpsProfiles();
  const createTemplate = useCreatePurchaseTemplate();
  const deleteTemplate = useDeletePurchaseTemplate();
  const updateTemplate = useUpdatePurchaseTemplate();
  const addToList = useAddToPurchaseList();
  const [showCreate, setShowCreate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateItems, setTemplateItems] = useState<{ item_id: string; quantity: number }[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [creatingFromList, setCreatingFromList] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleCreateFromCurrentList = async () => {
    setCreatingFromList(true);
    try {
      const { data: orders } = await supabase
        .from('ops_purchase_orders')
        .select('id')
        .in('status', ['Draft', 'Requested', 'Approved', 'Ordered', 'Active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!orders?.[0]) {
        toast.error('No active purchase list found');
        setCreatingFromList(false);
        return;
      }

      const { data: orderItems } = await supabase
        .from('ops_purchase_order_items')
        .select('item_id, quantity')
        .eq('order_id', orders[0].id)
        .is('completed_at', null);

      if (!orderItems?.length) {
        toast.error('Purchase list is empty');
        setCreatingFromList(false);
        return;
      }

      setTemplateItems(orderItems.map(oi => ({ item_id: oi.item_id, quantity: oi.quantity })));
      setShowCreate(true);
      setEditingId(null);
      setTemplateName('');
      setTemplateDesc('From current purchase list');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingFromList(false);
    }
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

  const handleStartEdit = (tmpl: PurchaseTemplate) => {
    setEditingId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateDesc(tmpl.description || '');
    setTemplateItems([...tmpl.items_json]);
    setShowCreate(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !templateName.trim() || templateItems.length === 0) return;
    try {
      await updateTemplate.mutateAsync({
        id: editingId,
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        items_json: templateItems,
      });
      toast.success('Template updated');
      setEditingId(null);
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
      await addToList.mutateAsync(cart);
      toast.success('Items added to purchase list from template');
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

  const isEditing = editingId !== null;
  const showForm = showCreate || isEditing;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">Purchase templates add all items to the purchase list at once.</p>

      {!isEditing && (
        <div className="flex gap-2">
          <Button onClick={() => { setShowCreate(true); setTemplateItems([]); setEditingId(null); }} className="flex-1 text-xs gap-1.5" variant="outline">
            <ListPlus className="h-3.5 w-3.5" /> Create Template
          </Button>
          <Button
            onClick={handleCreateFromCurrentList}
            disabled={creatingFromList}
            className="flex-1 text-xs gap-1.5"
            variant="outline"
          >
            {creatingFromList ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            From Current List
          </Button>
        </div>
      )}

      {templates.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center">
            <ListPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No purchase templates yet.</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm">{isEditing ? 'Edit Purchase Template' : 'New Purchase Template'}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <Input
              value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name (e.g., Weekly Groceries)" className="text-sm"
            />
            <Input
              value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
              placeholder="Description (optional)" className="text-xs"
            />

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
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => { setShowCreate(false); setEditingId(null); setTemplateItems([]); }}>Cancel</Button>
              <Button
                className="flex-1 text-xs gap-1"
                onClick={isEditing ? handleSaveEdit : handleCreate}
                disabled={!templateName.trim() || templateItems.length === 0 || createTemplate.isPending || updateTemplate.isPending}
              >
                {(createTemplate.isPending || updateTemplate.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {isEditing ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.map(tmpl => (
        <Card key={tmpl.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{tmpl.name}</p>
                {tmpl.description && <p className="text-[10px] text-muted-foreground">{tmpl.description}</p>}
                <p className="text-[10px] text-muted-foreground">by {getProfileName(tmpl.created_by)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleStartEdit(tmpl)} title="Edit">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(tmpl.id)} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleUseTemplate(tmpl)}>
                  Add to List
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tmpl.items_json.map(ti => (
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

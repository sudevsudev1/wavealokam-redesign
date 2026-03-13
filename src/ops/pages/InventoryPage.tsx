import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import {
  useInventoryItems, useExpiryItems, useAddExpiry, useDisposeExpiry,
  useUpdateStock, useInventoryTransactions, useRooms, useRefillTemplates, useApplyRefillTemplate,
  useUpdateInventoryItem, useBatchDeleteInventoryItems, usePurchaseTemplates, useCreatePurchaseTemplate, useDeletePurchaseTemplate,
  useCreateRefillTemplate, useDeleteRefillTemplate, useAddToPurchaseList, useCreateInventoryItem,
  InventoryItem, InventoryTransaction, PurchaseTemplate,
} from '../hooks/useInventory';
import { useOpsProfiles } from '../hooks/useTasks';
import { STOCK_STATUS, INVENTORY_CATEGORIES, INVENTORY_UNITS } from '../lib/inventoryConstants';
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


export default function InventoryPage() {
  const [searchParams] = useSearchParams();
  const { t } = useOpsLanguage();
  const { data: items = [], isLoading } = useInventoryItems();

  const lowStockCount = items.filter((i) => i.current_stock <= i.reorder_point).length;

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

      {/* 4-Tab Interface */}
      <Tabs defaultValue={searchParams.get('tab') || 'overview'}>
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-shrink-0 text-xs px-3">{t('inv.overviewTab')}</TabsTrigger>
          <TabsTrigger value="due" className="flex-shrink-0 text-xs px-3">
            {t('inv.dueTab')}
            {lowStockCount > 0 && <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{lowStockCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-shrink-0 text-xs px-3">{t('inv.logTab')}</TabsTrigger>
          <TabsTrigger value="templates" className="flex-shrink-0 text-xs px-3">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab items={items} /></TabsContent>
        <TabsContent value="due"><DueForOrderTab items={items} /></TabsContent>
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
              if (editMode) { setSelectedIds(new Set()); setBulkEditField(''); setBulkEditValue(''); }
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
        <div className="space-y-2">
          <BulkActionBar
            selectedCount={selectedIds.size}
            totalCount={filtered.length}
            onSelectAll={() => setSelectedIds(new Set(filtered.map(i => i.id)))}
            onDeselectAll={() => setSelectedIds(new Set())}
            actions={[
              { label: 'Delete', value: 'delete', variant: 'destructive', icon: <Trash2 className="h-3 w-3" /> },
              { label: 'Bulk Edit Field', value: 'apply_bulk_edit', icon: <Pencil className="h-3 w-3" /> },
            ]}
            onAction={handleBulkAction}
            isPending={bulkPending}
          />
          {/* Bulk edit controls */}
          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/50 border">
            <Select value={bulkEditField} onValueChange={setBulkEditField}>
              <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Select field..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="par_level">Par Level</SelectItem>
                <SelectItem value="reorder_point">Reorder Point</SelectItem>
                <SelectItem value="mfg_offset_days">Mfg Offset (days)</SelectItem>
                <SelectItem value="expiry_warn_days">Shelf Life (days)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number" min="0" value={bulkEditValue}
              onChange={e => setBulkEditValue(e.target.value)}
              placeholder="Value" className="h-7 w-20 text-xs"
            />
          </div>
        </div>
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
function DueForOrderTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const addToList = useAddToPurchaseList();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dueQuantities, setDueQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const dueItems = useMemo(() => {
    return items.filter(i => {
      if (i.current_stock > i.reorder_point) return false;
      const name = getName(i);
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || i.name_en.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === 'all' || i.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter, language]);

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

  const totalDue = items.filter(i => i.current_stock <= i.reorder_point).length;

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
            {dueItems.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs" onClick={selectAllVisible}>
                {dueItems.every(i => selectedItems.has(i.id)) ? 'Unselect Visible' : 'Select Visible'}
              </Button>
            )}
            {selectedItems.size > 0 && (
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

          {dueItems.length === 0 && (search || categoryFilter !== 'all') && (
            <p className="text-xs text-muted-foreground text-center py-4">No matching due items</p>
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
                        <ItemBatchDates itemId={item.id} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm font-bold text-orange-600">{item.current_stock}</span>
                        <span className="text-[10px] text-muted-foreground">/ {item.par_level}</span>
                      </div>
                      {isSelected && (
                        <QtyEditor
                          value={dueQuantities[item.id] || Math.max(1, deficit)}
                          onChange={v => setDueQuantities(q => ({ ...q, [item.id]: v }))}
                        />
                      )}
                      {!isSelected && (
                        <span className="text-[10px] text-muted-foreground">Need: {deficit > 0 ? deficit : 0} {item.unit}</span>
                      )}
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

/* ─── Tab 3: Log Usage / Refill ─── */
function LogUsageTab({ items }: { items: InventoryItem[] }) {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const { data: rooms = [] } = useRooms();
  const { data: refillTemplates = [] } = useRefillTemplates();
  const updateStock = useUpdateStock();
  const applyRefill = useApplyRefillTemplate();
  const createRefillTemplate = useCreateRefillTemplate();
  const deleteRefillTemplate = useDeleteRefillTemplate();

  const [logType, setLogType] = useState<'issue' | 'damage' | 'waste' | 'refill'>('issue');
  const [selectedItem, setSelectedItem] = useState('');
  const [logQty, setLogQty] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateRoomType, setTemplateRoomType] = useState('');
  const [templateItemId, setTemplateItemId] = useState('');
  const [templateItemSearch, setTemplateItemSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [templateQty, setTemplateQty] = useState('1');

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  const filteredRefillItems = useMemo(() => {
    return items.filter(i => {
      const name = getName(i);
      const matchSearch = !templateItemSearch || name.toLowerCase().includes(templateItemSearch.toLowerCase()) || i.name_en.toLowerCase().includes(templateItemSearch.toLowerCase());
      const matchCat = templateCategoryFilter === 'all' || i.category === templateCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, templateItemSearch, templateCategoryFilter, language]);

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return getName(item);
  };

  const roomTypes = [...new Set(rooms.map(r => r.room_type))];

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

  const handleAddToTemplate = async () => {
    if (!templateRoomType || !templateItemId) return;
    try {
      await createRefillTemplate.mutateAsync({
        room_type: templateRoomType,
        item_id: templateItemId,
        quantity: parseInt(templateQty) || 1,
      });
      toast.success('Item added to refill template');
      setTemplateItemId('');
      setTemplateQty('1');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteRefillTemplate.mutateAsync(id);
      toast.success('Removed from template');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredTemplates = templateRoomType
    ? refillTemplates.filter((rt: any) => rt.room_type === templateRoomType)
    : refillTemplates;

  return (
    <div className="space-y-3 mt-2">
      {/* Room Refill Section */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" />
              {t('inv.refillRoom')}
            </span>
            {isAdmin && (
              <Button
                size="sm"
                variant={showTemplateManager ? 'secondary' : 'ghost'}
                className="text-[10px] h-6 px-2"
                onClick={() => setShowTemplateManager(prev => !prev)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                {showTemplateManager ? 'Close' : 'Manage Templates'}
              </Button>
            )}
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

      {/* Refill Template Manager (Admin only) */}
      {isAdmin && showTemplateManager && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ListPlus className="h-4 w-4 text-primary" />
              Room Refill Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <Select value={templateRoomType} onValueChange={setTemplateRoomType}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select room type" /></SelectTrigger>
              <SelectContent>
                {roomTypes.map(rt => (
                  <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {templateRoomType && (
              <>
                {filteredTemplates.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Items in "{templateRoomType}" template</p>
                    {filteredTemplates.map((rt: any) => (
                      <div key={rt.id} className="flex items-center justify-between text-xs p-2 border rounded">
                        <span className="truncate mr-2">{getItemName(rt.item_id)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-muted-foreground">×{rt.quantity}</span>
                          <Button
                            size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive"
                            onClick={() => handleDeleteTemplate(rt.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No items in this template yet</p>
                )}

                <div className="border-t pt-2 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Add item to template</p>
                  <Select value={templateCategoryFilter ?? 'all'} onValueChange={(v) => setTemplateCategoryFilter(v)}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {INVENTORY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={templateItemSearch}
                      onChange={e => setTemplateItemSearch(e.target.value)}
                      placeholder="Search items..."
                      className="pl-7 text-xs h-8"
                    />
                  </div>
                  {filteredRefillItems.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto border rounded-md">
                      {filteredRefillItems.map(i => (
                        <button
                          key={i.id}
                          onClick={() => { setTemplateItemId(i.id); }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs flex justify-between hover:bg-muted ${templateItemId === i.id ? 'bg-primary/10 font-medium' : ''}`}
                        >
                          <span className="truncate">{getName(i)}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{i.category}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    templateItemSearch && <p className="text-[10px] text-muted-foreground text-center py-1">No items found</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="number" min="1" value={templateQty}
                      onChange={e => setTemplateQty(e.target.value)}
                      placeholder="Qty"
                      className="w-20 text-xs"
                    />
                    <Button
                      onClick={handleAddToTemplate}
                      disabled={!templateItemId || createRefillTemplate.isPending}
                      className="flex-1 text-xs gap-1"
                      size="sm"
                    >
                      {createRefillTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add to Template
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Log Section */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t('inv.quickLog')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
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
              {(() => {
                const isDeduction = ['out', 'expire', 'refill', 'damage', 'waste'].includes(tx.type);
                const displayQty = isDeduction ? -Math.abs(tx.quantity) : Math.abs(tx.quantity);
                return (
                  <span className={`font-mono font-medium ${isDeduction ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {isDeduction ? '' : '+'}{displayQty}
                  </span>
                );
              })()}
              <p className="text-[10px] text-muted-foreground">{format(parseISO(tx.created_at), 'dd MMM HH:mm')}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Tab 4: Templates ─── */
function TemplatesTab({ items }: { items: InventoryItem[] }) {
  const { language } = useOpsLanguage();
  const { data: templates = [], isLoading } = usePurchaseTemplates();
  const { data: profiles = [] } = useOpsProfiles();
  const createTemplate = useCreatePurchaseTemplate();
  const deleteTemplate = useDeletePurchaseTemplate();
  const addToList = useAddToPurchaseList();
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
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => { setShowCreate(false); setTemplateItems([]); }}>Cancel</Button>
              <Button className="flex-1 text-xs gap-1" onClick={handleCreate} disabled={!templateName.trim() || templateItems.length === 0 || createTemplate.isPending}>
                {createTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
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
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleUseTemplate(tmpl)}>
                  Add to List
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(tmpl.id)}>
                  <Trash2 className="h-3 w-3" />
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

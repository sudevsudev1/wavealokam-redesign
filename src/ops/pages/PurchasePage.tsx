import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, usePurchaseList, useAddToPurchaseList, useCompleteListItem, useUncompleteListItem, useEditListItemQty, useDeleteListItem, useCreateInventoryItem, PurchaseListItem } from '../hooks/useInventory';
import { MASTER_CATALOG, levenshtein, CatalogEntry } from '../lib/masterCatalog';
import BulkActionBar from '../components/BulkActionBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Minus, Trash2, Pencil, X, AlertTriangle, PlusCircle, Loader2, Check, ShoppingCart, Printer, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { copyToClipboard, printToPdf, formatListForCopy } from '../lib/printCopy';

export default function PurchasePage() {
  const { t, language } = useOpsLanguage();
  const { profile, isAdmin } = useOpsAuth();
  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: listData, isLoading } = usePurchaseList();
  const addToList = useAddToPurchaseList();
  const completeItem = useCompleteListItem();
  const uncompleteItem = useUncompleteListItem();
  const editQty = useEditListItemQty();
  const deleteItem = useDeleteListItem();
  const createInventoryItem = useCreateInventoryItem();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; qty: number } | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{ item_id: string; name: string; existingQty: number; newQty: number } | null>(null);
  const [newItemQty, setNewItemQty] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const items = listData?.items || [];
  const pendingItems = items.filter(i => !i.completed_at);
  const completedItems = items.filter(i => !!i.completed_at);

  const getName = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
  };

  const getUnit = (itemId: string) => inventoryItems.find(i => i.id === itemId)?.unit || '';

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkPending(true);
    try {
      if (action === 'delete') {
        const { error } = await supabase.from('ops_purchase_order_items').delete().in('id', ids);
        if (error) throw error;
        toast.success(`Deleted ${ids.length} items`);
      } else if (action === 'tick_off') {
        for (const id of ids) {
          const item = items.find(i => i.id === id);
          if (item && !item.completed_at) {
            await completeItem.mutateAsync({ itemRowId: item.id, itemId: item.item_id, quantity: item.quantity });
          }
        }
        toast.success(`Ticked off ${ids.length} items`);
      }
      queryClient.invalidateQueries({ queryKey: ['ops_purchase_list'] });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkPending(false);
    }
  };

  // Search inventory + catalog
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const invMatches = inventoryItems.filter(i => {
      const name = (language === 'ml' && i.name_ml ? i.name_ml : i.name_en).toLowerCase();
      return name.includes(q) || i.name_en.toLowerCase().includes(q);
    });
    const invNames = new Set(inventoryItems.map(i => i.name_en.toLowerCase()));
    const catMatches = MASTER_CATALOG.filter(c =>
      !invNames.has(c.name.toLowerCase()) && c.name.toLowerCase().includes(q)
    );
    return { invMatches, catMatches };
  }, [inventoryItems, search, language]);

  const typoMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 3) return null;
    if (searchResults && (searchResults.invMatches.length > 0 || searchResults.catMatches.length > 0)) return null;
    const allNames = [...inventoryItems.map(i => i.name_en), ...MASTER_CATALOG.map(c => c.name)];
    const threshold = q.length <= 4 ? 2 : 3;
    return allNames
      .map(n => ({ name: n, dist: levenshtein(q, n.toLowerCase()) }))
      .filter(m => m.dist <= threshold)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
  }, [search, searchResults, inventoryItems]);

  const handleAddInventoryItem = async (itemId: string) => {
    const existing = pendingItems.find(i => i.item_id === itemId);
    if (existing) {
      const item = inventoryItems.find(i => i.id === itemId);
      setDuplicateDialog({ item_id: itemId, name: item ? getName(itemId) : itemId.slice(0, 8), existingQty: existing.quantity, newQty: 1 });
      return;
    }
    const item = inventoryItems.find(i => i.id === itemId);
    const suggestedQty = item ? Math.max(1, item.par_level - item.current_stock) : 1;
    try {
      await addToList.mutateAsync([{ item_id: itemId, quantity: suggestedQty }]);
      toast.success(t('purchase.addedToList'));
      setSearch('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddCatalogItem = async (entry: CatalogEntry) => {
    try {
      const newItem = await createInventoryItem.mutateAsync({
        name_en: entry.name, category: entry.category, unit: entry.unit,
        par_level: Math.ceil(entry.defaultQty), reorder_point: Math.max(1, Math.ceil(entry.defaultQty * 0.3)),
        expiry_warn_days: entry.shelfLifeDays,
      });
      await addToList.mutateAsync([{ item_id: newItem.id, quantity: entry.defaultQty }]);
      toast.success(`${entry.name} added to inventory & purchase list`);
      setSearch('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddOneTime = async () => {
    const name = search.trim();
    if (!name) return;
    try {
      const newItem = await createInventoryItem.mutateAsync({
        name_en: name, category: 'F&B', unit: 'pcs', par_level: 5, reorder_point: 2, expiry_warn_days: null,
      });
      await addToList.mutateAsync([{ item_id: newItem.id, quantity: newItemQty }]);
      toast.success(`"${name}" added to inventory & purchase list`);
      setSearch(''); setNewItemQty(1);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDuplicateAction = async (action: 'add_more' | 'change_qty') => {
    if (!duplicateDialog) return;
    const existing = pendingItems.find(i => i.item_id === duplicateDialog.item_id && !i.completed_at);
    if (!existing) return;
    if (action === 'add_more') {
      await editQty.mutateAsync({ itemRowId: existing.id, newQty: existing.quantity + duplicateDialog.newQty, oldQty: existing.quantity });
      toast.success('Quantity updated');
    } else {
      await editQty.mutateAsync({ itemRowId: existing.id, newQty: duplicateDialog.newQty, oldQty: existing.quantity });
      toast.success('Quantity changed');
    }
    setDuplicateDialog(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const selectedPending = pendingItems.filter(i => selectedIds.has(i.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4" />
          {t('purchase.title')}
          {pendingItems.length > 0 && <Badge variant="default" className="text-[10px] h-5 px-1.5">{pendingItems.length}</Badge>}
        </h1>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Copy"
            onClick={() => {
              const all = [...pendingItems, ...completedItems].map(i => ({
                name: getName(i.item_id), qty: i.quantity, unit: getUnit(i.item_id), done: !!i.completed_at,
              }));
              copyToClipboard(formatListForCopy(all));
            }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Print PDF"
            onClick={() => {
              const all = [...pendingItems, ...completedItems];
              printToPdf('Purchase List', all.map(i => [
                i.completed_at ? '✓' : '○', getName(i.item_id), `${i.quantity} ${getUnit(i.item_id)}`,
              ]));
            }}>
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search to add items */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Type item name to add..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </div>

          {typoMatches && typoMatches.length > 0 && (
            <div className="bg-accent/50 border border-accent rounded-lg p-2 space-y-1">
              <p className="text-[10px] text-accent-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Did you mean:</p>
              <div className="flex flex-wrap gap-1">
                {typoMatches.map(m => (
                  <button key={m.name} onClick={() => setSearch(m.name)} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80">{m.name}</button>
                ))}
              </div>
            </div>
          )}

          {search.trim().length >= 2 && searchResults && searchResults.invMatches.length === 0 && searchResults.catMatches.length === 0 && (
            <div className="border border-dashed border-primary/30 rounded-lg p-2 space-y-1.5">
              <p className="text-[10px] text-muted-foreground">"{search.trim()}" not found. Add as new item:</p>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <button onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))} className="h-5 w-5 rounded bg-muted flex items-center justify-center"><Minus className="h-2.5 w-2.5" /></button>
                  <Input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))} className="h-5 w-10 text-[10px] text-center px-0.5" />
                  <button onClick={() => setNewItemQty(newItemQty + 1)} className="h-5 w-5 rounded bg-muted flex items-center justify-center"><Plus className="h-2.5 w-2.5" /></button>
                </div>
                <button onClick={handleAddOneTime} className="text-[9px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-0.5"><PlusCircle className="h-3 w-3" /> Add to list</button>
              </div>
            </div>
          )}

          {search.trim() && searchResults && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {searchResults.invMatches.slice(0, 10).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{language === 'ml' && item.name_ml ? item.name_ml : item.name_en}</span>
                    <span className="text-[10px] text-muted-foreground">{item.current_stock}/{item.par_level} {item.unit}</span>
                  </div>
                  <button onClick={() => handleAddInventoryItem(item.id)} className="h-7 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-0.5 hover:bg-primary/20 active:scale-95 shrink-0"><Plus className="h-3 w-3" /> Add</button>
                </div>
              ))}
              {searchResults.catMatches.slice(0, 5).map(entry => (
                <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg border border-dashed border-accent bg-accent/10">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{entry.name}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.category} · {entry.unit} · new</span>
                  </div>
                  <button onClick={() => handleAddCatalogItem(entry)} className="h-7 px-2 rounded-md bg-accent/30 text-accent-foreground text-[10px] font-medium flex items-center gap-0.5 hover:bg-accent/50 active:scale-95 shrink-0"><PlusCircle className="h-3 w-3" /> Add</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {isAdmin && selectedPending > 0 && (
        <BulkActionBar
          selectedCount={selectedPending}
          totalCount={pendingItems.length}
          onSelectAll={() => setSelectedIds(new Set(pendingItems.map(i => i.id)))}
          onDeselectAll={() => setSelectedIds(new Set())}
          actions={[
            { label: 'Tick off all', value: 'tick_off' },
            { label: 'Delete', value: 'delete', variant: 'destructive', icon: <Trash2 className="h-3 w-3" /> },
          ]}
          onAction={handleBulkAction}
          isPending={bulkPending}
        />
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('purchase.pending')} ({pendingItems.length})</p>
            {pendingItems.map(item => (
              <div key={item.id} className="flex items-center gap-1.5">
                {isAdmin && (
                  <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} className="shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <PurchaseListRow
                    item={item} name={getName(item.item_id)} unit={getUnit(item.item_id)}
                    isEditing={editingItem?.id === item.id} editQty={editingItem?.id === item.id ? editingItem.qty : item.quantity}
                    onToggleComplete={() => completeItem.mutate({ itemRowId: item.id, itemId: item.item_id, quantity: item.quantity })}
                    onStartEdit={() => setEditingItem({ id: item.id, qty: item.quantity })}
                    onEditQty={(qty) => setEditingItem({ id: item.id, qty })}
                    onSaveEdit={() => { if (editingItem) { editQty.mutate({ itemRowId: item.id, newQty: editingItem.qty, oldQty: item.quantity }); setEditingItem(null); } }}
                    onCancelEdit={() => setEditingItem(null)}
                    onDelete={() => deleteItem.mutate({ itemRowId: item.id, itemId: item.item_id, quantity: item.quantity })}
                    completed={false}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed items */}
      {completedItems.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('purchase.done')} ({completedItems.length})</p>
            {completedItems.map(item => (
              <PurchaseListRow
                key={item.id} item={item} name={getName(item.item_id)} unit={getUnit(item.item_id)}
                isEditing={false} editQty={item.quantity}
                onToggleComplete={() => uncompleteItem.mutate({ itemRowId: item.id, itemId: item.item_id, quantity: item.quantity })}
                onStartEdit={() => {}} onEditQty={() => {}} onSaveEdit={() => {}} onCancelEdit={() => {}}
                onDelete={() => deleteItem.mutate({ itemRowId: item.id, itemId: item.item_id, quantity: item.quantity })}
                completed={true}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <div className="text-center text-muted-foreground py-8 text-sm">{t('purchase.noItems')}</div>
      )}

      {/* Duplicate item dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={o => { if (!o) setDuplicateDialog(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">{t('purchase.itemExists')}</DialogTitle></DialogHeader>
          {duplicateDialog && (
            <div className="space-y-3">
              <p className="text-xs"><strong>{duplicateDialog.name}</strong> is already on the list with quantity <strong>{duplicateDialog.existingQty}</strong>.</p>
              <div className="flex items-center gap-2">
                <label className="text-xs">New qty:</label>
                <Input type="number" min="0.25" step="0.01" value={duplicateDialog.newQty}
                  onChange={e => setDuplicateDialog({ ...duplicateDialog, newQty: parseFloat(e.target.value) || 1 })}
                  className="w-20 h-7 text-xs text-center" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs" onClick={() => handleDuplicateAction('add_more')}>{t('purchase.addMore')} (+{duplicateDialog.newQty})</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleDuplicateAction('change_qty')}>{t('purchase.changeQty')} (→{duplicateDialog.newQty})</Button>
              </div>
              <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setDuplicateDialog(null)}>Cancel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PurchaseListRow({
  item, name, unit, isEditing, editQty, completed,
  onToggleComplete, onStartEdit, onEditQty, onSaveEdit, onCancelEdit, onDelete,
}: {
  item: PurchaseListItem; name: string; unit: string; isEditing: boolean; editQty: number; completed: boolean;
  onToggleComplete: () => void; onStartEdit: () => void; onEditQty: (qty: number) => void;
  onSaveEdit: () => void; onCancelEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${completed ? 'border-border/50 bg-muted/30' : 'border-border'}`}>
      <Checkbox checked={completed} onCheckedChange={onToggleComplete} className="shrink-0" />
      <div className={`min-w-0 flex-1 ${completed ? 'line-through opacity-50' : ''}`}>
        <span className="text-xs font-medium truncate block">{name}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <Input type="number" min="0.25" step="0.01" value={editQty}
              onChange={e => onEditQty(parseFloat(e.target.value) || 0.25)}
              className="w-14 h-6 text-xs text-center" />
            <button onClick={onSaveEdit} className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center"><Check className="h-3 w-3" /></button>
            <button onClick={onCancelEdit} className="h-6 w-6 rounded bg-muted flex items-center justify-center"><X className="h-3 w-3" /></button>
          </>
        ) : (
          <>
            <span className="text-xs font-mono text-muted-foreground">{item.quantity} {unit}</span>
            {!completed && <button onClick={onStartEdit} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center"><Pencil className="h-3 w-3 text-muted-foreground" /></button>}
            <button onClick={onDelete} className="h-6 w-6 rounded hover:bg-destructive/10 flex items-center justify-center"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
          </>
        )}
      </div>
    </div>
  );
}

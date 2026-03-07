import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useInventoryItems, useCreatePurchaseOrder, usePurchaseTemplates, InventoryItem, PurchaseTemplate } from '../hooks/useInventory';
import { useCreateInventoryItem } from '../hooks/useInventory';
import { MASTER_CATALOG, levenshtein, CatalogEntry, calculateExpiryDate } from '../lib/masterCatalog';
import { saveDraft, getDraft, deleteDraft } from '../lib/offlineDb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Search, Plus, Minus, Truck, Loader2, Package, X, AlertTriangle, PlusCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DRAFT_KEY = 'quick_purchase_cart';

interface CartItem {
  item_id: string; // inventory item id, or 'new_<timestamp>' for one-time
  name: string;
  quantity: number;
  unit: string;
  isOneTime?: boolean; // not mapped to inventory
  isNewItem?: boolean; // needs to be created in inventory first
  catalogEntry?: CatalogEntry;
}

interface TypoSuggestion {
  query: string;
  matches: { name: string; id?: string; distance: number }[];
}

export default function QuickPurchaseDock() {
  const { t, language } = useOpsLanguage();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: templates = [] } = usePurchaseTemplates();
  const createOrder = useCreatePurchaseOrder();
  const createItem = useCreateInventoryItem();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [typoSuggestion, setTypoSuggestion] = useState<TypoSuggestion | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newItemQty, setNewItemQty] = useState(1);
  const [cartLoaded, setCartLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [templatePreview, setTemplatePreview] = useState<PurchaseTemplate | null>(null);
  const [templateQtys, setTemplateQtys] = useState<Record<string, number>>({});

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  // Load cart from IndexedDB on mount
  useEffect(() => {
    getDraft(DRAFT_KEY).then(data => {
      if (data && Array.isArray((data as any).cart)) {
        setCart((data as any).cart);
      }
      setCartLoaded(true);
    }).catch(() => setCartLoaded(true));
  }, []);

  // Autosave cart to IndexedDB with 300ms debounce
  useEffect(() => {
    if (!cartLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (cart.length > 0) {
        saveDraft(DRAFT_KEY, 'quick_purchase', { cart }).catch(() => {});
      } else {
        deleteDraft(DRAFT_KEY).catch(() => {});
      }
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [cart, cartLoaded]);

  // Items at or below reorder point
  const dueItems = useMemo(() =>
    items.filter(i => i.current_stock <= i.reorder_point),
    [items]
  );

  // Character-by-character search with fuzzy matching
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    // Search inventory items
    const inventoryMatches = items.filter(i => {
      const name = getName(i).toLowerCase();
      const nameEn = i.name_en.toLowerCase();
      return name.includes(q) || nameEn.includes(q) || i.category.toLowerCase().includes(q);
    });

    // Search catalog for items not yet in inventory
    const inventoryNames = new Set(items.map(i => i.name_en.toLowerCase()));
    const catalogMatches = MASTER_CATALOG.filter(c =>
      !inventoryNames.has(c.name.toLowerCase()) && c.name.toLowerCase().includes(q)
    );

    return { inventoryMatches, catalogMatches };
  }, [items, search, language]);

  // Detect typos when no exact matches
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 3) {
      setTypoSuggestion(null);
      setShowAddNew(false);
      return;
    }

    const hasExactMatches = searchResults &&
      (searchResults.inventoryMatches.length > 0 || searchResults.catalogMatches.length > 0);

    if (!hasExactMatches) {
      // Find close matches via Levenshtein
      const allNames = [
        ...items.map(i => ({ name: i.name_en, id: i.id })),
        ...MASTER_CATALOG.map(c => ({ name: c.name, id: undefined })),
      ];
      const threshold = q.length <= 4 ? 2 : 3;
      const matches = allNames
        .map(item => ({ ...item, distance: levenshtein(q, item.name.toLowerCase()) }))
        .filter(m => m.distance <= threshold)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      if (matches.length > 0) {
        setTypoSuggestion({ query: q, matches });
        setShowAddNew(true);
      } else {
        setTypoSuggestion(null);
        setShowAddNew(true);
      }
    } else {
      setTypoSuggestion(null);
      setShowAddNew(false);
    }
  }, [search, searchResults, items]);

  const displayItems = useMemo(() => {
    if (searchResults) return searchResults.inventoryMatches;
    return [];
  }, [searchResults]);

  const getCartQty = (itemId: string) =>
    cart.find(c => c.item_id === itemId)?.quantity || 0;

  const updateCart = useCallback((itemId: string, name: string, unit: string, delta: number, parLevel?: number, currentStock?: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === itemId);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(c => c.item_id !== itemId);
        return prev.map(c => c.item_id === itemId ? { ...c, quantity: newQty } : c);
      }
      if (delta > 0) {
        const suggestedQty = parLevel && currentStock !== undefined
          ? Math.max(1, parLevel - currentStock)
          : 1;
        return [...prev, { item_id: itemId, name, unit, quantity: delta > 1 ? delta : suggestedQty }];
      }
      return prev;
    });
  }, []);

  const setCartQty = useCallback((itemId: string, qty: number) => {
    setCart(prev => {
      if (qty <= 0) return prev.filter(c => c.item_id !== itemId);
      return prev.map(c => c.item_id === itemId ? { ...c, quantity: qty } : c);
    });
  }, []);

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const addCatalogItemToCart = (entry: CatalogEntry) => {
    const tempId = `catalog_${entry.name}`;
    const existing = cart.find(c => c.item_id === tempId);
    if (existing) {
      updateCart(tempId, entry.name, entry.unit, 1);
    } else {
      setCart(prev => [...prev, {
        item_id: tempId,
        name: entry.name,
        unit: entry.unit,
        quantity: entry.defaultQty,
        isNewItem: true,
        catalogEntry: entry,
      }]);
    }
    setSearch('');
  };

  const addOneTimeItem = () => {
    const name = search.trim();
    if (!name) return;
    const tempId = `onetime_${Date.now()}`;
    setCart(prev => [...prev, {
      item_id: tempId,
      name,
      unit: 'pcs',
      quantity: newItemQty,
      isOneTime: true,
    }]);
    setSearch('');
    setNewItemQty(1);
    setShowAddNew(false);
    toast.info(`"${name}" added as one-time purchase`);
  };

  const addAsNewInventoryItem = () => {
    const name = search.trim();
    if (!name) return;
    const tempId = `new_${Date.now()}`;
    setCart(prev => [...prev, {
      item_id: tempId,
      name,
      unit: 'pcs',
      quantity: newItemQty,
      isNewItem: true,
    }]);
    setSearch('');
    setNewItemQty(1);
    setShowAddNew(false);
    toast.info(`"${name}" will be added to inventory on order`);
  };

  const selectTypoMatch = (name: string) => {
    setSearch(name);
    setTypoSuggestion(null);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    try {
      // First, create any new inventory items
      const newItemIds: Record<string, string> = {};
      for (const c of cart) {
        if (c.isNewItem && !c.isOneTime) {
          const catalogEntry = c.catalogEntry || MASTER_CATALOG.find(m => m.name.toLowerCase() === c.name.toLowerCase());
          const newItem = await createItem.mutateAsync({
            name_en: c.name,
            category: catalogEntry?.category || 'F&B',
            unit: catalogEntry?.unit || c.unit,
            par_level: catalogEntry ? Math.ceil(catalogEntry.defaultQty) : 5,
            reorder_point: catalogEntry ? Math.max(1, Math.ceil(catalogEntry.defaultQty * 0.3)) : 2,
            expiry_warn_days: catalogEntry
              ? (catalogEntry.shelfLifeDays <= 7 ? 1 : catalogEntry.shelfLifeDays <= 30 ? 3 : 7)
              : null,
          });
          newItemIds[c.item_id] = newItem.id;
        }
      }

      // Filter out one-time items (they don't go to PO with inventory tracking)
      const poItems = cart
        .filter(c => !c.isOneTime)
        .map(c => ({
          item_id: newItemIds[c.item_id] || c.item_id,
          quantity: c.quantity,
        }));

      if (poItems.length > 0) {
        await createOrder.mutateAsync(poItems);
      }

      const oneTimeCount = cart.filter(c => c.isOneTime).length;
      toast.success(
        `PO created with ${poItems.length} items${oneTimeCount > 0 ? ` (${oneTimeCount} one-time items noted)` : ''}`
      );
      setCart([]);
      setSearch('');
      deleteDraft(DRAFT_KEY).catch(() => {});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm">
            <ShoppingCart className="h-4 w-4 text-primary" />
            {t('home.purchase')}
            {dueItems.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1.5">
                {dueItems.length} due
              </Badge>
            )}
          </span>
          {cart.length > 0 && (
            <Badge variant="default" className="text-[9px] h-5 px-2 gap-0.5">
              <Package className="h-3 w-3" /> {cart.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Search — character by character */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Type item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Typo suggestion */}
        {typoSuggestion && typoSuggestion.matches.length > 0 && (
          <div className="bg-accent/50 border border-accent rounded-lg p-2 space-y-1">
            <p className="text-[10px] text-accent-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Did you mean:
            </p>
            <div className="flex flex-wrap gap-1">
              {typoSuggestion.matches.map(m => (
                <button
                  key={m.name}
                  onClick={() => selectTypoMatch(m.name)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add new item options */}
        {showAddNew && search.trim().length >= 2 && (
          <div className="border border-dashed border-primary/30 rounded-lg p-2 space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              "{search.trim()}" not found. Add as:
            </p>
            <div className="flex gap-1.5">
              <div className="flex items-center gap-1 flex-1">
                <button onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
                  className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <Input
                  type="number"
                  value={newItemQty}
                  onChange={e => setNewItemQty(Math.max(1, Number(e.target.value)))}
                  className="h-5 w-10 text-[10px] text-center px-0.5"
                />
                <button onClick={() => setNewItemQty(newItemQty + 1)}
                  className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
              <button
                onClick={addAsNewInventoryItem}
                className="text-[9px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-0.5"
              >
                <PlusCircle className="h-3 w-3" /> New item
              </button>
              <button
                onClick={addOneTimeItem}
                className="text-[9px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                One-time
              </button>
            </div>
          </div>
        )}

        {/* Template search results */}
        {search.trim() && (() => {
          const q = search.trim().toLowerCase();
          const matchedTemplates = templates.filter(t => t.name.toLowerCase().includes(q));
          if (matchedTemplates.length === 0) return null;
          return (
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Templates</p>
              {matchedTemplates.slice(0, 5).map(tmpl => (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-dashed border-accent bg-accent/30"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {(tmpl.items_json as any[]).length} items
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTemplatePreview(tmpl);
                      const qtys: Record<string, number> = {};
                      (tmpl.items_json as any[]).forEach((ti: any) => { qtys[ti.item_id] = ti.quantity; });
                      setTemplateQtys(qtys);
                      setSearch('');
                    }}
                    className="h-7 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-0.5 hover:bg-primary/20 active:scale-95 transition-all"
                  >
                    <Plus className="h-3 w-3" /> Use
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Search results - only show when searching */}
        {search.trim() && displayItems.length > 0 && (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Inventory items</p>
            {displayItems.slice(0, 15).map(item => {
              const cartQty = getCartQty(item.id);
              const isDue = item.current_stock <= item.reorder_point;
              const deficit = Math.max(0, item.par_level - item.current_stock);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    cartQty > 0 ? 'border-primary/40 bg-primary/5' : isDue ? 'border-destructive/20 bg-destructive/5' : 'border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{getName(item)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.current_stock}/{item.par_level} {item.unit}
                      {isDue && deficit > 0 && (
                        <span className="text-destructive ml-1">· need {deficit}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {cartQty > 0 ? (
                      <>
                        <button
                          onClick={() => updateCart(item.id, getName(item), item.unit, -1)}
                          className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number"
                          value={cartQty}
                          onChange={e => setCartQty(item.id, Number(e.target.value))}
                          className="h-6 w-10 text-xs text-center px-0.5 font-mono font-semibold"
                        />
                        <button
                          onClick={() => updateCart(item.id, getName(item), item.unit, 1)}
                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => updateCart(item.id, getName(item), item.unit, 1, item.par_level, item.current_stock)}
                        className="h-7 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-0.5 hover:bg-primary/20 active:scale-95 transition-all"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Due items summary when not searching */}
        {!search.trim() && dueItems.length > 0 && (
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">
              {dueItems.length} items due for order — search to add them
            </p>
          </div>
        )}

        {!search.trim() && dueItems.length === 0 && cart.length === 0 && (
          <p className="text-center text-[10px] text-muted-foreground py-2">
            Search items or templates to add to cart
          </p>
        )}

        {/* Cart summary + submit */}
        {cart.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {cart.map(c => (
                <Badge
                  key={c.item_id}
                  variant={c.isOneTime ? 'outline' : c.isNewItem ? 'secondary' : 'default'}
                  className="text-[10px] gap-0.5 pr-0.5"
                >
                  {c.name.slice(0, 15)} ×{c.quantity}
                  {c.isOneTime && <span className="text-[8px] opacity-70">1x</span>}
                  {c.isNewItem && <span className="text-[8px] opacity-70">new</span>}
                  <button onClick={() => removeFromCart(c.item_id)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={createOrder.isPending || createItem.isPending}
              className="w-full h-8 text-xs gap-1.5"
              size="sm"
            >
              {(createOrder.isPending || createItem.isPending) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Truck className="h-3.5 w-3.5" />
              )}
              Generate PO ({cart.length} items)
            </Button>
          </div>
        )}
      </CardContent>

      {/* Template preview dialog */}
      <Dialog open={!!templatePreview} onOpenChange={(open) => { if (!open) setTemplatePreview(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {templatePreview?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Adjust quantities then add all to cart:</p>
            {templatePreview && (templatePreview.items_json as any[]).map((ti: any) => {
              const item = items.find(i => i.id === ti.item_id);
              const name = item ? getName(item) : ti.item_id.slice(0, 8);
              return (
                <div key={ti.item_id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{name}</span>
                    {item && (
                      <span className="text-[10px] text-muted-foreground">
                        Stock: {item.current_stock} {item.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setTemplateQtys(prev => ({ ...prev, [ti.item_id]: Math.max(0, (prev[ti.item_id] || 0) - 1) }))}
                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <Input
                      type="number"
                      value={templateQtys[ti.item_id] || 0}
                      onChange={e => setTemplateQtys(prev => ({ ...prev, [ti.item_id]: Math.max(0, Number(e.target.value)) }))}
                      className="h-6 w-12 text-xs text-center px-0.5 font-mono"
                    />
                    <button
                      onClick={() => setTemplateQtys(prev => ({ ...prev, [ti.item_id]: (prev[ti.item_id] || 0) + 1 }))}
                      className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            <Button
              className="w-full text-xs"
              size="sm"
              onClick={() => {
                if (!templatePreview) return;
                const itemsToAdd = (templatePreview.items_json as any[])
                  .filter((ti: any) => (templateQtys[ti.item_id] || 0) > 0);
                for (const ti of itemsToAdd) {
                  const item = items.find(i => i.id === ti.item_id);
                  const name = item ? getName(item) : ti.item_id.slice(0, 8);
                  const unit = item?.unit || 'pcs';
                  const qty = templateQtys[ti.item_id] || ti.quantity;
                  // Replace existing cart entry or add new
                  setCart(prev => {
                    const existing = prev.find(c => c.item_id === ti.item_id);
                    if (existing) {
                      return prev.map(c => c.item_id === ti.item_id ? { ...c, quantity: qty } : c);
                    }
                    return [...prev, { item_id: ti.item_id, name, unit, quantity: qty }];
                  });
                }
                toast.success(`${itemsToAdd.length} items added from "${templatePreview.name}"`);
                setTemplatePreview(null);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add {Object.values(templateQtys).filter(q => q > 0).length} items to cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

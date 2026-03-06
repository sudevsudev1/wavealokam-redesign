import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useInventoryItems, useCreatePurchaseOrder, InventoryItem } from '../hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Plus, Minus, Truck, Loader2, Package, X } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  item_id: string;
  quantity: number;
}

export default function QuickPurchaseDock() {
  const { t, language } = useOpsLanguage();
  const { data: items = [], isLoading } = useInventoryItems();
  const createOrder = useCreatePurchaseOrder();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  const getName = (item: InventoryItem) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  // Items at or below reorder point
  const dueItems = useMemo(() =>
    items.filter(i => i.current_stock <= i.reorder_point),
    [items]
  );

  // Search results (all items when searching, due items when not)
  const displayItems = useMemo(() => {
    if (search.trim()) {
      return items.filter(i => {
        const name = getName(i).toLowerCase();
        const nameEn = i.name_en.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || nameEn.includes(q) || i.category.toLowerCase().includes(q);
      });
    }
    return showAll ? items : dueItems;
  }, [items, dueItems, search, showAll, language]);

  const getCartQty = (itemId: string) =>
    cart.find(c => c.item_id === itemId)?.quantity || 0;

  const updateCart = (itemId: string, delta: number, parLevel?: number, currentStock?: number) => {
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
        return [...prev, { item_id: itemId, quantity: delta > 1 ? delta : suggestedQty }];
      }
      return prev;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    try {
      await createOrder.mutateAsync(cart);
      toast.success(t('purchase.orderCreated'));
      setCart([]);
      setSearch('');
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
                {dueItems.length} {t('inv.lowStock').toLowerCase()}
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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('inv.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Toggle: show all vs due only */}
        {!search.trim() && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowAll(false)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${!showAll ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('inv.dueTab')} ({dueItems.length})
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${showAll ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('inv.allCategories')} ({items.length})
            </button>
          </div>
        )}

        {/* Item list */}
        <div className="space-y-1 max-h-[260px] overflow-y-auto">
          {displayItems.length === 0 ? (
            <p className="text-center text-[10px] text-muted-foreground py-4">
              {search ? 'No items found' : t('inv.noDueItems')}
            </p>
          ) : (
            displayItems.slice(0, 20).map(item => {
              const cartQty = getCartQty(item.id);
              const isDue = item.current_stock <= item.reorder_point;
              const deficit = Math.max(0, item.par_level - item.current_stock);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    cartQty > 0 ? 'border-primary/40 bg-primary/5' : isDue ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : 'border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{getName(item)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.current_stock}/{item.par_level} {item.unit}
                      {isDue && deficit > 0 && (
                        <span className="text-orange-600 ml-1">· need {deficit}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {cartQty > 0 ? (
                      <>
                        <button
                          onClick={() => updateCart(item.id, -1)}
                          className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-mono font-semibold w-6 text-center">{cartQty}</span>
                        <button
                          onClick={() => updateCart(item.id, 1)}
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
                        onClick={() => updateCart(item.id, 1, item.par_level, item.current_stock)}
                        className="h-7 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-0.5 hover:bg-primary/20 active:scale-95 transition-all"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {displayItems.length > 20 && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              {displayItems.length - 20} more items — refine search
            </p>
          )}
        </div>

        {/* Cart summary + submit */}
        {cart.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {cart.map(c => {
                const item = items.find(i => i.id === c.item_id);
                return (
                  <Badge key={c.item_id} variant="secondary" className="text-[10px] gap-0.5 pr-0.5">
                    {item ? getName(item).slice(0, 15) : '...'} ×{c.quantity}
                    <button onClick={() => removeFromCart(c.item_id)} className="ml-0.5 hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={createOrder.isPending}
              className="w-full h-8 text-xs gap-1.5"
              size="sm"
            >
              {createOrder.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Truck className="h-3.5 w-3.5" />
              )}
              {t('inv.generatePO')} ({cart.length} items)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

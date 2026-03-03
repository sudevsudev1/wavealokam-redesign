import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, useExpiryItems, useAddExpiry, useDisposeExpiry } from '../hooks/useInventory';
import { STOCK_STATUS, INVENTORY_CATEGORIES } from '../lib/inventoryConstants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, Calendar, Search, Plus, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function InventoryPage() {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: expiryItems = [] } = useExpiryItems();
  const addExpiry = useAddExpiry();
  const disposeExpiry = useDisposeExpiry();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tab, setTab] = useState<'stock' | 'expiry'>('stock');

  // Expiry add dialog
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryItemId, setExpiryItemId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryQty, setExpiryQty] = useState('1');
  const [expiryBatch, setExpiryBatch] = useState('');

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const name = language === 'ml' && item.name_ml ? item.name_ml : item.name_en;
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || item.name_en.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter, language]);

  const lowStockCount = items.filter((i) => i.current_stock <= i.reorder_point).length;
  const expiringCount = expiryItems.filter((e) => {
    const days = differenceInDays(parseISO(e.expiry_date), new Date());
    return days <= 30 && days >= 0;
  }).length;

  const handleAddExpiry = async () => {
    if (!expiryItemId || !expiryDate) return;
    try {
      await addExpiry.mutateAsync({
        item_id: expiryItemId,
        quantity: parseInt(expiryQty) || 1,
        expiry_date: expiryDate,
        batch_label: expiryBatch || undefined,
      });
      toast.success('Expiry entry added');
      setExpiryDialogOpen(false);
      setExpiryItemId('');
      setExpiryDate('');
      setExpiryQty('1');
      setExpiryBatch('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDispose = async (id: string) => {
    try {
      await disposeExpiry.mutateAsync(id);
      toast.success('Marked as disposed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getName = (item: { name_en: string; name_ml: string | null }) =>
    language === 'ml' && item.name_ml ? item.name_ml : item.name_en;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Package className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold leading-tight">{items.length}</p>
              <p className="text-[10px] text-muted-foreground">{t('inv.totalItems')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-orange-300' : ''}>
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className={`h-6 w-6 shrink-0 ${lowStockCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-lg font-bold leading-tight">{lowStockCount}</p>
              <p className="text-[10px] text-muted-foreground">{t('inv.lowStock')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? 'border-red-300' : ''}>
          <CardContent className="p-3 flex items-center gap-2">
            <Calendar className={`h-6 w-6 shrink-0 ${expiringCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-lg font-bold leading-tight">{expiringCount}</p>
              <p className="text-[10px] text-muted-foreground">{t('inv.expiringSoon')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold leading-tight">{items.filter((i) => i.current_stock <= i.reorder_point && i.current_stock > 0).length}</p>
              <p className="text-[10px] text-muted-foreground">{t('inv.needsReorder')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab === 'stock' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setTab('stock')}>
          {t('inv.stockTab')}
        </Button>
        <Button variant={tab === 'expiry' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setTab('expiry')}>
          {t('inv.expiryTab')}
        </Button>
      </div>

      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('inv.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inv.allCategories')}</SelectItem>
                {INVENTORY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock list - mobile card layout */}
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = STOCK_STATUS(item.current_stock, item.par_level, item.reorder_point);
              return (
                <Card key={item.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">No items found</div>
            )}
          </div>
        </>
      )}

      {tab === 'expiry' && (
        <>
          <div className="flex justify-end">
            <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" />{t('inv.addExpiry')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('inv.addExpiry')}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={expiryItemId} onValueChange={setExpiryItemId}>
                    <SelectTrigger><SelectValue placeholder={t('inv.selectItem')} /></SelectTrigger>
                    <SelectContent>
                      {items.filter((i) => i.expiry_warn_days != null).map((i) => (
                        <SelectItem key={i.id} value={i.id}>{getName(i)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                  <Input type="number" min="1" value={expiryQty} onChange={(e) => setExpiryQty(e.target.value)} placeholder={t('inv.quantity')} />
                  <Input value={expiryBatch} onChange={(e) => setExpiryBatch(e.target.value)} placeholder={t('inv.batchLabel')} />
                  <Button onClick={handleAddExpiry} disabled={!expiryItemId || !expiryDate} className="w-full">{t('inv.save')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Expiry list - mobile card layout */}
          <div className="space-y-2">
            {expiryItems.map((entry) => {
              const item = items.find((i) => i.id === entry.item_id);
              const daysLeft = differenceInDays(parseISO(entry.expiry_date), new Date());
              const isExpired = daysLeft < 0;
              const isWarning = daysLeft <= 30;
              return (
                <Card key={entry.id} className={isExpired ? 'border-red-300' : isWarning ? 'border-yellow-300' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm truncate block">{item ? getName(item) : entry.item_id}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.batch_label || 'No batch'} · Qty: {entry.quantity} · {format(parseISO(entry.expiry_date), 'dd MMM yy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${isExpired ? 'text-red-600 bg-red-50' : isWarning ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>
                          {isExpired ? t('inv.expired') : `${daysLeft}d`}
                        </Badge>
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleDispose(entry.id)}>
                          {t('inv.dispose')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {expiryItems.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">{t('inv.noExpiry')}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
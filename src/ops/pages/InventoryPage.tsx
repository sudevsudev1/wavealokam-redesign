import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useInventoryItems, useUpdateStock, useExpiryItems, useAddExpiry, useDisposeExpiry, useRefillTemplates } from '../hooks/useInventory';
import { STOCK_STATUS, INVENTORY_CATEGORIES } from '../lib/inventoryConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, Calendar, Search, Plus, Minus, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function InventoryPage() {
  const { t, language } = useOpsLanguage();
  const { isAdmin } = useOpsAuth();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: expiryItems = [] } = useExpiryItems();
  const updateStock = useUpdateStock();
  const addExpiry = useAddExpiry();
  const disposeExpiry = useDisposeExpiry();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tab, setTab] = useState<'stock' | 'expiry'>('stock');

  // Adjust stock dialog
  const [adjustItem, setAdjustItem] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

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

  const handleAdjust = async () => {
    if (!adjustItem || !adjustQty) return;
    try {
      await updateStock.mutateAsync({
        itemId: adjustItem,
        quantity: parseInt(adjustQty),
        type: adjustType,
        notes: `Manual ${adjustType}`,
      });
      toast.success(`Stock ${adjustType === 'in' ? 'added' : 'removed'}`);
      setAdjustItem(null);
      setAdjustQty('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

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
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">{t('inv.totalItems')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-orange-300' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">{t('inv.lowStock')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? 'border-red-300' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className={`h-8 w-8 ${expiringCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{expiringCount}</p>
              <p className="text-xs text-muted-foreground">{t('inv.expiringSoon')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <RotateCcw className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{items.filter((i) => i.current_stock <= i.reorder_point && i.current_stock > 0).length}</p>
              <p className="text-xs text-muted-foreground">{t('inv.needsReorder')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab === 'stock' ? 'default' : 'outline'} size="sm" onClick={() => setTab('stock')}>
          {t('inv.stockTab')}
        </Button>
        <Button variant={tab === 'expiry' ? 'default' : 'outline'} size="sm" onClick={() => setTab('expiry')}>
          {t('inv.expiryTab')}
        </Button>
      </div>

      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('inv.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
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

          {/* Stock table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inv.item')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('inv.category')}</TableHead>
                  <TableHead className="text-center">{t('inv.stock')}</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">{t('inv.par')}</TableHead>
                  <TableHead className="text-center">{t('inv.status')}</TableHead>
                  <TableHead className="text-right">{t('inv.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const status = STOCK_STATUS(item.current_stock, item.par_level, item.reorder_point);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{getName(item)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({item.unit})</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{item.category}</TableCell>
                      <TableCell className="text-center font-mono font-semibold">{item.current_stock}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell text-muted-foreground">{item.par_level}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${status.color}`}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setAdjustItem(item.id); setAdjustType('in'); }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setAdjustItem(item.id); setAdjustType('out'); }}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'expiry' && (
        <>
          <div className="flex justify-end">
            <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('inv.addExpiry')}</Button>
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

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inv.item')}</TableHead>
                  <TableHead>{t('inv.batch')}</TableHead>
                  <TableHead className="text-center">{t('inv.qty')}</TableHead>
                  <TableHead>{t('inv.expiryDate')}</TableHead>
                  <TableHead className="text-center">{t('inv.daysLeft')}</TableHead>
                  <TableHead className="text-right">{t('inv.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiryItems.map((entry) => {
                  const item = items.find((i) => i.id === entry.item_id);
                  const daysLeft = differenceInDays(parseISO(entry.expiry_date), new Date());
                  const isExpired = daysLeft < 0;
                  const isWarning = daysLeft <= 30;
                  return (
                    <TableRow key={entry.id} className={isExpired ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium text-sm">{item ? getName(item) : entry.item_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.batch_label || '-'}</TableCell>
                      <TableCell className="text-center">{entry.quantity}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(entry.expiry_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${isExpired ? 'text-red-600 bg-red-50' : isWarning ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>
                          {isExpired ? `${t('inv.expired')}` : `${daysLeft}d`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleDispose(entry.id)}>
                          {t('inv.dispose')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {expiryItems.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('inv.noExpiry')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(open) => { if (!open) setAdjustItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'in' ? t('inv.addStock') : t('inv.removeStock')}
              {adjustItem && ` — ${getName(items.find((i) => i.id === adjustItem)!)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number" min="1" value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder={t('inv.quantity')}
              autoFocus
            />
            <Button onClick={handleAdjust} disabled={!adjustQty || updateStock.isPending} className="w-full">
              {updateStock.isPending ? '...' : adjustType === 'in' ? t('inv.addStock') : t('inv.removeStock')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

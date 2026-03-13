import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useTasks } from '../hooks/useTasks';
import { useInventoryItems, useExpiryItems } from '../hooks/useInventory';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import PurchasePage from './PurchasePage';
import CreateTaskDialog from '../components/CreateTaskDialog';
import { CONSUMABLE_CATEGORIES } from '../lib/inventoryConstants';
import type { InventoryExpiry } from '../hooks/useInventory';

function getDueCount(items: any[], batches: InventoryExpiry[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return items.filter(item => {
    if (!item.is_active || item.par_level <= 0) return false;
    const activeBatches = batches.filter((b: any) => b.item_id === item.id && !b.is_disposed);
    const isConsumable = CONSUMABLE_CATEGORIES.includes(item.category);
    if (activeBatches.length > 0) {
      if (activeBatches.some((b: any) => b.expiry_date <= todayStr)) return true;
      if (activeBatches.some((b: any) => b.expiry_date <= tomorrowStr)) return true;
    }
    if (isConsumable) return false;
    if (item.current_stock <= item.reorder_point && item.current_stock < item.par_level) return true;
    return false;
  }).length;
}

export default function AdminHome() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const { data: allTasks } = useTasks();
  const { data: items = [] } = useInventoryItems();
  const { data: expiryBatches = [] } = useExpiryItems();
  const navigate = useNavigate();
  const [purchaseOpen, setPurchaseOpen] = useState(true);

  const allOverdue = useMemo(() =>
    allTasks?.filter(t =>
      t.due_datetime && new Date(t.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(t.status)
    ) || [],
    [allTasks]
  );

  const dueForOrder = useMemo(() => getDueCount(items, expiryBatches), [items, expiryBatches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold truncate">{t('home.welcome')}, {profile?.displayName}</h1>
        <CreateTaskDialog />
      </div>

      {/* At-Risk Strip - only overdue tasks & due for order */}
      <div className="grid grid-cols-2 gap-2">
        <Card
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${allOverdue.length > 0 ? 'border-destructive/50' : ''}`}
          onClick={() => navigate('/ops/tasks')}
        >
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className={`h-3.5 w-3.5 ${allOverdue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className={`text-lg font-bold ${allOverdue.length > 0 ? 'text-destructive' : ''}`}>{allOverdue.length}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t('home.overdueTasks')}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${dueForOrder > 0 ? 'border-orange-300' : ''}`}
          onClick={() => navigate('/ops/inventory?tab=due')}
        >
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className={`h-3.5 w-3.5 ${dueForOrder > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <span className={`text-lg font-bold ${dueForOrder > 0 ? 'text-orange-600' : ''}`}>{dueForOrder}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t('home.dueForOrder')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Purchase List */}
      <Collapsible open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="text-sm font-semibold">Purchase List</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${purchaseOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <PurchasePage />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

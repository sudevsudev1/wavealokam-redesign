import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useTasks, useOpsProfiles, OpsTask } from '../hooks/useTasks';
import { useInventoryItems, useExpiryItems } from '../hooks/useInventory';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ChevronDown, CheckCircle2, Circle, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PurchasePage from './PurchasePage';
import CreateTaskDialog from '../components/CreateTaskDialog';
import HomeShiftWidget from '../components/HomeShiftWidget';
import HomeSurfingWidget from '../components/HomeSurfingWidget';
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

const STATUS_ICON: Record<string, { icon: typeof Circle; color: string }> = {
  'To Do': { icon: Circle, color: 'text-muted-foreground' },
  'In Progress': { icon: Timer, color: 'text-blue-600' },
  'Blocked': { icon: AlertTriangle, color: 'text-amber-600' },
  'Done': { icon: CheckCircle2, color: 'text-emerald-600' },
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-muted text-muted-foreground border-border',
};

function TaskItem({ task, language }: { task: OpsTask; language: string }) {
  const title = language === 'ml' && task.title_ml ? task.title_ml : (task.title_en || task.title_original);
  const isOverdue = task.due_datetime && new Date(task.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(task.status);
  const si = STATUS_ICON[task.status] || STATUS_ICON['To Do'];
  const Icon = si.icon;

  return (
    <div className="flex items-start gap-2 py-1.5 px-1">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${si.color}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs leading-tight truncate ${isOverdue ? 'text-destructive font-medium' : ''}`}>{title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${PRIORITY_COLOR[task.priority] || ''}`}>{task.priority}</Badge>
          {isOverdue && <span className="text-[9px] text-destructive font-medium">Overdue</span>}
        </div>
      </div>
    </div>
  );
}

function UserTaskGroup({ userName, tasks, language }: { userName: string; tasks: OpsTask[]; language: string }) {
  const [open, setOpen] = useState(false);
  const activeTasks = tasks.filter(t => !['Done', 'Cancelled'].includes(t.status));
  const overdueCount = activeTasks.filter(t => t.due_datetime && new Date(t.due_datetime) < new Date()).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{userName}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{activeTasks.length}</Badge>
          {overdueCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{overdueCount} overdue</Badge>}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-1 border-l-2 border-border ml-2 mt-1 space-y-0">
        {activeTasks.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-1 pl-2">No active tasks</p>
        ) : (
          activeTasks.map(t => <TaskItem key={t.id} task={t} language={language} />)
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminHome() {
  const { profile } = useOpsAuth();
  const { t, language } = useOpsLanguage();
  const { data: allTasks } = useTasks();
  const { data: profiles } = useOpsProfiles();
  const { data: items = [] } = useInventoryItems();
  const { data: expiryBatches = [] } = useExpiryItems();
  const navigate = useNavigate();
  const [purchaseOpen, setPurchaseOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(true);

  const profileMap = useMemo(() => new Map(profiles?.map(p => [p.user_id, p.display_name]) || []), [profiles]);

  const allOverdue = useMemo(() =>
    allTasks?.filter(t =>
      t.due_datetime && new Date(t.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(t.status)
    ) || [],
    [allTasks]
  );

  const dueForOrder = useMemo(() => getDueCount(items, expiryBatches), [items, expiryBatches]);

  // Group tasks by user
  const tasksByUser = useMemo(() => {
    if (!allTasks) return [];
    const map = new Map<string, OpsTask[]>();
    allTasks.forEach(task => {
      if (['Done', 'Cancelled'].includes(task.status)) return;
      task.assigned_to.forEach(uid => {
        const arr = map.get(uid) || [];
        arr.push(task);
        map.set(uid, arr);
      });
      if (task.assigned_to.length === 0) {
        const arr = map.get('__unassigned') || [];
        arr.push(task);
        map.set('__unassigned', arr);
      }
    });
    return Array.from(map.entries())
      .map(([uid, tasks]) => ({
        userId: uid,
        name: uid === '__unassigned' ? 'Unassigned' : (profileMap.get(uid) || 'Unknown'),
        tasks,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allTasks, profileMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold truncate">{t('home.welcome')}, {profile?.displayName}</h1>
        <CreateTaskDialog />
      </div>

      {/* Shift Widget */}
      <HomeShiftWidget />

      {/* At-Risk Strip */}
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

      {/* Collapsible All Tasks by User */}
      <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="text-sm font-semibold">Team Tasks</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${tasksOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1">
          {tasksByUser.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No active tasks</p>
          ) : (
            tasksByUser.map(g => (
              <UserTaskGroup key={g.userId} userName={g.name} tasks={g.tasks} language={language} />
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

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

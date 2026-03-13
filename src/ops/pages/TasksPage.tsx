import { useState, useMemo } from 'react';
import { useTasks, useMyTasks, useOpsProfiles, useUpdateTask } from '../hooks/useTasks';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import CreateTaskDialog from '../components/CreateTaskDialog';
import TaskRow from '../components/TaskRow';
import BulkActionBar from '../components/BulkActionBar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Loader2, Filter, Trash2, ArrowRight, Printer, Copy, RotateCcw } from 'lucide-react';
import { TASK_STATUSES, TASK_CATEGORIES, TASK_PRIORITIES } from '../lib/taskConstants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { copyToClipboard, printToPdf, formatTasksForCopy } from '../lib/printCopy';
import { Button } from '@/components/ui/button';
import RecurringTasksTab from '../components/RecurringTasksTab';

export default function TasksPage() {
  const [topTab, setTopTab] = useState<'tasks' | 'recurring'>('tasks');
  const { isAdmin, profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const { data: allTasks, isLoading } = useTasks();
  const { data: profiles } = useOpsProfiles();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const myTasks = allTasks?.filter(task => task.assigned_to.includes(profile?.userId || '')) || [];

  const managers = profiles?.filter(p => p.role === 'manager') || [];
  const admins = profiles?.filter(p => p.role === 'admin') || [];

  const applyFilters = (tasks: typeof allTasks) => {
    let filtered = tasks || [];
    if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === filterPriority);
    return filtered;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: string, tasks: NonNullable<typeof allTasks>) => {
    const ids = Array.from(selectedIds).filter(id => tasks.some(t => t.id === id));
    if (!ids.length) return;
    setBulkPending(true);
    try {
      if (action === 'delete') {
        const { error } = await supabase.from('ops_tasks').delete().in('id', ids);
        if (error) throw error;
        toast.success(`Deleted ${ids.length} tasks`);
      } else if (TASK_STATUSES.includes(action as any)) {
        const { error } = await supabase.from('ops_tasks').update({ status: action, updated_at: new Date().toISOString() } as any).in('id', ids);
        if (error) throw error;
        toast.success(`Updated ${ids.length} tasks to ${action}`);
      }
      queryClient.invalidateQueries({ queryKey: ['ops_tasks'] });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkPending(false);
    }
  };

  const bulkActions = [
    ...TASK_STATUSES.map(s => ({ label: `→ ${s}`, value: s })),
    { label: 'Delete', value: 'delete', variant: 'destructive' as const, icon: <Trash2 className="h-3 w-3" /> },
  ];

  const hasActiveFilters = filterStatus !== 'all' || filterCategory !== 'all' || filterPriority !== 'all';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-primary" />
          {t('nav.tasks')}
        </h1>
        <div className="flex items-center gap-1">
          {topTab === 'tasks' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Copy"
                onClick={() => {
                  const tasks = applyFilters(allTasks || []);
                  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
                  const text = formatTasksForCopy(tasks.map(t => ({
                    title: t.title_en || t.title_original,
                    status: t.status, priority: t.priority,
                    assignee: t.assigned_to.map(id => profileMap.get(id) || '?').join(', '),
                    due: t.due_datetime ? new Date(t.due_datetime).toLocaleDateString() : undefined,
                  })));
                  copyToClipboard(text);
                }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Print PDF"
                onClick={() => {
                  const tasks = applyFilters(allTasks || []);
                  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
                  printToPdf('Tasks', tasks.map(t => [
                    t.title_en || t.title_original, t.status, t.priority,
                    t.assigned_to.map(id => profileMap.get(id) || '?').join(', '),
                    t.due_datetime ? new Date(t.due_datetime).toLocaleDateString() : 'No due date',
                  ]));
                }}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
              {isAdmin && <CreateTaskDialog />}
            </>
          )}
        </div>
      </div>

      {/* Top-level tabs: Tasks | Recurring */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={topTab === 'tasks' ? 'default' : 'outline'}
          className="text-xs h-7"
          onClick={() => setTopTab('tasks')}
        >
          <ClipboardList className="h-3 w-3 mr-1" /> Tasks
        </Button>
        <Button
          size="sm"
          variant={topTab === 'recurring' ? 'default' : 'outline'}
          className="text-xs h-7"
          onClick={() => setTopTab('recurring')}
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Recurring
        </Button>
      </div>

      {topTab === 'recurring' ? (
        <RecurringTasksTab />
      ) : (
        <>
          {/* Filters (admin only) */}
          {isAdmin && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <button onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setFilterPriority('all'); }}
                  className="text-[10px] text-primary underline">Clear</button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isAdmin ? (
            <Tabs defaultValue="my">
              <ScrollArea className="w-full">
                <TabsList className="w-max">
                  <TabsTrigger value="my" className="text-xs">My Tasks</TabsTrigger>
                  {managers.map(m => (
                    <TabsTrigger key={m.user_id} value={m.user_id} className="text-xs">{m.display_name}</TabsTrigger>
                  ))}
                  {admins.filter(a => a.user_id !== profile?.userId).map(a => (
                    <TabsTrigger key={a.user_id} value={a.user_id} className="text-xs">{a.display_name}</TabsTrigger>
                  ))}
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="my" className="space-y-2 mt-3">
                <TaskList tasks={applyFilters(myTasks)} selectedIds={selectedIds} onToggle={toggleSelect}
                  isAdmin={isAdmin} bulkActions={bulkActions} onBulkAction={(a) => handleBulkAction(a, applyFilters(myTasks))}
                  bulkPending={bulkPending} onSelectAll={() => setSelectedIds(new Set(applyFilters(myTasks).map(t => t.id)))}
                  onDeselectAll={() => setSelectedIds(new Set())} />
              </TabsContent>

              {[...managers, ...admins.filter(a => a.user_id !== profile?.userId)].map(p => (
                <TabsContent key={p.user_id} value={p.user_id} className="space-y-2 mt-3">
                  <TaskList tasks={applyFilters(allTasks?.filter(task => task.assigned_to.includes(p.user_id)) || [])}
                    selectedIds={selectedIds} onToggle={toggleSelect} isAdmin={isAdmin}
                    bulkActions={bulkActions} onBulkAction={(a) => handleBulkAction(a, applyFilters(allTasks || []))}
                    bulkPending={bulkPending} onSelectAll={() => setSelectedIds(new Set(applyFilters(allTasks?.filter(task => task.assigned_to.includes(p.user_id)) || []).map(t => t.id)))}
                    onDeselectAll={() => setSelectedIds(new Set())} />
                </TabsContent>
              ))}

              <TabsContent value="all" className="space-y-2 mt-3">
                <TaskList tasks={applyFilters(allTasks || [])} selectedIds={selectedIds} onToggle={toggleSelect}
                  isAdmin={isAdmin} bulkActions={bulkActions} onBulkAction={(a) => handleBulkAction(a, applyFilters(allTasks || []))}
                  bulkPending={bulkPending} onSelectAll={() => setSelectedIds(new Set(applyFilters(allTasks || []).map(t => t.id)))}
                  onDeselectAll={() => setSelectedIds(new Set())} />
              </TabsContent>
            </Tabs>
          ) : (
            <TaskList tasks={myTasks} selectedIds={selectedIds} onToggle={toggleSelect}
              isAdmin={false} bulkActions={[]} onBulkAction={() => {}}
              bulkPending={false} onSelectAll={() => {}} onDeselectAll={() => {}} />
          )}
        </>
      )}
    </div>
  );
}

function TaskList({ tasks, selectedIds, onToggle, isAdmin, bulkActions, onBulkAction, bulkPending, onSelectAll, onDeselectAll }: {
  tasks: ReturnType<typeof useTasks>['data'] extends (infer T)[] | undefined ? T[] : never[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isAdmin: boolean;
  bulkActions: Array<{ label: string; value: string; variant?: 'default' | 'destructive'; icon?: React.ReactNode }>;
  onBulkAction: (action: string) => void;
  bulkPending: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          No tasks found
        </CardContent>
      </Card>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    const aOverdue = a.due_datetime && new Date(a.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(a.status) ? -1 : 0;
    const bOverdue = b.due_datetime && new Date(b.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(b.status) ? -1 : 0;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    if (pDiff !== 0) return pDiff;
    if (a.due_datetime && b.due_datetime) return new Date(a.due_datetime).getTime() - new Date(b.due_datetime).getTime();
    return 0;
  });

  const selectedInView = sorted.filter(t => selectedIds.has(t.id)).length;

  return (
    <div className="space-y-2">
      {isAdmin && selectedInView > 0 && (
        <BulkActionBar
          selectedCount={selectedInView}
          totalCount={sorted.length}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          actions={bulkActions}
          onAction={onBulkAction}
          isPending={bulkPending}
        />
      )}
      {sorted.map(task => (
        <div key={task.id} className="flex items-start gap-1.5">
          {isAdmin && (
            <Checkbox
              checked={selectedIds.has(task.id)}
              onCheckedChange={() => onToggle(task.id)}
              className="mt-3 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <TaskRow task={task} />
          </div>
        </div>
      ))}
    </div>
  );
}

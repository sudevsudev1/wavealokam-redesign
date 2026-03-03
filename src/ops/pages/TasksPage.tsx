import { useTasks, useMyTasks, useOpsProfiles } from '../hooks/useTasks';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import CreateTaskDialog from '../components/CreateTaskDialog';
import TaskRow from '../components/TaskRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Loader2 } from 'lucide-react';

export default function TasksPage() {
  const { isAdmin, profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const { data: allTasks, isLoading } = useTasks();
  const { data: profiles } = useOpsProfiles();

  const myTasks = allTasks?.filter(task => task.assigned_to.includes(profile?.userId || '')) || [];

  const managers = profiles?.filter(p => p.role === 'manager') || [];
  const admins = profiles?.filter(p => p.role === 'admin') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {t('nav.tasks')}
        </h1>
        {isAdmin && <CreateTaskDialog />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isAdmin ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Tasks</TabsTrigger>
            {managers.map(m => (
              <TabsTrigger key={m.user_id} value={m.user_id}>{m.display_name}</TabsTrigger>
            ))}
            {admins.filter(a => a.user_id !== profile?.userId).map(a => (
              <TabsTrigger key={a.user_id} value={a.user_id}>{a.display_name}</TabsTrigger>
            ))}
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-2 mt-3">
            <TaskList tasks={myTasks} />
          </TabsContent>

          {[...managers, ...admins.filter(a => a.user_id !== profile?.userId)].map(p => (
            <TabsContent key={p.user_id} value={p.user_id} className="space-y-2 mt-3">
              <TaskList tasks={allTasks?.filter(task => task.assigned_to.includes(p.user_id)) || []} />
            </TabsContent>
          ))}

          <TabsContent value="all" className="space-y-2 mt-3">
            <TaskList tasks={allTasks || []} />
          </TabsContent>
        </Tabs>
      ) : (
        <TaskList tasks={myTasks} />
      )}
    </div>
  );
}

function TaskList({ tasks }: { tasks: ReturnType<typeof useTasks>['data'] extends (infer T)[] | undefined ? T[] : never[] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No tasks found
        </CardContent>
      </Card>
    );
  }

  // Sort: Urgent first, then overdue, then by due date
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

  return (
    <div className="space-y-2">
      {sorted.map(task => <TaskRow key={task.id} task={task} />)}
    </div>
  );
}

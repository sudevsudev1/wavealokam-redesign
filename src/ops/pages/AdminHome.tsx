import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useTasks, useMyTasks, useOpsProfiles } from '../hooks/useTasks';
import TaskRow from '../components/TaskRow';
import CreateTaskDialog from '../components/CreateTaskDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, MessageSquare, ShoppingCart, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminHome() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const { data: allTasks, isLoading } = useTasks();
  const { data: profiles } = useOpsProfiles();
  const navigate = useNavigate();

  const myTasks = allTasks?.filter(task => task.assigned_to.includes(profile?.userId || '')) || [];
  const activeTasks = myTasks.filter(t => !['Done', 'Cancelled'].includes(t.status));
  const allOverdue = allTasks?.filter(t =>
    t.due_datetime && new Date(t.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(t.status)
  ) || [];

  const managers = profiles?.filter(p => p.role === 'manager') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('home.welcome')}, {profile?.displayName}</h1>
        <CreateTaskDialog />
      </div>

      {/* At-Risk Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('home.overdueTasks'), value: String(allOverdue.length) },
          { label: t('home.dueForOrder'), value: '0' },
          { label: t('home.delayedOrders'), value: '0' },
          { label: t('home.missingSyncs'), value: '0' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t('home.myTasks')} ({activeTasks.length})
          </CardTitle>
          <button onClick={() => navigate('/ops/tasks')} className="text-xs text-primary hover:underline">View all →</button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t('home.noTasks')}</div>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Operations - Manager task views */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            {t('home.liveOps')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {managers.map(m => {
            const managerTasks = allTasks?.filter(
              t => t.assigned_to.includes(m.user_id) && !['Done', 'Cancelled'].includes(t.status)
            ) || [];
            return (
              <div key={m.user_id}>
                <h3 className="text-sm font-semibold mb-2">{m.display_name} ({managerTasks.length} active)</h3>
                {managerTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active tasks</p>
                ) : (
                  <div className="space-y-2">
                    {managerTasks.slice(0, 3).map(task => <TaskRow key={task.id} task={task} />)}
                    {managerTasks.length > 3 && (
                      <button onClick={() => navigate('/ops/tasks')} className="text-xs text-primary hover:underline">
                        +{managerTasks.length - 3} more →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Vector + Purchase placeholders */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-primary" />{t('home.vector')}
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-center py-6 text-muted-foreground text-sm">{t('home.comingSoon')}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-primary" />{t('home.purchase')}
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-center py-6 text-muted-foreground text-sm">{t('home.comingSoon')}</div></CardContent>
        </Card>
      </div>
    </div>
  );
}

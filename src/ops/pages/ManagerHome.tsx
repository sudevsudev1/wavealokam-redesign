import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useMyTasks } from '../hooks/useTasks';
import TaskRow from '../components/TaskRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuickPurchaseDock from '../components/QuickPurchaseDock';

export default function ManagerHome() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const { data: tasks, isLoading } = useMyTasks();
  const navigate = useNavigate();

  const activeTasks = tasks?.filter(t => !['Done', 'Cancelled'].includes(t.status)) || [];

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold truncate">
        {t('home.welcome')}, {profile?.displayName}
      </h1>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t('home.myTasks')} ({activeTasks.length})
          </CardTitle>
          <button onClick={() => navigate('/ops/tasks')} className="text-[10px] text-primary hover:underline">
            View all →
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">{t('home.noTasks')}</div>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} />)}
              {activeTasks.length > 5 && (
                <button onClick={() => navigate('/ops/tasks')} className="text-[10px] text-primary hover:underline w-full text-center py-2">
                  +{activeTasks.length - 5} more →
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickPurchaseDock />
    </div>
  );
}
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useMyTasks } from '../hooks/useTasks';
import { getTranslatedField } from '../lib/translate';
import TaskRow from '../components/TaskRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, MessageSquare, ShoppingCart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManagerHome() {
  const { profile } = useOpsAuth();
  const { t, language } = useOpsLanguage();
  const { data: tasks, isLoading } = useMyTasks();
  const navigate = useNavigate();

  const activeTasks = tasks?.filter(t => !['Done', 'Cancelled'].includes(t.status)) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        {t('home.welcome')}, {profile?.displayName}
      </h1>

      {/* My Tasks */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t('home.myTasks')} ({activeTasks.length})
          </CardTitle>
          <button onClick={() => navigate('/ops/tasks')} className="text-xs text-primary hover:underline">
            View all →
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t('home.noTasks')}</div>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} />)}
              {activeTasks.length > 5 && (
                <button onClick={() => navigate('/ops/tasks')} className="text-xs text-primary hover:underline w-full text-center py-2">
                  +{activeTasks.length - 5} more →
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vector Dock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t('home.vector')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">{t('home.comingSoon')}</div>
        </CardContent>
      </Card>

      {/* Purchase Dock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t('home.purchase')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">{t('home.comingSoon')}</div>
        </CardContent>
      </Card>
    </div>
  );
}

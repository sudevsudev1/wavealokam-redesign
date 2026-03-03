import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, MessageSquare, ShoppingCart, Activity, AlertTriangle } from 'lucide-react';

export default function AdminHome() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        {t('home.welcome')}, {profile?.displayName}
      </h1>

      {/* At-Risk Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('home.overdueTasks'), value: '0', icon: AlertTriangle },
          { label: t('home.dueForOrder'), value: '0', icon: AlertTriangle },
          { label: t('home.delayedOrders'), value: '0', icon: AlertTriangle },
          { label: t('home.missingSyncs'), value: '0', icon: AlertTriangle },
        ].map((item) => (
          <Card key={item.label} className="bg-card">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t('home.myTasks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('home.noTasks')} — {t('home.comingSoon')}
          </div>
        </CardContent>
      </Card>

      {/* Live Operations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            {t('home.liveOps')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('home.comingSoon')}
          </div>
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('home.comingSoon')}
          </div>
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('home.comingSoon')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

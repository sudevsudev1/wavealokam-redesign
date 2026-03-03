import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, MessageSquare, ShoppingCart } from 'lucide-react';

export default function ManagerHome() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        {t('home.welcome')}, {profile?.displayName}
      </h1>

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

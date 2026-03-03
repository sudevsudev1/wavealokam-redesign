import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function OpsPlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useOpsLanguage();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Construction className="h-12 w-12 mb-4" />
        <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
        <p className="text-sm mt-1">{t('home.comingSoon')}</p>
      </CardContent>
    </Card>
  );
}

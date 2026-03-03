import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Button } from '@/components/ui/button';

export default function LanguageToggle() {
  const { language, setLanguage } = useOpsLanguage();

  return (
    <div className="flex items-center rounded-md border border-border overflow-hidden">
      <Button
        variant={language === 'en' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none px-3 h-8 text-xs font-semibold"
        onClick={() => setLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={language === 'ml' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none px-3 h-8 text-xs font-semibold"
        onClick={() => setLanguage('ml')}
      >
        ML
      </Button>
    </div>
  );
}

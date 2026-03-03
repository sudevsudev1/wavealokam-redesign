import { useOpsOffline } from '../contexts/OpsOfflineContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function NetworkStatus() {
  const { networkStatus, lastSavedAt } = useOpsOffline();
  const { t } = useOpsLanguage();

  const icon = {
    online: <Wifi className="h-4 w-4 text-green-600" />,
    offline: <WifiOff className="h-4 w-4 text-destructive" />,
    syncing: <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />,
  }[networkStatus];

  const label = {
    online: t('status.online'),
    offline: t('status.offline'),
    syncing: t('status.syncing'),
  }[networkStatus];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      <span>{label}</span>
      {lastSavedAt && (
        <span className="hidden sm:inline">
          · {t('status.savedAt')} {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}

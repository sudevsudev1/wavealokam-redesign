import React, { createContext, useContext, useEffect, useState } from 'react';
import { startSyncInterval, processSyncQueue } from '../lib/syncQueue';

type NetworkStatus = 'online' | 'offline' | 'syncing';

interface OfflineState {
  networkStatus: NetworkStatus;
  lastSavedAt: string | null;
  setLastSavedAt: (ts: string) => void;
  pendingSyncs: number;
}

const OpsOfflineContext = createContext<OfflineState | null>(null);

export function OpsOfflineProvider({ children }: { children: React.ReactNode }) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    const goOnline = async () => {
      setNetworkStatus('syncing');
      const { synced, failed } = await processSyncQueue();
      setPendingSyncs(failed);
      setNetworkStatus(failed > 0 ? 'syncing' : 'online');
    };
    const goOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const stopSync = startSyncInterval(30000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      stopSync();
    };
  }, []);

  return (
    <OpsOfflineContext.Provider value={{ networkStatus, lastSavedAt, setLastSavedAt, pendingSyncs }}>
      {children}
    </OpsOfflineContext.Provider>
  );
}

export function useOpsOffline() {
  const ctx = useContext(OpsOfflineContext);
  if (!ctx) throw new Error('useOpsOffline must be used within OpsOfflineProvider');
  return ctx;
}

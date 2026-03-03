import { supabase } from '@/integrations/supabase/client';
import { getSyncQueue, removeSyncEntry } from './offlineDb';

let syncing = false;

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getSyncQueue();
    for (const entry of queue) {
      try {
        const { table, operation, data } = entry as { table: string; operation: string; data: Record<string, unknown> };
        if (operation === 'insert') {
          const { error } = await supabase.from(table as never).insert(data as never);
          if (error) throw error;
        } else if (operation === 'update') {
          const { id: recordId, ...rest } = data;
          const { error } = await supabase.from(table as never).update(rest as never).eq('id', recordId as string);
          if (error) throw error;
        }
        await removeSyncEntry(entry.id as number);
        synced++;
      } catch {
        failed++;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export function startSyncInterval(intervalMs = 30000): () => void {
  const handle = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, intervalMs);
  return () => clearInterval(handle);
}

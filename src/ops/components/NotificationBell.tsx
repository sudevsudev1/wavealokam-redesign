import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Clock, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  related_reminder_id: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const { profile } = useOpsAuth();
  const { t } = useOpsLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('ops_notifications')
      .select('*')
      .eq('user_id', profile.userId)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('ops-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ops_notifications',
        filter: `user_id=eq.${profile.userId}`,
      }, (payload) => {
        const newNotif = payload.new as unknown as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 30));
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const markAsRead = async (id: string) => {
    await supabase.from('ops_notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('ops_notifications').update({ is_read: true } as any).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Clock className="h-3.5 w-3.5 text-primary" />;
      case 'follow_up': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-1.5 hover:bg-muted rounded-md transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 max-h-96 bg-background border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex gap-2 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!n.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="mt-1 shrink-0">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

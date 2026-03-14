import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PREVIEW_CACHE_RESET_FLAG = 'ops-preview-cache-reset-v2';

function isLovablePreviewHost() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname.includes('lovableproject.com') || hostname.startsWith('id-preview--');
}

function PwaInstallPromptContent() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 30 minutes
      if (r) {
        setInterval(() => r.update(), 1000 * 60 * 30);
      }
    },
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-lg shadow-lg p-3 flex items-center justify-between gap-2 max-w-sm mx-auto">
        <div className="flex items-center gap-2 text-xs">
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>New version available</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-2"
            onClick={() => updateServiceWorker(true)}
          >
            Update
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-primary-foreground/60 hover:text-primary-foreground"
            onClick={() => setNeedRefresh(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (installPrompt && !dismissed && window.location.pathname.startsWith('/ops')) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center justify-between gap-2 max-w-sm mx-auto">
        <div className="flex items-center gap-2 text-xs">
          <Download className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground/80">Install Ops for quick access</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleInstall}>
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-foreground/40"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default function PwaInstallPrompt() {
  const isPreviewHost = isLovablePreviewHost();

  useEffect(() => {
    if (!isPreviewHost || typeof window === 'undefined') return;
    if (sessionStorage.getItem(PREVIEW_CACHE_RESET_FLAG) === '1') return;

    sessionStorage.setItem(PREVIEW_CACHE_RESET_FLAG, '1');

    const resetPreviewCache = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
      } finally {
        window.location.reload();
      }
    };

    void resetPreviewCache();
  }, [isPreviewHost]);

  if (isPreviewHost) return null;
  return <PwaInstallPromptContent />;
}

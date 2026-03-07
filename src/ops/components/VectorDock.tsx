import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsOffline } from '../contexts/OpsOfflineContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, X, Send, Copy, MessageSquare, Globe, Loader2, ChevronDown, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const WHATSAPP_BASE = 'https://wa.me/?text=';

const MIN_W = 300;
const MIN_H = 350;
const DEFAULT_W = 400;
const DEFAULT_H = 600;

export default function VectorDock() {
  const { profile, isAdmin } = useOpsAuth();
  const { t, language } = useOpsLanguage();
  const { networkStatus } = useOpsOffline();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<'guest' | 'internal'>('guest');
  const [guestMessages, setGuestMessages] = useState<Msg[]>([]);
  const [internalMessages, setInternalMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position & size state (desktop only)
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 = not yet initialized
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dockRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'guest' ? guestMessages : internalMessages;
  const setMessages = mode === 'guest' ? setGuestMessages : setInternalMessages;

  // Button position state (for dragging the closed icon)
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 });
  const btnDragging = useRef(false);
  const btnDragOffset = useRef({ x: 0, y: 0 });
  const btnMoved = useRef(false);

  // Initialize position to bottom-right on first open
  useEffect(() => {
    if (open && pos.x === -1) {
      setPos({
        x: window.innerWidth - size.w - 12,
        y: window.innerHeight - size.h - 12,
      });
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, mode, minimized]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only on desktop
    if (window.innerWidth < 640) return;
    dragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  // Resize handlers
  const onResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (window.innerWidth < 640) return;
    resizing.current = true;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (dragging.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 40, clientY - dragOffset.current.y));
        setPos({ x: newX, y: newY });
      }
      if (resizing.current && dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        const newW = Math.max(MIN_W, clientX - rect.left);
        const newH = Math.max(MIN_H, clientY - rect.top);
        setSize({ w: newW, h: newH });
      }
    };
    const onUp = () => {
      dragging.current = false;
      resizing.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !profile) return;

    setInput('');
    const userMsg: Msg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    if (networkStatus === 'offline') {
      setMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Offline. Vector needs a live connection to query data. Please try again when online.' }]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ops-vector', {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          mode,
          branch_id: profile.branchId,
          user_id: profile.userId,
          is_admin: isAdmin,
        },
      });

      if (error) throw error;

      if (data?.error) {
        setMessages([...updatedMessages, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: data?.content || 'No response.' }]);
      }
    } catch (e) {
      console.error('Vector error:', e);
      setMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Failed to reach Vector. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mode, profile, isAdmin, networkStatus, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('vector.copied'));
  };

  const openWhatsApp = (text: string) => {
    window.open(`${WHATSAPP_BASE}${encodeURIComponent(text)}`, '_blank');
  };

  // Closed button drag handlers
  const onBtnDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    btnDragging.current = true;
    btnMoved.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const el = (e.currentTarget as HTMLElement).getBoundingClientRect();
    btnDragOffset.current = { x: clientX - el.left, y: clientY - el.top };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!btnDragging.current) return;
      btnMoved.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setBtnPos({
        x: Math.max(0, Math.min(window.innerWidth - 52, clientX - btnDragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 52, clientY - btnDragOffset.current.y)),
      });
    };
    const onUp = () => { btnDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // Floating button when closed
  if (!open) {
    const btnStyle: React.CSSProperties = btnPos.x >= 0
      ? { position: 'fixed', left: btnPos.x, top: btnPos.y, bottom: 'auto', right: 'auto' }
      : { position: 'fixed', bottom: 16, right: 12 };
    return (
      <div className="z-50 flex flex-col items-center gap-0.5" style={btnStyle}>
        <button
          onMouseDown={onBtnDragStart}
          onTouchStart={onBtnDragStart}
          onClick={() => { if (!btnMoved.current) setOpen(true); }}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Open Vector"
        >
          <img src="/images/vector-avatar.png" alt="Vector" className="h-10 w-10 rounded-full object-cover pointer-events-none" />
        </button>
        <span className="text-[9px] font-semibold text-foreground leading-tight bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm pointer-events-none">Vector</span>
      </div>
    );
  }

  // Minimized bar (desktop: positioned, mobile: fixed bottom)
  if (minimized) {
    return (
      <div
        ref={dockRef}
        className="fixed z-50 sm:rounded-xl shadow-2xl border border-border bg-background"
        style={{
          // Mobile: full width bottom bar
          ...(window.innerWidth < 640
            ? { left: 0, right: 0, bottom: 0 }
            : { left: pos.x, top: pos.y, width: size.w }),
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 sm:rounded-xl cursor-grab active:cursor-grabbing bg-primary/5"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <img src="/images/vector-avatar.png" alt="Vector" className="h-6 w-6 rounded-full object-cover" />
            <span className="font-bold text-sm">Vector</span>
            <span className="text-[10px] text-muted-foreground">
              {networkStatus === 'offline' ? '(Offline)' : 'Live'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(false)} className="p-1.5 hover:bg-muted rounded-md" title="Expand">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1.5 hover:bg-muted rounded-md" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full panel
  return (
    <div
      ref={dockRef}
      className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:rounded-xl sm:shadow-2xl sm:border sm:border-border"
      style={{
        ...(window.innerWidth >= 640
          ? { left: pos.x, top: pos.y, width: size.w, height: size.h }
          : {}),
      }}
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5 sm:rounded-t-xl sm:cursor-grab sm:active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <img src="/images/vector-avatar.png" alt="Vector" className="h-6 w-6 rounded-full object-cover" />
          <span className="font-bold text-sm">Vector</span>
          <span className="text-[10px] text-muted-foreground">
            {networkStatus === 'offline' ? '(Offline)' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-muted rounded-md" title="Minimize">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-muted rounded-md" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'guest' | 'internal')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-2">
          <TabsTrigger value="guest" className="text-xs gap-1">
            <Globe className="h-3 w-3" />
            {t('vector.guestTab')}
          </TabsTrigger>
          <TabsTrigger value="internal" className="text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            {t('vector.internalTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guest" className="flex-1 flex flex-col min-h-0 m-0">
          <ChatArea
            messages={guestMessages}
            messagesEndRef={messagesEndRef}
            mode="guest"
            onCopy={copyToClipboard}
            onWhatsApp={openWhatsApp}
            t={t}
          />
        </TabsContent>
        <TabsContent value="internal" className="flex-1 flex flex-col min-h-0 m-0">
          <ChatArea
            messages={internalMessages}
            messagesEndRef={messagesEndRef}
            mode="internal"
            onCopy={copyToClipboard}
            onWhatsApp={openWhatsApp}
            t={t}
          />
        </TabsContent>
      </Tabs>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2 items-center">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'guest' ? t('vector.guestPlaceholder') : t('vector.internalPlaceholder')}
          className="flex-1 text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="h-9 w-9 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Resize handle (desktop only) */}
      <div
        className="hidden sm:block absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
      >
        <svg className="w-4 h-4 text-muted-foreground/50" viewBox="0 0 16 16">
          <path d="M14 14L8 14L14 8Z" fill="currentColor" />
          <path d="M14 14L11 14L14 11Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

// ─── Chat area sub-component ───

function ChatArea({
  messages,
  messagesEndRef,
  mode,
  onCopy,
  onWhatsApp,
  t,
}: {
  messages: Msg[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  mode: 'guest' | 'internal';
  onCopy: (text: string) => void;
  onWhatsApp: (text: string) => void;
  t: (key: string) => string;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="space-y-2">
          <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {mode === 'guest' ? t('vector.guestEmpty') : t('vector.internalEmpty')}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {mode === 'internal' ? (
              <>
                <QuickChip text={t('vector.quickDueForOrder')} />
                <QuickChip text={t('vector.quickOverdue')} />
                <QuickChip text={t('vector.quickTodayReport')} />
              </>
            ) : (
              <>
                <QuickChip text={t('vector.quickRoomAvail')} />
                <QuickChip text={t('vector.quickCheckIn')} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}>
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1 [&_p]:mt-0 [&_ul]:my-1 [&_li]:my-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p>{msg.content}</p>
            )}
            {msg.role === 'assistant' && (
              <div className="flex gap-1 mt-2 pt-1.5 border-t border-border/50">
                <button
                  onClick={() => onCopy(msg.content)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-muted/80"
                >
                  <Copy className="h-3 w-3" /> {t('vector.copy')}
                </button>
                {mode === 'guest' && (
                  <button
                    onClick={() => onWhatsApp(msg.content)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-muted/80"
                  >
                    <Send className="h-3 w-3" /> WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

function QuickChip({ text }: { text: string }) {
  return (
    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full cursor-default">
      {text}
    </span>
  );
}
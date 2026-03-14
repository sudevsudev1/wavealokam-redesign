import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsOffline } from '../contexts/OpsOfflineContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, X, Send, Copy, MessageSquare, Loader2, Minimize2, GripHorizontal, Languages, Reply, Zap, ListPlus, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string; timestamp?: string };

const WHATSAPP_BASE = 'https://wa.me/?text=';

const MIN_W = 300;
const MIN_H = 350;
const DEFAULT_W = 400;
const DEFAULT_H = 600;

const CHAT_STORAGE_KEY = 'vector_chat_history';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function loadPersistedMessages(): { quick: Msg[]; internal: Msg[] } {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { quick: [], internal: [] };
    const data = JSON.parse(raw);
    const cutoff = new Date(Date.now() - THREE_DAYS_MS).toISOString();
    const filterRecent = (msgs: Msg[]) => msgs.filter(m => !m.timestamp || m.timestamp > cutoff);
    return {
      quick: filterRecent(data.quick || []),
      internal: filterRecent(data.internal || []),
    };
  } catch {
    return { quick: [], internal: [] };
  }
}

function persistMessages(quick: Msg[], internal: Msg[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ quick, internal }));
  } catch { /* quota exceeded */ }
}

export default function VectorDock() {
  const { profile, isAdmin } = useOpsAuth();
  const { t, language } = useOpsLanguage();
  const { networkStatus } = useOpsOffline();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<'quick' | 'internal'>('quick');

  // Load persisted messages
  const persisted = useRef(loadPersistedMessages());
  const [quickMessages, setQuickMessages] = useState<Msg[]>(persisted.current.quick);
  const [internalMessages, setInternalMessages] = useState<Msg[]>(persisted.current.internal);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; mode: 'quick' | 'internal' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Position & size state (desktop only)
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dockRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'quick' ? quickMessages : internalMessages;
  const setMessages = mode === 'quick' ? setQuickMessages : setInternalMessages;

  // Persist messages on change
  useEffect(() => {
    persistMessages(quickMessages, internalMessages);
  }, [quickMessages, internalMessages]);

  // Button position state
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 });
  const btnDragging = useRef(false);
  const btnDragOffset = useRef({ x: 0, y: 0 });
  const btnMoved = useRef(false);

  useEffect(() => {
    if (open && pos.x === -1) {
      setPos({
        x: window.innerWidth - size.w - 12,
        y: window.innerHeight - size.h - 12,
      });
    }
  }, [open]);

  // Auto-scroll to bottom when messages change or chat opens
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && !minimized) {
      requestAnimationFrame(() => {
        scrollToBottom();
        inputRef.current?.focus();
      });
    }
  }, [open, mode, minimized, scrollToBottom]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (window.innerWidth < 640) return;
    dragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    e.preventDefault();
  }, [pos]);

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
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 100, clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 40, clientY - dragOffset.current.y)),
        });
      }
      if (resizing.current && dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        setSize({
          w: Math.max(MIN_W, clientX - rect.left),
          h: Math.max(MIN_H, clientY - rect.top),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
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

  // Get the last assistant message content for context
  const getLastAssistantContent = useCallback((): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].content;
    }
    return null;
  }, [messages]);

  // Core send function
  const sendToVector = useCallback(async (text: string, options?: { systemInstruction?: string; displayLabel?: string }) => {
    if (!text.trim() || loading || !profile) return;

    const displayText = options?.displayLabel || text;
    const now = new Date().toISOString();
    const userMsg: Msg = { role: 'user', content: displayText, timestamp: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setReplyTo(null);
    setLoading(true);

    if (networkStatus === 'offline') {
      setMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Offline. Vector needs a live connection.', timestamp: now }]);
      setLoading(false);
      return;
    }

    try {
      const sendMessages = options?.systemInstruction
        ? [
            { role: 'system' as const, content: options.systemInstruction },
            { role: 'user' as const, content: text },
          ]
        : updatedMessages.map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('ops-vector', {
        body: {
          messages: sendMessages,
          mode: options?.systemInstruction ? 'direct' : 'internal',
          branch_id: profile.branchId,
          user_id: profile.userId,
          is_admin: isAdmin,
          ui_language: language,
        },
      });

      if (error) throw error;
      const responseNow = new Date().toISOString();
      if (data?.error) {
        setMessages([...updatedMessages, { role: 'assistant', content: `⚠️ ${data.error}`, timestamp: responseNow }]);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: data?.content || 'No response.', timestamp: responseNow }]);
      }
    } catch (e) {
      console.error('Vector error:', e);
      setMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Failed to reach Vector. Please try again.', timestamp: now }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, mode, profile, isAdmin, networkStatus, setMessages, language]);

  // Quick action instruction hints
  const quickActionHints: Record<string, string> = {
    en_to_ml: '📝 Paste or type the English text you want translated to Malayalam, then send.',
    ml_to_en: '📝 Paste or type the Malayalam text you want translated to English, then send.',
    guest_reply: '📝 Paste or type the guest message/query you want me to draft a reply for, then send.',
    add_task: '📝 Type a task description (e.g. "Clean room 102 before 3pm"), then send.',
    add_to_list: '📝 Type the items to add to the purchase list (e.g. "2kg rice, dish soap"), then send.',
    issue: '📝 Type the issue details (e.g. "room 102 AC not working"), then send.',
  };

  const quickActionInstructions: Record<string, string> = {
    en_to_ml: `Translate the following text from English to Malayalam. Return ONLY the translated text, nothing else. No explanation, no preamble.`,
    ml_to_en: `Translate the following text from Malayalam to English. Return ONLY the translated text, nothing else. No explanation, no preamble.`,
    guest_reply: `Write a professional, warm guest reply for Wavealokam (Kerala beach surf retreat). The user will provide a guest query or context. Output ONLY the reply text — no preamble, no "here's a draft", no meta-commentary. It should be ready to copy-paste into WhatsApp. Use full URLs (not markdown links). Include https://wavealokam.com/#itinerary for any planning queries. Be warm but not quirky.`,
  };

  // Apply pending action when user sends input
  const applyPendingAction = useCallback((text: string, actionKey: string) => {
    if (quickActionInstructions[actionKey]) {
      const labels: Record<string, string> = {
        en_to_ml: `🔄 EN→ML: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
        ml_to_en: `🔄 ML→EN: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
        guest_reply: `✍️ Guest Reply: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
      };
      sendToVector(text, { systemInstruction: quickActionInstructions[actionKey], displayLabel: labels[actionKey] });
    } else if (actionKey === 'add_task') {
      sendToVector(`[ADD_TASK] ${text}`);
    } else if (actionKey === 'add_to_list') {
      sendToVector(`[ADD_TO_PURCHASE_LIST] ${text}`);
    } else if (actionKey === 'issue') {
      sendToVector(text);
    }
  }, [sendToVector]);

  // Regular send — check for pending action first
  const sendMessage = useCallback(() => {
    const text = replyTo ? `[Replying to: "${replyTo.slice(0, 100)}..."]\n\n${input.trim()}` : input.trim();
    if (!text) return;

    if (pendingAction && pendingAction.mode === mode) {
      setPendingAction(null);
      applyPendingAction(text, pendingAction.action);
    } else {
      sendToVector(text);
    }
  }, [input, replyTo, sendToVector, pendingAction, mode, applyPendingAction]);

  // Quick action handlers
  const handleQuickAction = useCallback((action: 'en_to_ml' | 'ml_to_en' | 'guest_reply') => {
    const text = input.trim() || getLastAssistantContent() || '';
    if (!text) {
      // Show instruction and set pending action
      const now = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: quickActionHints[action], timestamp: now }]);
      setPendingAction({ action, mode });
      inputRef.current?.focus();
      return;
    }

    const labels: Record<string, string> = {
      en_to_ml: `🔄 EN→ML: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
      ml_to_en: `🔄 ML→EN: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
      guest_reply: `✍️ Guest Reply: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
    };

    sendToVector(text, { systemInstruction: quickActionInstructions[action], displayLabel: labels[action] });
  }, [input, getLastAssistantContent, sendToVector, mode, setMessages]);

  // Internal action handler
  const handleInternalAction = useCallback((actionKey: string, sendFn: (text: string) => void) => {
    const text = input.trim();
    if (!text) {
      const now = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: quickActionHints[actionKey] || '📝 Type your input, then send.', timestamp: now }]);
      setPendingAction({ action: actionKey, mode });
      inputRef.current?.focus();
      return;
    }
    sendFn(text);
  }, [input, mode, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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

  // ─── CLOSED: just the icon ───
  if (!open || minimized) {
    const btnStyle: React.CSSProperties = btnPos.x >= 0
      ? { position: 'fixed', left: btnPos.x, top: btnPos.y, bottom: 'auto', right: 'auto' }
      : { position: 'fixed', bottom: 16, right: 12 };
    return (
      <div className="z-50 flex flex-col items-center gap-0.5" style={btnStyle}>
        <button
          onMouseDown={onBtnDragStart}
          onTouchStart={onBtnDragStart}
          onClick={() => { if (!btnMoved.current) { setOpen(true); setMinimized(false); } }}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Open Vector"
        >
          <img src="/images/vector-avatar.png" alt="Vector" className="h-10 w-10 rounded-full object-cover pointer-events-none" />
        </button>
        <span className="text-[9px] font-semibold text-foreground leading-tight bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm pointer-events-none">Vector</span>
      </div>
    );
  }

  // ─── FULL PANEL ───
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5 sm:rounded-t-xl sm:cursor-grab sm:active:cursor-grabbing select-none shrink-0"
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
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'internal')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-2 shrink-0">
          <TabsTrigger value="quick" className="text-xs gap-1">
            <Zap className="h-3 w-3" />
            {t('vector.quickTab')}
          </TabsTrigger>
          <TabsTrigger value="internal" className="text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            {t('vector.internalTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="flex-1 flex flex-col min-h-0 m-0">
          <ChatArea
            messages={quickMessages}
            scrollContainerRef={scrollContainerRef}
            messagesEndRef={messagesEndRef}
            mode="quick"
            onCopy={copyToClipboard}
            onWhatsApp={openWhatsApp}
            onReply={(text) => { setReplyTo(text); inputRef.current?.focus(); }}
            t={t}
            isCurrentMode={mode === 'quick'}
          />
        </TabsContent>
        <TabsContent value="internal" className="flex-1 flex flex-col min-h-0 m-0">
          <ChatArea
            messages={internalMessages}
            scrollContainerRef={scrollContainerRef}
            messagesEndRef={messagesEndRef}
            mode="internal"
            onCopy={copyToClipboard}
            onWhatsApp={openWhatsApp}
            onReply={(text) => { setReplyTo(text); inputRef.current?.focus(); }}
            t={t}
            isCurrentMode={mode === 'internal'}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Action Buttons */}
      {mode === 'quick' && (
        <div className="border-t border-border px-2 py-1.5 flex gap-1.5 overflow-x-auto shrink-0">
          <QuickActionBtn label={t('vector.actionEnToMl')} icon={<Languages className="h-3 w-3" />} onClick={() => handleQuickAction('en_to_ml')} disabled={loading} />
          <QuickActionBtn label={t('vector.actionMlToEn')} icon={<Languages className="h-3 w-3" />} onClick={() => handleQuickAction('ml_to_en')} disabled={loading} />
          <QuickActionBtn label={t('vector.actionGuestReply')} icon={<Send className="h-3 w-3" />} onClick={() => handleQuickAction('guest_reply')} disabled={loading} />
        </div>
      )}
      {mode === 'internal' && (
        <div className="border-t border-border px-2 py-1.5 flex gap-1.5 overflow-x-auto shrink-0">
          <QuickActionBtn
            label={t('vector.addTask')}
            icon={<ClipboardList className="h-3 w-3" />}
            onClick={() => handleInternalAction('add_task', (text) => sendToVector(`[ADD_TASK] ${text}`))}
            disabled={loading}
          />
          <QuickActionBtn
            label={t('vector.addToList')}
            icon={<ListPlus className="h-3 w-3" />}
            onClick={() => handleInternalAction('add_to_list', (text) => sendToVector(`[ADD_TO_PURCHASE_LIST] ${text}`))}
            disabled={loading}
          />
          <QuickActionBtn
            label="Issue"
            icon={<Bot className="h-3 w-3" />}
            onClick={() => handleInternalAction('issue', (text) => sendToVector(text))}
            disabled={loading}
          />
          <QuickActionBtn
            label="Daily Report"
            icon={<ClipboardList className="h-3 w-3" />}
            onClick={() => sendToVector('Start my daily report for today. Walk me through it conversationally.')}
            disabled={loading}
          />
          <QuickActionBtn
            label="End Shift"
            icon={<X className="h-3 w-3" />}
            onClick={() => sendToVector('End my shift now.')}
            disabled={loading}
          />
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-3 py-1 bg-muted/50 border-t border-border flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Reply className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1">{replyTo.slice(0, 80)}...</span>
          <button onClick={() => setReplyTo(null)} className="shrink-0 hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2 items-end shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="flex-1 text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none min-h-9 max-h-32"
          rows={1}
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

// ─── Quick Action Button ───
function QuickActionBtn({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2.5 py-1.5 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
    >
      {icon} {label}
    </button>
  );
}

// ─── Chat area sub-component ───
function ChatArea({
  messages,
  scrollContainerRef,
  messagesEndRef,
  mode,
  onCopy,
  onWhatsApp,
  onReply,
  t,
  isCurrentMode,
}: {
  messages: Msg[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  mode: 'quick' | 'internal';
  onCopy: (text: string) => void;
  onWhatsApp: (text: string) => void;
  onReply: (text: string) => void;
  t: (key: string) => string;
  isCurrentMode: boolean;
}) {
  // Scroll to bottom when this tab becomes active
  useEffect(() => {
    if (isCurrentMode && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [isCurrentMode, messages.length, scrollContainerRef]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-end justify-center p-4 text-center">
        <div className="space-y-2 pb-4">
          <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {mode === 'quick' ? t('vector.quickEmpty') : t('vector.internalEmpty')}
          </p>
          {mode === 'internal' && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              <QuickChip text={t('vector.quickDueForOrder')} />
              <QuickChip text={t('vector.quickOverdue')} />
              <QuickChip text={t('vector.quickTodayReport')} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 min-h-0">
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            mode={mode}
            onCopy={onCopy}
            onWhatsApp={onWhatsApp}
            onReply={onReply}
            t={t}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// ─── Message Bubble with long-press ───
function MessageBubble({
  msg,
  mode,
  onCopy,
  onWhatsApp,
  onReply,
  t,
}: {
  msg: Msg;
  mode: 'quick' | 'internal';
  onCopy: (text: string) => void;
  onWhatsApp: (text: string) => void;
  onReply: (text: string) => void;
  t: (key: string) => string;
}) {
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Close actions on outside click
  useEffect(() => {
    if (!showActions) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showActions]);

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={bubbleRef}
        className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm select-text ${
          msg.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onContextMenu={(e) => { e.preventDefault(); setShowActions(true); }}
      >
        {msg.role === 'assistant' ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1 [&_p]:mt-0 [&_ul]:my-1 [&_li]:my-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        )}

        {/* Long-press action popup (both user and assistant) */}
        {showActions && (
          <div className={`absolute z-10 ${msg.role === 'user' ? 'right-0' : 'left-0'} -top-9 flex gap-1 bg-background border border-border rounded-lg shadow-lg px-1 py-1`}>
            <button
              onClick={() => { onCopy(msg.content); setShowActions(false); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded hover:bg-muted text-foreground"
            >
              <Copy className="h-3 w-3" /> {t('vector.copy')}
            </button>
            <button
              onClick={() => { onReply(msg.content); setShowActions(false); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded hover:bg-muted text-foreground"
            >
              <Reply className="h-3 w-3" /> {t('vector.reply')}
            </button>
            {msg.role === 'assistant' && mode === 'quick' && (
              <button
                onClick={() => { onWhatsApp(msg.content); setShowActions(false); }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded hover:bg-muted text-foreground"
              >
                <Send className="h-3 w-3" /> WA
              </button>
            )}
          </div>
        )}

        {/* Inline actions for assistant messages (always visible) */}
        {msg.role === 'assistant' && (
          <div className="flex gap-1 mt-2 pt-1.5 border-t border-border/50">
            <button
              onClick={() => onCopy(msg.content)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-muted/80"
            >
              <Copy className="h-3 w-3" /> {t('vector.copy')}
            </button>
            {mode === 'quick' && (
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
  );
}

function QuickChip({ text }: { text: string }) {
  return (
    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full cursor-default">
      {text}
    </span>
  );
}

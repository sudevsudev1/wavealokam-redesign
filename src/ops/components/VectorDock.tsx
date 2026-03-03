import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsOffline } from '../contexts/OpsOfflineContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, X, Send, Copy, MessageSquare, Globe, Loader2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const WHATSAPP_BASE = 'https://wa.me/?text=';

export default function VectorDock() {
  const { profile, isAdmin } = useOpsAuth();
  const { t, language } = useOpsLanguage();
  const { networkStatus } = useOpsOffline();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'guest' | 'internal'>('guest');
  const [guestMessages, setGuestMessages] = useState<Msg[]>([]);
  const [internalMessages, setInternalMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = mode === 'guest' ? guestMessages : internalMessages;
  const setMessages = mode === 'guest' ? setGuestMessages : setInternalMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, mode]);

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

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
        aria-label="Open Vector"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:bottom-3 sm:right-3 sm:w-[400px] sm:h-[600px] sm:rounded-xl sm:shadow-2xl sm:border sm:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5 sm:rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm">Vector</span>
          <span className="text-[10px] text-muted-foreground">
            {networkStatus === 'offline' ? '(Offline)' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-muted rounded-md">
            {/* On mobile show minimize, on desktop show X */}
            <ChevronDown className="h-4 w-4 sm:hidden" />
            <X className="h-4 w-4 hidden sm:block" />
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

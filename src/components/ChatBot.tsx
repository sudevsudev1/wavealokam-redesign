import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Drifter here. Digital representative, former booking engine anarchist, current dispenser of honest answers. Available in French, Russian, satire, and disappointment when you don't book.\n\nWhat can I help you figure out?"
};

const STORAGE_KEY = 'drifter-chat-messages';

const getStoredMessages = (): Message[] => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [INITIAL_MESSAGE];
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(getStoredMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  };
  useEffect(() => {
    if (isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({
        messages: userMessages
      })
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get response');
    }
    if (!resp.body) throw new Error('No response body');
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';
    const updateAssistant = (content: string) => {
      assistantContent = content;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > 1) {
          return prev.map((m, i) => i === prev.length - 1 ? {
            ...m,
            content: assistantContent
          } : m);
        }
        return [...prev, {
          role: 'assistant',
          content: assistantContent
        }];
      });
    };
    let streamDone = false;
    while (!streamDone) {
      const {
        done,
        value
      } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, {
        stream: true
      });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            updateAssistant(assistantContent + content);
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      await streamChat(newMessages.filter(m => m.role === 'user' || m.content !== messages[0].content));
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops, my brain just did a backflip and landed badly. Try again, or just WhatsApp us at +91 93238 58013 - humans are more reliable anyway! 😅"
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  return <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-center gap-1">
        <button onClick={() => setIsOpen(!isOpen)} className={cn('w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110', isOpen ? 'bg-foreground text-background' : 'bg-wave-orange text-white hover:shadow-[0_0_30px_hsl(var(--wave-orange)/0.6)]')} aria-label={isOpen ? 'Close chat' : 'Open chat'}>
          {isOpen ? <X className="w-6 h-6" /> : <img src="/images/drifter-avatar.webp" alt="Drifter" className="w-10 h-10 rounded-full object-cover" />}
          {!isOpen && <span className="absolute inset-0 rounded-full bg-wave-orange animate-ping opacity-30" />}
        </button>
        {!isOpen && <span className="text-[9px] font-semibold text-foreground leading-tight text-center max-w-[80px] bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">Instant Chat with Drifter</span>}
      </div>

      {/* Chat Window */}
      <div className={cn('fixed bottom-24 right-6 z-[79] w-[calc(100%-3rem)] max-w-md bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden', isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none')} style={{
      maxHeight: 'calc(100vh - 12rem)'
    }}>
        {/* Header */}
        <div className="bg-wave-orange text-white p-4 flex items-center gap-3">
          <img src="/images/drifter-avatar.webp" alt="Drifter" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1">
            <h3 className="font-bold">Drifter</h3>
            <p className="text-xs text-white/80">Your charmingly tactless beachside informant</p>
          </div>
          <button
            onClick={() => { setMessages([INITIAL_MESSAGE]); sessionStorage.removeItem(STORAGE_KEY); }}
            className="text-white/70 hover:text-white text-xs underline underline-offset-2 transition-colors"
            title="Start a new conversation"
          >
            New chat
          </button>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="h-80 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.map((message, index) => <div key={index} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2 text-sm', message.role === 'user' ? 'bg-wave-orange text-white rounded-br-md' : 'bg-card text-foreground border border-border rounded-bl-md')}>
               {message.role === 'assistant' ? <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0 [&>p>img]:rounded-xl [&>p>img]:my-2 [&>p>img]:max-w-[200px] [&_a]:font-bold [&_a]:underline [&_a]:text-[hsl(var(--wave-orange))] [&_a:hover]:opacity-80">
                    <ReactMarkdown components={{
                      img: ({ src, alt, ...props }) => (
                        <img src={src} alt={alt || 'Drifter'} className="rounded-xl my-2 max-w-[200px] w-auto" loading="lazy" {...props} />
                      ),
                      a: ({ href, children, ...props }) => (
                        <a href={href} target={href?.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer" className="font-bold underline text-[hsl(var(--wave-orange))] hover:opacity-80 transition-opacity" {...props}>{children}</a>
                      )
                    }}>{message.content}</ReactMarkdown>
                  </div> : message.content}
              </div>
            </div>)}
          {isLoading && messages[messages.length - 1]?.role === 'user' && <div className="flex justify-start">
              <div className="bg-card text-foreground border border-border rounded-2xl rounded-bl-md px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="flex-1 px-4 py-2 rounded-full border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-wave-orange/50 text-sm" disabled={isLoading} />
            <button type="submit" disabled={!input.trim() || isLoading} className="w-10 h-10 rounded-full bg-wave-orange text-white flex items-center justify-center hover:bg-wave-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>;
};
export default ChatBot;
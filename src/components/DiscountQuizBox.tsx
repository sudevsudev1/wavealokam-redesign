import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Mail, Loader2, X, GripVertical } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QuizConfirmationDialog from './QuizConfirmationDialog';

const DiscountQuizBox = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [isOverlappingText, setIsOverlappingText] = useState(false);
  const [isOverHiddenSection, setIsOverHiddenSection] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  
  const boxRef = useRef<HTMLDivElement>(null);

  // Close handler
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosed(true);
  };

  // Drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const currentX = position?.x ?? rect.left;
    const currentY = position?.y ?? rect.top;
    dragStartRef.current = { startX: clientX, startY: clientY, posX: currentX, posY: currentY };
    setIsDragging(true);
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - 280, dragStartRef.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + dy));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Mouse drag
  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch drag
  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const checkOverlap = useCallback(() => {
    if (!boxRef.current || position) return; // Skip overlap checks when manually positioned
    const boxRect = boxRef.current.getBoundingClientRect();
    const boxTop = boxRect.top;
    const boxBottom = boxRect.bottom;
    const boxLeft = boxRect.left;
    const boxRight = boxRect.right;

    // Check if overlapping with hidden sections
    const hiddenSectionSelectors = ['#scroll-video-section', '#surfboard-scroll-section', '#activities'];
    let overHiddenSection = false;
    hiddenSectionSelectors.forEach(selector => {
      const section = document.querySelector(selector);
      if (section) {
        const sectionRect = section.getBoundingClientRect();
        const verticalOverlap = !(sectionRect.bottom < boxTop || sectionRect.top > boxBottom);
        if (verticalOverlap) {
          overHiddenSection = true;
        }
      }
    });
    setIsOverHiddenSection(overHiddenSection);

    if (isExpanded || isHovered) {
      setIsOverlappingText(false);
      return;
    }

    const textSelectors = 'h1, h2, h3, h4, h5, h6, p, span, a, li, label, button';
    const textElements = document.querySelectorAll(textSelectors);
    let hasOverlap = false;
    textElements.forEach(element => {
      if (boxRef.current?.contains(element)) return;
      const rect = element.getBoundingClientRect();
      const elementText = element.textContent?.trim();
      if (elementText && rect.width > 0 && rect.height > 0) {
        const verticalOverlap = !(rect.bottom < boxTop || rect.top > boxBottom);
        const horizontalOverlap = rect.right > boxLeft && rect.left < boxRight;
        if (verticalOverlap && horizontalOverlap) {
          hasOverlap = true;
        }
      }
    });
    setIsOverlappingText(hasOverlap);
  }, [isExpanded, isHovered, position]);

  useEffect(() => {
    checkOverlap();
    const handleScroll = () => checkOverlap();
    const handleResize = () => checkOverlap();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    const interval = setInterval(checkOverlap, 500);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [checkOverlap]);

  const getOpacityClass = () => {
    if (isExpanded || isHovered) return 'opacity-100';
    if (!isExpanded && !isHovered && isOverHiddenSection) return 'opacity-20 hover:opacity-80';
    return 'opacity-50 hover:opacity-100';
  };

  // Validation
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[+]?[\d\s-]{8,}$/.test(phone);
  const isFormValid = guestName.trim() && isValidEmail(guestEmail) && isValidPhone(guestPhone);
  const whatsappNumber = '+918606164606';

  const getWhatsAppMessage = () => {
    const message = `Hey Wavealokam! I answered your two stupid questions. Now give me my discount 😂

Name: ${guestName}
Email: ${guestEmail}
Phone: ${guestPhone}

Q1 : What does Wavealokam mean?
A1 : ${answer1 || '(Not answered)'}

Q2 : What is the easiest way to get free breakfast from the owner Amardeep?
A2 : ${answer2 || '(Not answered)'}`;
    return encodeURIComponent(message);
  };

  const handleWhatsAppClick = () => {
    if (!isFormValid) {
      toast.error('Please fill in your name, email, and phone number');
      return;
    }
    window.open(`https://wa.me/${whatsappNumber}?text=${getWhatsAppMessage()}`, '_blank');
  };

  const handleEmailClick = async () => {
    if (!isFormValid) {
      toast.error('Please fill in your name, email, and phone number');
      return;
    }
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quiz-email', {
        body: {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim(),
          answer1: answer1.trim(),
          answer2: answer2.trim()
        }
      });
      if (error) {
        console.error('Error sending quiz email:', error);
        toast.error('Failed to send email. Please try again.');
        return;
      }
      if (!data?.success) {
        console.error('Quiz email send failed:', data?.error);
        toast.error(data?.error || 'Failed to send email');
        return;
      }
      setShowConfirmationDialog(true);
    } catch (err) {
      console.error('Error invoking edge function:', err);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isClosed) return null;

  const positionStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: 'auto' }
    : { bottom: '6.5rem', right: '0.5rem', top: 'auto' };

  return (
    <>
      <div
        ref={boxRef}
        className={`fixed transition-all duration-300 ease-in-out z-[70] ${getOpacityClass()} ${isDragging ? 'cursor-grabbing' : ''}`}
        style={positionStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`bg-gradient-to-br from-wave-orange/95 to-wave-orange rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm border-2 border-white/40 overflow-hidden transition-all duration-300 ${isExpanded ? 'w-80' : 'w-56 sm:w-64'}`}>
          {/* Drag handle + Close button row */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div
              className="cursor-grab active:cursor-grabbing p-1 text-white/50 hover:text-white/80 touch-none"
              onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
              onTouchStart={(e) => { handleDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-white/50 hover:text-white/80 transition-colors"
              aria-label="Close quiz box"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Header - Always visible */}
          <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-3 pt-0 flex items-center justify-between gap-2 text-white hover:bg-white/10 transition-colors">
            <span className="text-xs font-medium leading-tight text-left">
              Answer 2 simple questions to get an additional <span className="font-bold">10% off</span> on your total bill
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
          </button>

          {/* Expandable content */}
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 pt-0 space-y-3">
              {/* Guest Details */}
              <div className="space-y-2">
                <label className="text-white text-xs font-medium">Your Details *</label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your Name" className="bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm h-9" />
                <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Email Address" className="bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm h-9" />
                <Input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="Phone Number" className="bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm h-9" />
              </div>

              {/* Question 1 */}
              <div className="space-y-2">
                <label className="text-white text-xs font-medium">
                  Q1 : What does Wavealokam mean?
                </label>
                <Textarea value={answer1} onChange={e => setAnswer1(e.target.value)} placeholder="Your answer..." className="min-h-[50px] resize-none bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm" rows={2} />
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <label className="text-white text-xs font-medium">
                  Q2 : What hit Amardeep in the face one night? And why was the bat roaming around at night fearlessly?                    
                </label>
                <Textarea value={answer2} onChange={e => setAnswer2(e.target.value)} placeholder="Your answer..." className="min-h-[50px] resize-none bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm" rows={2} />
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleWhatsAppClick} disabled={!isFormValid} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-3 h-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-center leading-tight">
                    Send to our WhatsApp.<br />
                    Await confirmation!
                  </span>
                </Button>

                <Button onClick={handleEmailClick} disabled={isSendingEmail || !isFormValid} variant="outline" className="w-full bg-white/90 hover:bg-white text-gray-800 border-0 text-xs py-3 h-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>{isSendingEmail ? 'Sending...' : 'Send via Email'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <QuizConfirmationDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog} answer1={answer1} answer2={answer2} guestName={guestName} guestEmail={guestEmail} guestPhone={guestPhone} />
    </>
  );
};

export default DiscountQuizBox;

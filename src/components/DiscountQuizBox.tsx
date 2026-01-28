import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Mail } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const DiscountQuizBox = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  const whatsappNumber = '+919539800445';
  
  const getWhatsAppMessage = () => {
    const message = `Hey Wavealokam! I answered your two stupid questions. Now give me my discount 😂
Q1 : What does Wavealokam mean?
A1 : ${answer1 || '(Not answered)'}
Q2 : What is the easiest way to get free breakfast from the owner Amardeep?
A2 : ${answer2 || '(Not answered)'}`;
    return encodeURIComponent(message);
  };

  const getEmailSubject = () => {
    return encodeURIComponent("Hey Wavealokam! I answered your two stupid questions. Now give me my discount 😂");
  };

  const getEmailBody = () => {
    const body = `Q1 : What does Wavealokam mean?
A1 : ${answer1 || '(Not answered)'}
Q2 : What is the easiest way to get free breakfast from the owner Amardeep?
A2 : ${answer2 || '(Not answered)'}`;
    return encodeURIComponent(body);
  };

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${getWhatsAppMessage()}`, '_blank');
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:wavealokam@gmail.com?subject=${getEmailSubject()}&body=${getEmailBody()}`;
  };

  return (
    <div
      className={`fixed right-4 z-[70] transition-all duration-300 ease-in-out
        ${isExpanded ? 'opacity-100' : 'opacity-50 hover:opacity-100'}
      `}
      style={{ top: '33vh' }}
      onMouseEnter={() => !isExpanded && setIsExpanded(false)}
    >
      <div
        className={`bg-gradient-to-br from-wave-orange/90 to-wave-orange rounded-xl shadow-2xl backdrop-blur-sm border border-white/20 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'w-80' : 'w-64'
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between gap-2 text-white hover:bg-white/10 transition-colors"
        >
          <span className="text-xs font-medium leading-tight text-left">
            Answer 2 simple questions to get an additional <span className="font-bold">10% off</span> on your total bill
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          )}
        </button>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 pt-0 space-y-4">
            {/* Question 1 */}
            <div className="space-y-2">
              <label className="text-white text-xs font-medium">
                Q1 : What does Wavealokam mean?
              </label>
              <Textarea
                value={answer1}
                onChange={(e) => setAnswer1(e.target.value)}
                placeholder="Your answer..."
                className="min-h-[50px] resize-none bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm"
                rows={2}
              />
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <label className="text-white text-xs font-medium">
                Q2 : What is the easiest way to get free breakfast from the owner Amardeep?
              </label>
              <Textarea
                value={answer2}
                onChange={(e) => setAnswer2(e.target.value)}
                placeholder="Your answer..."
                className="min-h-[50px] resize-none bg-white/90 text-gray-800 placeholder:text-gray-500 border-0 text-sm"
                rows={2}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleWhatsAppClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-3 h-auto flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-center leading-tight">
                  Send to our WhatsApp.<br />
                  Await confirmation!
                </span>
              </Button>

              <Button
                onClick={handleEmailClick}
                variant="outline"
                className="w-full bg-white/90 hover:bg-white text-gray-800 border-0 text-xs py-3 h-auto flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Email</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountQuizBox;

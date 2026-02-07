import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface FAQItem {
  question: string;
  answer: string;
}

interface PillarFAQProps {
  title?: string;
  faqs: FAQItem[];
}

const PillarFAQ = ({ title = 'Frequently Asked Questions', faqs }: PillarFAQProps) => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-10">
          {title}
        </h2>
        
        <Accordion type="multiple" className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-border rounded-xl bg-muted/20 overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 text-left hover:no-underline hover:bg-muted/40 transition-colors">
                <span className="text-lg font-medium pr-4 text-foreground">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
                  {faq.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default PillarFAQ;

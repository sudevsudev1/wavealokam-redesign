import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface InternalLinksProps {
  title?: string;
  links: Array<{
    name: string;
    href: string;
    description?: string;
  }>;
}

const InternalLinks = ({ title = 'Explore More', links }: InternalLinksProps) => {
  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
          {title}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-[hsl(var(--wave-orange))] hover:shadow-md transition-all"
            >
              <div>
                <span className="font-semibold text-foreground group-hover:text-[hsl(var(--wave-orange))] transition-colors">
                  {link.name}
                </span>
                {link.description && (
                  <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[hsl(var(--wave-orange))] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InternalLinks;

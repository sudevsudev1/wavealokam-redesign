import { Link } from "react-router-dom";
import { format } from "date-fns";

interface BlogCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  publishedAt: string | null;
  keywords: string[];
}

const BlogCard = ({
  title,
  slug,
  excerpt,
  featuredImage,
  category,
  publishedAt,
  keywords,
}: BlogCardProps) => {
  const categoryColors: Record<string, string> = {
    surfing: "bg-wave-blue text-white",
    travel: "bg-wave-purple text-white",
    activities: "bg-wave-orange text-white",
    accommodation: "bg-secondary text-white",
    guide: "bg-primary text-primary-foreground",
    listicle: "bg-accent text-accent-foreground",
    opinion: "bg-muted text-muted-foreground",
    seasonal: "bg-wave-orange-light text-foreground",
  };

  return (
    <Link
      to={`/blog/${slug}`}
      className="group block bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all-smooth border border-border hover:border-primary/30"
    >
      {/* Featured Image */}
      <div className="relative aspect-video overflow-hidden">
        {featuredImage ? (
          <img
            src={featuredImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-orange flex items-center justify-center">
            <span className="text-4xl">🏄</span>
          </div>
        )}
        {/* Category Badge */}
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
            categoryColors[category] || "bg-muted text-muted-foreground"
          }`}
        >
          {category}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Date */}
        {publishedAt && (
          <time
            dateTime={publishedAt}
            className="text-sm text-muted-foreground mb-2 block"
          >
            {format(new Date(publishedAt), "MMMM d, yyyy")}
          </time>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
            {excerpt}
          </p>
        )}

        {/* Keywords as tags */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.slice(0, 3).map((keyword) => (
              <span
                key={keyword}
                className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default BlogCard;

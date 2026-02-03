import { Link } from "react-router-dom";
import { format } from "date-fns";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  category: string;
  publishedAt: string | null;
}

interface RelatedPostsProps {
  posts: RelatedPost[];
  currentSlug: string;
}

const RelatedPosts = ({ posts, currentSlug }: RelatedPostsProps) => {
  // Filter out current post and limit to 3
  const relatedPosts = posts
    .filter((post) => post.slug !== currentSlug)
    .slice(0, 3);

  if (relatedPosts.length === 0) return null;

  return (
    <aside className="mt-16 pt-12 border-t border-border">
      <h2 className="text-2xl font-bold text-foreground mb-8">
        More from Wavealokam
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {relatedPosts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="group block"
          >
            {/* Thumbnail */}
            <div className="aspect-video rounded-lg overflow-hidden mb-3">
              {post.featuredImage ? (
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-orange flex items-center justify-center">
                  <span className="text-2xl">🏄</span>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="uppercase tracking-wide font-medium text-primary">
                {post.category}
              </span>
              {post.publishedAt && (
                <>
                  <span>•</span>
                  <time dateTime={post.publishedAt}>
                    {format(new Date(post.publishedAt), "MMM d, yyyy")}
                  </time>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
          </Link>
        ))}
      </div>
    </aside>
  );
};

export default RelatedPosts;

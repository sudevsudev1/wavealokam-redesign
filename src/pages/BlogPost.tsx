import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Tag, Share2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import BlogSEO, { ArticleSchema } from "@/components/blog/BlogSEO";
import RelatedPosts from "@/components/blog/RelatedPosts";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCallback } from "react";

interface ImageData {
  url: string;
  alt: string;
  attribution?: string;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  images: unknown;
  category: string;
  published_at: string | null;
  keywords: string[];
  meta_title: string | null;
  meta_description: string | null;
}

// Type guard for images array
function isImageArray(value: unknown): value is ImageData[] {
  return Array.isArray(value) && value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "url" in item &&
      typeof (item as ImageData).url === "string"
  );
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Post not found");
      return data as BlogPostData;
    },
    enabled: !!slug,
  });

  // Fetch related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", post?.category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, featured_image, category, published_at")
        .eq("status", "published")
        .eq("category", post!.category)
        .order("published_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!post?.category,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
        <Button onClick={() => navigate("/blog")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Button>
      </div>
    );
  }

  const currentUrl = typeof window !== "undefined" ? window.location.href : `https://wavealokam.com/blog/${slug}`;

  return (
    <>
      <BlogSEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ""}
        keywords={post.keywords}
        image={post.featured_image || undefined}
        url={currentUrl}
        type="article"
        publishedTime={post.published_at || undefined}
        author="Wavealokam"
      />
      {post.published_at && (
        <ArticleSchema
          title={post.title}
          description={post.meta_description || post.excerpt || ""}
          image={post.featured_image || undefined}
          publishedTime={post.published_at}
          url={currentUrl}
        />
      )}

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <header className="relative">
          {post.featured_image ? (
            <div className="relative h-[50vh] md:h-[60vh]">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                <div className="container mx-auto max-w-3xl">
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blog
                  </Link>
                  <h1 className="text-display text-3xl md:text-5xl text-white mb-4">
                    {post.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                    <span className="px-3 py-1 bg-primary rounded-full text-primary-foreground font-medium uppercase tracking-wide text-xs">
                      {post.category}
                    </span>
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(post.published_at), "MMMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-orange py-16 px-4">
              <div className="container mx-auto max-w-3xl">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Blog
                </Link>
                <h1 className="text-display text-3xl md:text-5xl text-white mb-4">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                  <span className="px-3 py-1 bg-white/20 rounded-full font-medium uppercase tracking-wide text-xs">
                    {post.category}
                  </span>
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(post.published_at), "MMMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <article className="container mx-auto max-w-3xl px-4 py-12">
          {/* Share button */}
          <div className="flex justify-end mb-8">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Markdown Content - Styled like Origin Story section */}
          <div className="space-y-8">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-12 mb-6 underline decoration-2 underline-offset-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mt-10 mb-4 underline decoration-2 underline-offset-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-4 my-8 pl-6 list-disc">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="space-y-4 my-8 pl-6 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                    {children}
                  </li>
                ),
                a: ({ href, children }) => {
                  // Map internal links to actual routes or homepage hash sections
                  const linkMap: Record<string, string> = {
                    '/': '/',
                    '/rooms': '/#rooms',
                    '/booking': '/#rooms',
                    '/surf-school': '/#surf-school',
                    '/activities': '/#activities',
                    '/dining': '/#dining',
                  };
                  
                  // Check if it's an internal path that needs mapping
                  let mappedHref = href;
                  if (href && linkMap[href] !== undefined) {
                    mappedHref = linkMap[href];
                  }
                  
                  const isExternal = mappedHref?.startsWith('http');
                  const isHomepage = mappedHref === '/';
                  const isHashLink = mappedHref?.startsWith('/#');
                  
                  // For homepage and hash links, use native anchor for proper navigation
                  if (isHomepage || isHashLink) {
                    return (
                      <a 
                        href={mappedHref}
                        className="text-primary font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:decoration-[3px] transition-all"
                      >
                        {children}
                      </a>
                    );
                  }
                  
                  return (
                    <a 
                      href={mappedHref} 
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="text-primary font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:decoration-[3px] transition-all"
                    >
                      {children}
                    </a>
                  );
                },
                strong: ({ children }) => (
                  <span className="font-semibold text-foreground">{children}</span>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-6 my-8 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                img: ({ src, alt }) => (
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    className="w-full h-auto rounded-2xl my-8 shadow-lg"
                  />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Keywords */}
          {post.keywords.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Tag className="w-4 h-4" />
                <span className="font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((keyword) => (
                  <Link
                    key={keyword}
                    to={`/blog?search=${encodeURIComponent(keyword)}`}
                    className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {keyword}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Image Attribution */}
          {isImageArray(post.images) && post.images.length > 0 && (
            <div className="mt-8 text-xs text-muted-foreground">
              {post.images.map((img, i) =>
                img.attribution ? (
                  <p key={i}>{img.attribution}</p>
                ) : null
              )}
            </div>
          )}

          {/* Related Posts */}
          <RelatedPosts
            posts={relatedPosts.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              featuredImage: p.featured_image,
              category: p.category,
              publishedAt: p.published_at,
            }))}
            currentSlug={slug || ""}
          />
        </article>

        <Footer />
      </div>
    </>
  );
};

export default BlogPost;

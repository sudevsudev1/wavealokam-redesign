import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlogCard from "@/components/blog/BlogCard";
import BlogSEO, { BlogListSchema } from "@/components/blog/BlogSEO";
import Footer from "@/components/Footer";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string;
  published_at: string | null;
  keywords: string[];
}

const CATEGORIES = [
  { value: "all", label: "All Posts" },
  { value: "surfing", label: "Surfing" },
  { value: "travel", label: "Travel" },
  { value: "activities", label: "Activities" },
  { value: "stay", label: "Stay" },
];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, title, slug, excerpt, featured_image, category, published_at, keywords"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Filter posts by category and search
  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.keywords.some((k) =>
        k.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://wavealokam.com/blog";

  return (
    <>
      <BlogSEO
        title="How to Kerala - Beach Math for Humans | Wavealokam"
        description="Discover surf tips, travel guides, and authentic Varkala stories from Wavealokam. Learn about surfing in Kerala, local experiences, and adventure in South India."
        keywords={["Varkala blog", "surf Kerala", "travel India", "Wavealokam stories", "How to Kerala"]}
        url={currentUrl}
        type="website"
      />
      <BlogListSchema url={currentUrl} />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-gradient-orange text-white py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Wavealokam
            </Link>
            <h1 className="text-display-xl text-3xl md:text-5xl lg:text-6xl mb-4">
              How to Kerala
            </h1>
            <p className="text-xl md:text-2xl text-white/90 font-medium mb-2">
              Beach Math for Humans
            </p>
            <p className="text-lg text-white/90 max-w-2xl">
              Surf tips, travel guides, and honest stories from Varkala's cliff-side.
              No corporate fluff, just real talk about India's hidden surf paradise.
            </p>
          </div>
        </header>

        {/* Filters */}
        <div className="sticky top-0 z-10 bg-background border-b border-border py-4 px-4">
          <div className="container mx-auto max-w-5xl flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <main className="container mx-auto max-w-5xl px-4 py-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-4">
                {posts.length === 0
                  ? "No blog posts yet. Check back soon!"
                  : "No posts match your filters."}
              </p>
              {posts.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  featuredImage={post.featured_image}
                  category={post.category}
                  publishedAt={post.published_at}
                  keywords={post.keywords}
                />
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Blog;

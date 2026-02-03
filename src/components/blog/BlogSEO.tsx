import { useEffect } from "react";

interface BlogSEOProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
}

const BlogSEO = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = "website",
  publishedTime,
  author = "Wavealokam",
}: BlogSEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const updateMeta = (property: string, content: string, isProperty = false) => {
      const attrName = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attrName}="${property}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Basic meta tags
    updateMeta("description", description);
    if (keywords.length > 0) {
      updateMeta("keywords", keywords.join(", "));
    }

    // Open Graph tags
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:url", url, true);
    updateMeta("og:type", type, true);
    updateMeta("og:site_name", "Wavealokam", true);
    if (image) {
      updateMeta("og:image", image, true);
    }

    // Twitter Card tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    if (image) {
      updateMeta("twitter:image", image);
    }

    // Article-specific meta
    if (type === "article") {
      updateMeta("article:author", author, true);
      if (publishedTime) {
        updateMeta("article:published_time", publishedTime, true);
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // Cleanup function to reset title on unmount
    return () => {
      document.title = "Wavealokam - Surf Resort Varkala";
    };
  }, [title, description, keywords, image, url, type, publishedTime, author]);

  return null;
};

// Schema.org Article structured data component
export const ArticleSchema = ({
  title,
  description,
  image,
  publishedTime,
  url,
  author = "Wavealokam",
}: {
  title: string;
  description: string;
  image?: string;
  publishedTime: string;
  url: string;
  author?: string;
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image || "https://wavealokam.com/og-image.jpg",
    datePublished: publishedTime,
    author: {
      "@type": "Organization",
      name: author,
      url: "https://wavealokam.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Wavealokam",
      logo: {
        "@type": "ImageObject",
        url: "https://wavealokam.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// Blog listing page schema
export const BlogListSchema = ({ url }: { url: string }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Wavealokam Blog",
    description: "Surf, travel, and adventure stories from Varkala, Kerala",
    url: url,
    publisher: {
      "@type": "Organization",
      name: "Wavealokam",
      logo: {
        "@type": "ImageObject",
        url: "https://wavealokam.com/logo.png",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default BlogSEO;

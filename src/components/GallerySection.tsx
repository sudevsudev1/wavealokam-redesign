import { useState } from 'react';
import { ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { galleryCatalog, type CatalogFolder } from '@/data/imageCatalog';

const GallerySection = () => {
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{folder: CatalogFolder; index: number;} | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
  };

  const openLightbox = (folder: CatalogFolder, index: number) => {
    setLightbox({ folder, index });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightbox(null);
    document.body.style.overflow = '';
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightbox) return;
    const len = lightbox.folder.images.length;
    const newIndex =
      direction === 'prev'
        ? (lightbox.index - 1 + len) % len
        : (lightbox.index + 1) % len;
    setLightbox({ ...lightbox, index: newIndex });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!lightbox) return;
    if (e.key === 'ArrowLeft') navigateLightbox('prev');
    if (e.key === 'ArrowRight') navigateLightbox('next');
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <section
      id="gallery"
      className="min-h-screen bg-background py-20 px-4 md:px-8"
      onKeyDown={handleKeyDown}
      tabIndex={0}>

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Gallery
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The Visual Argument for Booking Right Now. Browse at your own emotional risk. Click to spiral.
          </p>
        </div>

        {/* Folders */}
        <div className="space-y-4">
          {galleryCatalog.map((folder) => (
            <div
              key={folder.id}
              className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">

              {/* Folder Header */}
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-accent/50 transition-colors">
                <div className="text-left">
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                    {folder.folderTitle}
                  </h3>
                  {folder.description && (
                    <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                      {folder.description}
                    </p>
                  )}
                  <p className="text-muted-foreground/60 text-xs mt-2">
                    {folder.images.length === 0
                      ? 'Coming soon...'
                      : `${folder.images.length} photos`}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-6 h-6 text-muted-foreground transition-transform duration-300',
                    expandedFolder === folder.id && 'rotate-180'
                  )}
                />
              </button>

              {/* Folder Content - Thumbnails Grid */}
              <div
                className={cn(
                  'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4 transition-all duration-300 overflow-hidden',
                  expandedFolder === folder.id
                    ? 'max-h-[2000px] opacity-100'
                    : 'max-h-0 opacity-0 p-0'
                )}>
                {folder.images.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    Photos coming soon. Check back later!
                  </div>
                ) : (
                  folder.images.map((image, index) => (
                    <button
                      key={image.path}
                      onClick={() => openLightbox(folder, index)}
                      className="aspect-square rounded-lg overflow-hidden group relative">
                      <img
                        src={image.path}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}>

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.folder.images[lightbox.index].path}
              alt={lightbox.folder.images[lightbox.index].alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            {/* Title + Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm text-center max-w-[80vw]">
              <span className="block truncate">{lightbox.folder.images[lightbox.index].title}</span>
              <span className="text-white/60 text-xs">{lightbox.index + 1} / {lightbox.folder.images.length}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </div>
      )}
    </section>
  );
};

export default GallerySection;

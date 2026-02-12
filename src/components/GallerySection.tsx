import { useState } from 'react';
import { ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryFolder {
  id: string;
  title: string;
  description?: string;
  images: string[];
}

const galleryFolders: GalleryFolder[] = [
{
  id: 'rooftop',
  title: 'Rooftop: Beach Views Without Beach Prices',
  description: 'We\'re not ON the beach, we\'re strategically NEAR it. The rooftop vibes make up for the 180-meter walk.',
  images: [
  '/gallery/rooftop/rooftop01.webp',
  '/gallery/rooftop/rooftop02.webp',
  '/gallery/rooftop/rooftop03.webp',
  '/gallery/rooftop/rooftop04.webp',
  '/gallery/rooftop/rooftop05.webp',
  '/gallery/rooftop/rooftop06.webp',
  '/gallery/rooftop/rooftop07.webp']
},
{
  id: 'exterior',
  title: 'Exterior',
  description: 'First impressions that justify the flight. Click responsibly',
  images: [
  '/gallery/exterior/exterior02.webp',
  '/gallery/exterior/exterior05.webp',
  '/gallery/exterior/exterior03a.webp',
  '/gallery/exterior/exterior03b.webp',
  '/gallery/exterior/exterior03c.webp',
  '/gallery/exterior/exterior04.webp',
  '/gallery/exterior/exterior03.webp',
  '/gallery/exterior/exterior06.webp',
  '/gallery/exterior/exterior09.webp',
  '/gallery/exterior/exterior11.webp']

},
{
  id: 'surfing',
  title: 'Surfing',
  description: 'Therapy But Wetter - 10-12 sessions till you\'re decent. One session till you\'re hooked.',
  images: [
  '/activities/surfing-new/1.webp',
  '/activities/surfing-new/a09.webp',
  '/activities/surfing-new/a05.webp',
  '/activities/surfing-new/a04.webp',
  '/activities/surfing-new/a03.webp',
  '/activities/surfing-new/a06.webp',
  '/activities/surfing-new/a07.webp',
  '/activities/surfing-new/a08.webp',
  '/activities/surfing-new/a02.webp',
  '/activities/surfing-new/a10.webp',
  '/activities/surfing-new/a11.webp',
  '/activities/surfing-new/a01.webp',
  '/activities/surfing-new/2.webp',
  '/activities/surfing-new/3.webp',
  '/activities/surfing-new/4.webp',
  '/activities/surfing-new/5.webp',
  '/activities/surfing-new/6.webp',
  '/activities/surfing-new/7.webp',
  '/activities/surfing-new/8.webp',
  '/activities/surfing-new/9.webp',
  '/activities/surfing-new/10.webp',
  // From surfing folder
  '/activities/surfing/1.jpg',
  '/activities/surfing/2.jpg',
  '/activities/surfing/3.jpg',
  '/activities/surfing/4.jpg',
  '/activities/surfing/5.jpg',
  '/activities/surfing/6.jpg']

},
{
  id: 'double-room',
  title: 'Double Room',
  description: 'Compact Luxury - Everything you need, nothing you don\'t. The beautiful rooftop is our living room anyway.',
  images: [
  '/rooms/double-room/1.png',
  '/rooms/double-room/2.jpeg',
  '/rooms/double-room/3.png',
  '/rooms/double-room/4.png',
  '/rooms/double-room/5.png',
  '/rooms/double-room/6.png',
  '/rooms/double-room/7.png',
  '/rooms/double-room/8.png',
  '/rooms/double-room/9.png']

},
{
  id: 'king-room',
  title: 'King Room',
  description: 'Maximum space, maximum comfort, minimum chance you\'ll want to check out.',
  images: [
  '/rooms/king-room/1.png',
  '/rooms/king-room/2.png',
  '/rooms/king-room/3.png',
  '/rooms/king-room/4.png',
  '/rooms/king-room/5.png',
  '/rooms/king-room/6.png']

},
{
  id: 'legends',
  title: 'The Legends',
  description: "Loyalty Report Card - A+ to returnees. Incomplete to you, who wrote \"definitely returning soon\" in your review two years ago... Your homework's overdue. Can't you though?",
  images: [
  '/gallery/legends/legends01.webp',
  '/gallery/legends/legends02.webp',
  '/gallery/legends/legends03.webp',
  '/gallery/legends/legends04.webp',
  '/gallery/legends/legends05.webp',
  '/gallery/legends/legends06.webp',
  '/gallery/legends/legends07.webp',
  '/gallery/legends/legends08.webp',
  '/gallery/legends/legends09.webp',
  '/gallery/legends/legends10.webp',
  '/gallery/legends/legends11.webp',
  '/gallery/legends/legends12.webp',
  '/gallery/legends/legends13.webp',
  '/gallery/legends/legends14.webp',
  '/gallery/legends/legends15.webp',
  '/gallery/legends/legends16.webp',
  '/gallery/legends/legends17.webp',
  '/gallery/legends/legends18.webp']

}];


const GallerySection = () => {
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{images: string[];index: number;} | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
  };

  const openLightbox = (images: string[], index: number) => {
    setLightbox({ images, index });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightbox(null);
    document.body.style.overflow = '';
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightbox) return;
    const newIndex =
    direction === 'prev' ?
    (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length :
    (lightbox.index + 1) % lightbox.images.length;
    setLightbox({ ...lightbox, index: newIndex });
  };

  // Handle keyboard navigation
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
          {galleryFolders.map((folder) =>
          <div
            key={folder.id}
            className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">

              {/* Folder Header */}
              <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-accent/50 transition-colors">

                <div className="text-left">
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                    {folder.title}
                  </h3>
                  {folder.description &&
                <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                      {folder.description}
                    </p>
                }
                  <p className="text-muted-foreground/60 text-xs mt-2">
                    {folder.images.length === 0 ?
                  'Coming soon...' :
                  `${folder.images.length} photos`}
                  </p>
                </div>
                <ChevronDown
                className={cn(
                  'w-6 h-6 text-muted-foreground transition-transform duration-300',
                  expandedFolder === folder.id && 'rotate-180'
                )} />

              </button>

              {/* Folder Content - Thumbnails Grid */}
              <div
              className={cn(
                'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4 transition-all duration-300 overflow-hidden',
                expandedFolder === folder.id ?
                'max-h-[2000px] opacity-100' :
                'max-h-0 opacity-0 p-0'
              )}>

                {folder.images.length === 0 ?
              <div className="col-span-full text-center py-12 text-muted-foreground">
                    Photos coming soon. Check back later!
                  </div> :

              folder.images.map((image, index) =>
              <button
                key={image}
                onClick={() => openLightbox(folder.images, index)}
                className="aspect-square rounded-lg overflow-hidden group relative">

                      <img
                  src={image}
                  alt={`${folder.title} ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy" />

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
              )
              }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox &&
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={closeLightbox}>

          {/* Close Button */}
          <button
          onClick={closeLightbox}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">

            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation - Previous */}
          <button
          onClick={(e) => {
            e.stopPropagation();
            navigateLightbox('prev');
          }}
          className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">

            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          {/* Main Image */}
          <div
          className="max-w-[90vw] max-h-[90vh] relative"
          onClick={(e) => e.stopPropagation()}>

            <img
            src={lightbox.images[lightbox.index]}
            alt={`Gallery image ${lightbox.index + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg" />

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          </div>

          {/* Navigation - Next */}
          <button
          onClick={(e) => {
            e.stopPropagation();
            navigateLightbox('next');
          }}
          className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">

            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </div>
      }
    </section>);

};

export default GallerySection;
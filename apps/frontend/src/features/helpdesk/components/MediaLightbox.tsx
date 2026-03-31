import React from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Download from 'yet-another-react-lightbox/plugins/download';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/plugins/counter.css';

type MediaSlide =
  | {
      src: string;
      alt: string;
      download: { url: string; filename: string };
    }
  | {
      type: 'video';
      width: number;
      height: number;
      poster?: string;
      controls: true;
      playsInline: true;
      sources: [{ src: string; type: string }];
      download: { url: string; filename: string };
    };

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  mimeType: string;
}

interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  media: MediaItem[];
  currentIndex: number;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  open,
  onClose,
  media,
  currentIndex,
}) => {
  const slides: MediaSlide[] = media.map(item => {
    if (item.type === 'video') {
      return {
        type: 'video',
        width: 1280,
        height: 720,
        poster: item.url,
        controls: true,
        playsInline: true,
        sources: [{ src: item.url, type: item.mimeType }],
        download: { url: item.url, filename: item.fileName },
      };
    }

    return {
      src: item.url,
      alt: item.fileName,
      download: { url: item.url, filename: item.fileName },
    };
  });

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={currentIndex}
      slides={slides}
      plugins={[Counter, Download, Video, Zoom]}
      counter={{ separator: ' de ' }}
      controller={{ closeOnBackdropClick: true }}
      carousel={{ finite: media.length <= 1 }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      video={{ controls: true, playsInline: true }}
      styles={{
        container: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
        },
      }}
    />
  );
};

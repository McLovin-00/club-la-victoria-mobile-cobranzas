import React from 'react';
import type { MessageAttachment } from '../types';
import { isImage, isVideo } from './mediaUtils';
import { Play } from 'lucide-react';

interface AttachmentThumbnailProps {
  attachment: MessageAttachment;
  onClick: () => void;
  previewUrl?: string | null;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  attachment,
  onClick,
  previewUrl,
}) => {
  const isImageFile = isImage(attachment.mimeType);
  const isVideoFile = isVideo(attachment.mimeType);

  return (
    <button
      type="button"
      className="relative w-[160px] overflow-hidden rounded-xl border bg-muted/30 text-left shadow-sm transition hover:shadow-md"
      onClick={previewUrl ? onClick : undefined}
      disabled={!previewUrl}
      aria-label={`Abrir ${attachment.filename}`}
    >
      <div className="relative h-[160px] w-full overflow-hidden bg-slate-100">
        {previewUrl && isImageFile ? (
          <img
            src={previewUrl}
            alt={attachment.filename}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}

        {previewUrl && isVideoFile ? (
          <video
            src={previewUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : null}

        {!previewUrl ? <div className="h-full w-full animate-pulse bg-slate-200" /> : null}

      {isVideoFile && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-3">
            <Play className="w-6 h-6 text-slate-700 fill-slate-700" />
          </div>
        </div>
      )}

        <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
      </div>

      <div className="border-t bg-background px-3 py-2">
        <p className="line-clamp-2 text-xs font-medium text-foreground">{attachment.filename}</p>
      </div>
    </button>
  );
};

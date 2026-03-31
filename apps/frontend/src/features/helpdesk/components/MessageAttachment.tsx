import React from 'react';
import type { MessageAttachment as MessageAttachmentType } from '../types';
import { isImage, isVideo, isAudio, getAttachmentUrl, formatFileSize } from './mediaUtils';
import { downloadProtectedFile } from './attachmentAsset';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { PaperClipIcon } from '@heroicons/react/24/outline';

interface MessageAttachmentProps {
  attachment: MessageAttachmentType;
  onOpenLightbox: (index: number) => void;
  index: number;
  previewUrl?: string | null;
}

export const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  attachment,
  onOpenLightbox,
  index,
  previewUrl,
}) => {
  const canOpenLightbox = index >= 0;

  if (isImage(attachment.mimeType)) {
    return (
      <AttachmentThumbnail
        attachment={attachment}
        previewUrl={previewUrl}
        onClick={() => {
          if (canOpenLightbox) {
            onOpenLightbox(index);
          }
        }}
      />
    );
  }

  if (isVideo(attachment.mimeType)) {
    return (
      <AttachmentThumbnail
        attachment={attachment}
        previewUrl={previewUrl}
        onClick={() => {
          if (canOpenLightbox) {
            onOpenLightbox(index);
          }
        }}
      />
    );
  }

  if (isAudio(attachment.mimeType)) {
    return (
      <AudioWaveformPlayer
        url={getAttachmentUrl(attachment)}
        protectedSource
      />
    );
  }

  // For documents and other types, show download link
  return (
    <button
      type="button"
      onClick={() => void downloadProtectedFile(getAttachmentUrl(attachment), attachment.filename)}
      className="inline-flex items-center gap-2 text-left text-blue-600 underline underline-offset-2 hover:text-blue-800 text-xs"
    >
      <PaperClipIcon className="w-4 h-4 shrink-0" /> {attachment.filename} ({formatFileSize(attachment.size)})
    </button>
  );
};

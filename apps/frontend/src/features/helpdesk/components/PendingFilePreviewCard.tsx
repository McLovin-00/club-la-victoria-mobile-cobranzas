import React, { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { formatFileSize, isAudio, isImage, isVideo } from './mediaUtils';

interface PendingFilePreviewCardProps {
  file: File;
  onRemove: () => void;
}

function useLocalObjectUrl(file: File) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return objectUrl;
}

export const PendingFilePreviewCard: React.FC<PendingFilePreviewCardProps> = ({ file, onRemove }) => {
  const previewUrl = useLocalObjectUrl(file);
  const mimeType = file.type || 'application/octet-stream';
  const imageFile = isImage(mimeType);
  const videoFile = isVideo(mimeType);
  const audioFile = isAudio(mimeType);

  return (
    <article className="rounded-2xl border bg-background p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {mimeType} · {formatFileSize(file.size)}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={onRemove}
          aria-label={`Quitar ${file.name}`}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {imageFile ? (
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {previewUrl ? (
            <img src={previewUrl} alt={file.name} className="h-48 w-full object-cover" />
          ) : (
            <div className="h-48 w-full animate-pulse bg-slate-100" />
          )}
        </div>
      ) : null}

      {videoFile ? (
        <div className="overflow-hidden rounded-xl border bg-black">
          {previewUrl ? (
            <video src={previewUrl} controls className="h-56 w-full bg-black object-contain" preload="metadata" />
          ) : (
            <div className="h-56 w-full animate-pulse bg-slate-900" />
          )}
        </div>
      ) : null}

      {audioFile && previewUrl ? <AudioWaveformPlayer url={previewUrl} /> : null}

      {!imageFile && !videoFile && !audioFile ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-4 text-sm text-foreground">
          <DocumentTextIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">Vista previa no disponible</p>
            <p className="truncate text-xs text-muted-foreground">
              El archivo se adjuntó correctamente y se enviará con el ticket.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {imageFile ? <PhotoIcon className="h-4 w-4" /> : null}
        {videoFile ? <FilmIcon className="h-4 w-4" /> : null}
        {audioFile ? <MusicalNoteIcon className="h-4 w-4" /> : null}
        <span>
          {imageFile
            ? 'Imagen lista para enviar'
            : videoFile
              ? 'Video listo para enviar'
              : audioFile
                ? 'Audio listo para enviar'
                : 'Archivo listo para enviar'}
        </span>
      </div>
    </article>
  );
};

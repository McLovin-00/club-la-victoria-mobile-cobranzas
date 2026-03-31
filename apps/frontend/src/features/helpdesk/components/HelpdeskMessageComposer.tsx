import React, { useRef } from 'react';
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PendingFilePreviewCard } from './PendingFilePreviewCard';
import { HELPDESK_FILE_ACCEPT } from '../hooks/useHelpdeskVoiceNote';

interface HelpdeskMessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  pendingFiles: File[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  isRecording: boolean;
  recordingError?: string;
  onToggleRecording: () => void | Promise<void>;
  error?: string;
  placeholder?: string;
  submitAriaLabel: string;
  emptyStateMessage?: string;
  className?: string;
}

export const HelpdeskMessageComposer: React.FC<HelpdeskMessageComposerProps> = ({
  value,
  onChange,
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  onSubmit,
  isSubmitting,
  isRecording,
  recordingError,
  onToggleRecording,
  error,
  placeholder = 'Mensaje…',
  submitAriaLabel,
  emptyStateMessage,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const canSubmit = isSubmitting || (!value.trim() && pendingFiles.length === 0);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!canSubmit) {
        formRef.current?.requestSubmit();
      }
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={className ?? 'space-y-3 border-t bg-gradient-to-t from-muted/20 to-background pt-4 pb-3'}
    >
      {/* Pending files preview */}
      {pendingFiles.length > 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <PaperClipIcon className="h-3.5 w-3.5" />
            Archivos adjuntos ({pendingFiles.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <li key={`${file.name}-${index}-${file.size}`}>
                <PendingFilePreviewCard file={file} onRemove={() => onRemoveFile(index)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Empty state */}
      {emptyStateMessage && !value.trim() && pendingFiles.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">{emptyStateMessage}</p>
      ) : null}

      {/* Error messages */}
      {error ? (
        <p className="text-center text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}

      {recordingError ? (
        <p className="text-center text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert">
          {recordingError}
        </p>
      ) : null}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={HELPDESK_FILE_ACCEPT}
        onChange={event => {
          if (event.target.files?.length) {
            onAddFiles(event.target.files);
            event.target.value = '';
          }
        }}
      />

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attach button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full hover:bg-muted transition-colors"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar archivos"
          disabled={isSubmitting}
        >
          <PaperClipIcon className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Voice recording button */}
        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'ghost'}
          size="icon"
          className={`shrink-0 h-10 w-10 rounded-full transition-all ${
            isRecording ? 'animate-pulse' : 'hover:bg-muted'
          }`}
          onClick={() => void onToggleRecording()}
          aria-pressed={isRecording}
          aria-label={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
          disabled={isSubmitting}
        >
          {isRecording ? (
            <StopIcon className="h-5 w-5" />
          ) : (
            <MicrophoneIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        {/* Textarea */}
        <Textarea
          value={value}
          onChange={event => onChange(event.target.value.slice(0, 5000))}
          onKeyDown={handleTextareaKeyDown}
          placeholder={placeholder}
          rows={1}
          className="min-h-[44px] max-h-32 flex-1 resize-none rounded-full border-muted focus:border-primary/50 focus:ring-primary/20 transition-all"
          aria-label="Cuerpo del mensaje"
          disabled={isSubmitting}
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          className={`shrink-0 h-10 w-10 rounded-full transition-all ${
            canSubmit
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-lg hover:scale-105 active:scale-95'
          }`}
          disabled={canSubmit}
          aria-label={submitAriaLabel}
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Recording indicator */}
      {isRecording ? (
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-full px-3 py-1.5 animate-in fade-in-0 duration-150">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Grabando… tocá el micrófono para terminar
        </div>
      ) : null}
    </form>
  );
};

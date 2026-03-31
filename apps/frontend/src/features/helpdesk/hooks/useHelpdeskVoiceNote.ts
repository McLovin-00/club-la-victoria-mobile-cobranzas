import { useCallback, useEffect, useRef, useState } from 'react';
import { Logger } from '@/lib/utils';

export const HELPDESK_FILE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

function pickRecorderMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
}

export interface UseHelpdeskVoiceNoteResult {
  isRecording: boolean;
  recordingError: string;
  toggleRecording: () => Promise<void>;
  dispose: () => void;
}

export function useHelpdeskVoiceNote(onFile: (file: File) => void): UseHelpdeskVoiceNoteResult {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const dispose = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch {
        // no-op
      }
      recorder.stop();
    }
  }, []);

  const startRecorder = useCallback(async () => {
    setRecordingError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Tu navegador no permite grabar audio.');
      return;
    }

    const mimeType = pickRecorderMime();
    if (!mimeType) {
      setRecordingError('No hay formato de audio compatible para grabar.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) {
          setRecordingError('La grabacion quedo vacia. Proba grabar de nuevo.');
          dispose();
          return;
        }

        const extension = recorder.mimeType.includes('webm') ? 'webm' : 'm4a';
        const file = new File([blob], `nota-de-voz-${Date.now()}.${extension}`, {
          type: recorder.mimeType,
        });
        onFile(file);
        dispose();
      };
      recorder.start(200);
      setIsRecording(true);
    } catch (error) {
      Logger.error('No se pudo acceder al micrófono', error);
      setRecordingError('No se pudo usar el micrófono (revisá permisos).');
      dispose();
    }
  }, [dispose, onFile]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecorder();
      return;
    }

    await startRecorder();
  }, [isRecording, startRecorder, stopRecorder]);

  useEffect(() => () => dispose(), [dispose]);

  return { isRecording, recordingError, toggleRecording, dispose };
}

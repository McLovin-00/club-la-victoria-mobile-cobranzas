import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useProtectedObjectUrl } from './attachmentAsset';

interface AudioWaveformPlayerProps {
  url: string;
  protectedSource?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  url,
  protectedSource = false,
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const { objectUrl, isLoading, error } = useProtectedObjectUrl(protectedSource ? url : null);
  const resolvedUrl = protectedSource ? objectUrl : url;

  useEffect(() => {
    if (!waveformRef.current || !resolvedUrl) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#CBD5E1',
      progressColor: '#3B82F6',
      cursorColor: '#1D4ED8',
      barWidth: 2,
      barGap: 2,
      barRadius: 3,
      height: 48,
      normalize: true,
      cursorWidth: 2,
      interact: true,
    });

    wavesurfer.load(resolvedUrl);

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [resolvedUrl]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    }
  };

  if (isLoading) {
    return <div className="h-[92px] w-full max-w-[380px] animate-pulse rounded-xl border bg-slate-100 sm:min-w-[280px]" />;
  }

  if (error || !resolvedUrl) {
    return (
      <div className="w-full max-w-[380px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:min-w-[280px]">
        No se pudo cargar el audio para vista previa.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[380px] rounded-xl border bg-slate-50 px-3 py-3 shadow-sm sm:min-w-[280px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div ref={waveformRef} className="h-[48px] w-full" />
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

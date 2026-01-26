import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/app/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react';

export function MusicPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, playNext, playPrevious, audioRef } = usePlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audioRef]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDownload = () => {
    if (currentTrack) {
      const a = document.createElement('a');
      a.href = currentTrack.url;
      a.download = currentTrack.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-50">
      <div className="max-w-screen-xl mx-auto">
        {/* Track info */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-white">{currentTrack.name}</div>
            <div className="text-sm text-zinc-400 truncate">
              {currentTrack.collection && currentTrack.album 
                ? `${currentTrack.collection} / ${currentTrack.album}`
                : currentTrack.album || currentTrack.collection || ''}
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-300 hover:text-white"
            title="Download track"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-400 w-12 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <span className="text-xs text-zinc-400 w-12">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={playPrevious}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-300 hover:text-white"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlayPause}
            className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
          </button>
          <button
            onClick={playNext}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-300 hover:text-white"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
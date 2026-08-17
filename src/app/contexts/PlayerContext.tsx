import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export interface Track {
  path: string;
  name: string;
  title?: string;  // Friendly display name
  trackNumber?: number;  // Sequential ordering
  url: string;
  album?: string;
  collection?: string;
  lyrics?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  currentIndex: number;
  isShuffle: boolean;
  playTrack: (track: Track, playlist?: Track[], stopAtEnd?: boolean) => void;
  playPlaylist: (tracks: Track[], startIndex?: number, stopAtEnd?: boolean, shuffle?: boolean) => void;
  togglePlayPause: () => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrevious: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [originalPlaylist, setOriginalPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playHistory, setPlayHistory] = useState<Track[]>([]);
  const [stopAtEnd, setStopAtEnd] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Guards the format fallback so m4a -> mp3 -> m4a can't loop forever.
  const triedFallbackRef = useRef(false);

  // Utility function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  /**
   * Start playback synchronously, inside the click that asked for it.
   *
   * iOS Safari only grants playback to a play() call made during the user
   * gesture. The effect below runs after the handler returns, by which point
   * the gesture is over and iOS rejects it with NotAllowedError -- the element
   * loads, reports 0:00 and never starts. Desktop browsers do not enforce this,
   * which is why the same build works on a Mac.
   */
  const startPlayback = (url: string) => {
    const el = audioRef.current;
    if (!el || !url) return;
    if (el.src !== url) el.src = url;
    // Rejection is expected and harmless when a later effect takes over.
    el.play().catch(() => {});
  };

  const playTrack = (track: Track, contextPlaylist?: Track[], shouldStopAtEnd: boolean = false) => {
    startPlayback(track.url);
    // If a playlist context is provided, use it; otherwise create a single-track playlist
    const newPlaylist = contextPlaylist || [track];
    const trackIndex = newPlaylist.findIndex(t => t.path === track.path);
    const index = trackIndex >= 0 ? trackIndex : 0;
    
    setOriginalPlaylist(newPlaylist);
    setPlaylist(newPlaylist);
    setCurrentIndex(index);
    setCurrentTrack(track);
    setIsPlaying(true);
    setStopAtEnd(shouldStopAtEnd);
    setIsShuffle(false); // Reset shuffle when playing a specific track
    
    // Add to history if it's a different track
    if (!playHistory.length || playHistory[playHistory.length - 1]?.path !== track.path) {
      setPlayHistory(prev => [...prev, track]);
    }
  };

  const playPlaylist = (tracks: Track[], startIndex: number = 0, shouldStopAtEnd: boolean = false, shuffle: boolean = false) => {
    if (tracks.length === 0) return;
    startPlayback((shuffle ? tracks[startIndex] : tracks[Math.min(startIndex, tracks.length - 1)])?.url);
    
    setOriginalPlaylist(tracks);
    
    let playlistToUse = tracks;
    let actualStartIndex = startIndex;
    
    if (shuffle) {
      setIsShuffle(true);
      // Shuffle but ensure the current track (if specified) starts first
      const startTrack = tracks[startIndex];
      const otherTracks = tracks.filter((_, idx) => idx !== startIndex);
      const shuffledOthers = shuffleArray(otherTracks);
      playlistToUse = [startTrack, ...shuffledOthers];
      actualStartIndex = 0;
    } else {
      setIsShuffle(false);
      actualStartIndex = Math.min(startIndex, tracks.length - 1);
    }
    
    setPlaylist(playlistToUse);
    setCurrentIndex(actualStartIndex);
    setCurrentTrack(playlistToUse[actualStartIndex]);
    setIsPlaying(true);
    setStopAtEnd(shouldStopAtEnd);
    
    // Add to history
    if (!playHistory.length || playHistory[playHistory.length - 1]?.path !== playlistToUse[actualStartIndex].path) {
      setPlayHistory(prev => [...prev, playlistToUse[actualStartIndex]]);
    }
  };

  const toggleShuffle = () => {
    if (!currentTrack || playlist.length === 0) return;
    
    const newShuffleState = !isShuffle;
    setIsShuffle(newShuffleState);
    
    if (newShuffleState) {
      // Shuffle: keep current track first, shuffle the rest
      const currentTrackInPlaylist = playlist[currentIndex];
      const remainingTracks = playlist.slice(currentIndex + 1);
      const previousTracks = playlist.slice(0, currentIndex);
      const allOtherTracks = [...remainingTracks, ...previousTracks];
      const shuffledOthers = shuffleArray(allOtherTracks);
      const newPlaylist = [currentTrackInPlaylist, ...shuffledOthers];
      
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
    } else {
      // Unshuffle: restore original order, find current track
      const currentTrackPath = currentTrack.path;
      const originalIndex = originalPlaylist.findIndex(t => t.path === currentTrackPath);
      
      if (originalIndex >= 0) {
        setPlaylist(originalPlaylist);
        setCurrentIndex(originalIndex);
      }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Only claim to be playing once the browser agrees; an ignored
        // rejection here leaves the button showing pause while nothing plays.
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Play was blocked:', err));
      }
    }
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    
    // If there's a next track in the playlist, play it
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentTrack(playlist[nextIndex]);
      setIsPlaying(true);
      
      // Add to history
      if (!playHistory.length || playHistory[playHistory.length - 1]?.path !== playlist[nextIndex].path) {
        setPlayHistory(prev => [...prev, playlist[nextIndex]]);
      }
    }
    // If stopAtEnd is true and we've reached the end, stop playing
    else if (stopAtEnd) {
      setIsPlaying(false);
    }
    // Otherwise loop back to the beginning
    else {
      setCurrentIndex(0);
      setCurrentTrack(playlist[0]);
      setIsPlaying(true);
      
      if (!playHistory.length || playHistory[playHistory.length - 1]?.path !== playlist[0].path) {
        setPlayHistory(prev => [...prev, playlist[0]]);
      }
    }
  };

  const playPrevious = () => {
    // First check if we're more than 3 seconds into the current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // Restart current track
      audioRef.current.currentTime = 0;
      return;
    }
    
    // If we have play history and we're not at the first item, go back in history
    if (playHistory.length > 1) {
      // Remove current track from history
      const newHistory = [...playHistory];
      newHistory.pop();
      setPlayHistory(newHistory);
      
      // Get previous track from history
      const previousTrack = newHistory[newHistory.length - 1];
      
      // Find it in the current playlist
      const prevIndex = playlist.findIndex(t => t.path === previousTrack.path);
      
      if (prevIndex >= 0) {
        setCurrentIndex(prevIndex);
        setCurrentTrack(playlist[prevIndex]);
      } else {
        // Track not in current playlist, just play it
        setCurrentTrack(previousTrack);
        setCurrentIndex(0);
        setPlaylist([previousTrack]);
      }
      setIsPlaying(true);
    }
    // Otherwise go to previous in playlist
    else if (playlist.length > 0) {
      const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentTrack(playlist[prevIndex]);
      setIsPlaying(true);
      
      if (!playHistory.length || playHistory[playHistory.length - 1]?.path !== playlist[prevIndex].path) {
        setPlayHistory(prev => [...prev, playlist[prevIndex]]);
      }
    }
  };

  // Auto-play when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current && isPlaying) {
      console.log('Loading track URL:', currentTrack.url);
      console.log('Track details:', {
        name: currentTrack.name,
        path: currentTrack.path,
        url: currentTrack.url
      });
      // Idempotent: if the gesture already started this track, leave it alone.
      // Reassigning src would reset it to 0:00.
      if (audioRef.current.src !== currentTrack.url) {
        audioRef.current.src = currentTrack.url;
      }
      if (audioRef.current.paused) {
        audioRef.current.play().catch(error => {
          console.error('Error playing track:', error);
          console.error('Failed URL:', currentTrack.url);
        });
      }
    }
  }, [currentTrack, isPlaying]);

  // Handle audio load errors by switching between the two published formats.
  // Every track ships as both <name>.m4a and <name>.mp3 in the same release, so
  // the alternate URL is just an extension swap -- no catalog lookup needed.
  // (There used to be a WAV fallback here; WAVs no longer live in the repo.)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset per track so a later failure can still retry the alternate format.
    triedFallbackRef.current = false;

    const handleError = () => {
      if (!currentTrack) return;

      console.error('Audio failed to load:', audio.error, currentTrack.url);

      if (triedFallbackRef.current) {
        console.error('Alternate format also failed; giving up on', currentTrack.name);
        return;
      }

      const current = audio.src || currentTrack.url;
      const alternate = current.endsWith('.m4a')
        ? current.replace(/\.m4a$/, '.mp3')
        : current.endsWith('.mp3')
          ? current.replace(/\.mp3$/, '.m4a')
          : null;

      if (!alternate || alternate === current) {
        console.error('No alternate format available for', currentTrack.name);
        return;
      }

      triedFallbackRef.current = true;
      console.log('Retrying with alternate format:', alternate);
      audio.src = alternate;
      audio.play().catch(err => {
        console.error('Alternate format failed to play:', err);
      });
    };

    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, [currentTrack]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [playlist, currentIndex]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playlist,
        currentIndex,
        isShuffle,
        playTrack,
        playPlaylist,
        togglePlayPause,
        toggleShuffle,
        playNext,
        playPrevious,
        audioRef,
      }}
    >
      {children}
      {/*
        playsInline: iOS otherwise wants to hand audio to its fullscreen player.
        preload="metadata": iOS ignores "auto" until a gesture anyway, and this
        avoids fetching whole tracks nobody asked to hear.
        crossOrigin is deliberately NOT set -- the release assets send no CORS
        headers, and requesting CORS would make the browser refuse the fetch.
      */}
      <audio ref={audioRef} playsInline preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
}

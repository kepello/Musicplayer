import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export interface Track {
  path: string;
  name: string;
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

  // Utility function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playTrack = (track: Track, contextPlaylist?: Track[], shouldStopAtEnd: boolean = false) => {
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
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
      audioRef.current.src = currentTrack.url;
      audioRef.current.play();
    }
  }, [currentTrack, isPlaying]);

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
      <audio ref={audioRef} />
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

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, constructGitUrl, CatalogTrack, Catalog } from '@/app/services/github';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import { ChevronLeft, Play, Download, Music, ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export function TrackView() {
  const { collectionName, albumName, trackName } = useParams<{ 
    collectionName: string;
    albumName?: string;
    trackName: string;
  }>();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [track, setTrack] = useState<CatalogTrack | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    async function loadTrack() {
      if (!collectionName || !trackName) return;
      
      setLoading(true);
      
      const catalogData = await getCatalog();
      if (!catalogData) {
        setLoading(false);
        return;
      }
      
      setCatalog(catalogData);
      
      // Find the collection (which is the album)
      const collection = catalogData.collections.find(c => c.name === collectionName);
      if (!collection) {
        setLoading(false);
        return;
      }
      
      // Find the track in the collection
      const foundTrack = collection.tracks.find(t => t.name === trackName);
      
      if (!foundTrack) {
        setLoading(false);
        return;
      }
      
      setTrack(foundTrack);
      
      // Build track list for playlist context
      // Sort by trackNumber if available
      const sortedTracks = [...collection.tracks].sort((a, b) => 
        (a.trackNumber || 0) - (b.trackNumber || 0)
      );
      
      const tracks: Track[] = sortedTracks
        .filter(t => t.mp3 || t.m4a || t.wav)
        .map(t => ({
          path: t.path,
          name: t.name,
          title: t.title,
          trackNumber: t.trackNumber,
          url: t.mp3 || t.m4a || (t.wav ? getRawFileUrl(t.wav) : ''),  // MP3/M4A are full URLs, WAV needs construction
          collection: collectionName,
        }));
      
      setAllTracks(tracks);
      setLoading(false);
    }
    
    loadTrack();
  }, [collectionName, albumName, trackName]);

  const handlePlay = () => {
    if (track?.mp3 || track?.m4a || track?.wav) {
      const trackPath = track.path;
      const url = track.mp3 || track.m4a || (track.wav && catalog ? constructGitUrl(track.wav, catalog) : '');
      
      if (url) {
        playTrack(
          {
            path: trackPath,
            name: track.name,
            title: track.title,
            trackNumber: track.trackNumber,
            url: url,
            collection: collectionName,
            lyrics: track.lyrics || undefined,
          },
          undefined, // No playlist context - play only this track
          true // Stop after this track finishes
        );
      }
    }
  };

  const handleDownload = (format?: 'mp3' | 'm4a' | 'wav') => {
    if (!track) return;
    
    // Download the actual music file
    if (format === 'wav' && track.wav && catalog) {
      const a = document.createElement('a');
      a.href = constructGitUrl(track.wav, catalog);
      a.download = `${track.name}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if ((format === 'mp3' || !format) && track.mp3) {
      const a = document.createElement('a');
      a.href = track.mp3;  // Already full URL
      a.download = `${track.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (format === 'm4a' && track.m4a) {
      const a = document.createElement('a');
      a.href = track.m4a;  // Already full URL
      a.download = `${track.name}.m4a`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const trackPath = track?.path || '';
  const isCurrentTrack = currentTrack?.path === trackPath;
  
  const backLink = `/collection/${encodeURIComponent(collectionName!)}`;
  const backText = collectionName;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-32">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading track...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <Link 
          to={backLink}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to {backText}
        </Link>

        <div className="mb-8">
          <div className="bg-zinc-900 rounded-lg p-6 mb-6">
            {track?.trackNumber && (
              <div className="text-sm text-zinc-500 mb-2">Track {track.trackNumber}</div>
            )}
            <h1 className="text-4xl font-bold mb-4">{track?.title || trackName}</h1>
            
            {track?.readme && (
              <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                <Markdown skipHtml>{stripHtmlFromMarkdown(track.readme)}</Markdown>
              </div>
            )}
          </div>
          
          {(track?.mp3 || track?.m4a || track?.wav) && (
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={handlePlay}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                title={isCurrentTrack && isPlaying ? 'Playing' : 'Play Track'}
              >
                <Play className="w-5 h-5 text-white" fill="currentColor" />
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
                  {track?.mp3 && (
                    <DropdownMenuItem onClick={() => handleDownload('mp3')} className="cursor-pointer">
                      <Download className="w-4 h-4" />
                      <span>MP3 <span className="text-zinc-400">(universal)</span></span>
                    </DropdownMenuItem>
                  )}
                  {track?.m4a && (
                    <DropdownMenuItem onClick={() => handleDownload('m4a')} className="cursor-pointer">
                      <Download className="w-4 h-4" />
                      <span>M4A <span className="text-zinc-400">(Apple)</span></span>
                    </DropdownMenuItem>
                  )}
                  {track?.wav && (
                    <DropdownMenuItem onClick={() => handleDownload('wav')} className="cursor-pointer">
                      <Download className="w-4 h-4" />
                      <span>WAV <span className="text-zinc-400">(lossless)</span></span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {track?.lyrics && (
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Lyrics</h2>
            <div className="text-zinc-300 whitespace-pre-wrap columns-1 lg:columns-2 lg:gap-8">{track.lyrics}</div>
          </div>
        )}

        {!track?.mp3 && !track?.m4a && (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-16 h-16 text-zinc-600 mb-4" />
            <div className="text-zinc-400">No audio file found</div>
          </div>
        )}
      </div>
    </div>
  );
}
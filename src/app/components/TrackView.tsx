import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogTrack } from '@/app/services/github';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import { ChevronLeft, Play, Download, Music } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function TrackView() {
  const { collectionName, albumName, trackName } = useParams<{ 
    collectionName: string;
    albumName?: string;
    trackName: string;
  }>();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [track, setTrack] = useState<CatalogTrack | null>(null);
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
      
      const catalog = await getCatalog();
      if (!catalog) {
        setLoading(false);
        return;
      }
      
      // Find the collection (which is the album)
      const collection = catalog.collections.find(c => c.name === collectionName);
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
      const tracks: Track[] = collection.tracks
        .filter(t => t.mp3)
        .map(t => ({
          path: t.path,
          name: t.name,
          url: getRawFileUrl(t.mp3!),
          collection: collectionName,
        }));
      
      setAllTracks(tracks);
      setLoading(false);
    }
    
    loadTrack();
  }, [collectionName, albumName, trackName]);

  const handlePlay = () => {
    if (track?.mp3) {
      const mp3Url = getRawFileUrl(track.mp3);
      const trackPath = track.path;
      
      playTrack(
        {
          path: trackPath,
          name: trackName!,
          url: mp3Url,
          collection: collectionName,
          lyrics: track.lyrics,
        },
        undefined, // No playlist context - play only this track
        true // Stop after this track finishes
      );
    }
  };

  const handleDownload = () => {
    // Download track playlist if available, otherwise generate it
    if (track?.playlist) {
      const a = document.createElement('a');
      a.href = getRawFileUrl(track.playlist);
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (track?.mp3 || track?.m4a) {
      // Generate track playlist on-the-fly with both formats
      let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
      if (track.m4a) {
        playlistContent += `\n#EXTINF:-1,${trackName} (M4A)\n${getRawFileUrl(track.m4a)}`;
      }
      if (track.mp3) {
        playlistContent += `\n#EXTINF:-1,${trackName} (MP3)\n${getRawFileUrl(track.mp3)}`;
      }
      playlistContent += '\n';
      const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const generatePlaylist = () => {
    // Generate playlist content for single track with both formats
    let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n\n';
    if (track?.m4a) {
      playlistContent += `#EXTINF:-1,${trackName} (M4A)\n`;
      playlistContent += `${getRawFileUrl(track.m4a)}\n\n`;
    }
    if (track?.mp3) {
      playlistContent += `#EXTINF:-1,${trackName} (MP3)\n`;
      playlistContent += `${getRawFileUrl(track.mp3)}\n`;
    }
    return playlistContent;
  };
  
  const handleDownloadPlaylist = () => {
    if (track?.playlist) {
      const a = document.createElement('a');
      a.href = getRawFileUrl(track.playlist);
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (track?.mp3) {
      // Generate playlist on-the-fly
      const playlistContent = generatePlaylist();
      const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
            <h1 className="text-4xl font-bold mb-4">{trackName}</h1>
            
            {track?.readme && (
              <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                <Markdown skipHtml>{stripHtmlFromMarkdown(track.readme)}</Markdown>
              </div>
            )}
          </div>
          
          {(track?.mp3 || track?.m4a) && (
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={handlePlay}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                title={isCurrentTrack && isPlaying ? 'Playing' : 'Play Track'}
              >
                <Play className="w-5 h-5 text-white" fill="currentColor" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                title="Download track playlist"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {track?.lyrics && (
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Lyrics</h2>
            <div className="text-zinc-300 whitespace-pre-wrap">{track.lyrics}</div>
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
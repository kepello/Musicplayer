import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, constructGitUrl, CatalogAlbum, Catalog } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List, Shuffle } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

export function AlbumView() {
  const { collectionName, albumName } = useParams<{ collectionName: string; albumName: string }>();
  const { playPlaylist } = usePlayer();
  const [album, setAlbum] = useState<CatalogAlbum | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    async function loadAlbum() {
      if (!collectionName || !albumName) return;
      
      setLoading(true);
      const catalogData = await getCatalog();
      
      if (!catalogData) {
        setLoading(false);
        return;
      }
      
      setCatalog(catalogData);
      
      // Since collections ARE albums, we're looking at a collection
      // The albumName in the route is actually a collection name
      const foundAlbum = catalogData.collections.find(c => c.name === albumName);
      if (!foundAlbum) {
        setLoading(false);
        return;
      }
      
      setAlbum(foundAlbum);
      
      // Build track list from album (which is a collection)
      // Sort by trackNumber if available
      const sortedTracks = [...foundAlbum.tracks].sort((a, b) => 
        (a.trackNumber || 0) - (b.trackNumber || 0)
      );
      
      const tracks: Track[] = sortedTracks
        .filter(track => track.mp3 || track.m4a || track.wav)
        .map(track => ({
          path: track.path,
          name: track.name,
          title: track.title,
          trackNumber: track.trackNumber,
          url: track.mp3 || track.m4a || (track.wav ? getRawFileUrl(track.wav) : ''),  // MP3/M4A are full URLs, WAV needs construction
          album: albumName,
          collection: collectionName,
        }));
      
      setAllTracks(tracks);
      setLoading(false);
    }
    
    loadAlbum();
  }, [collectionName, albumName]);

  const handleDownloadAlbum = (format: 'M4A' | 'MP3' | 'WAV') => {
    const zipUrl = format === 'WAV' ? album?.zipWAV : format === 'M4A' ? album?.zipM4A : album?.zipMP3;
    if (zipUrl) {
      const a = document.createElement('a');
      a.href = zipUrl;  // Already full URL
      a.download = `${albumName}-${format}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const generatePlaylist = () => {
    // Generate playlist content dynamically from tracks
    let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
    
    for (const track of allTracks) {
      const displayName = track.title || track.name;
      playlistContent += `\n#EXTINF:-1,${displayName}\n`;
      playlistContent += `${track.url}`;
    }
    playlistContent += '\n';
    
    return playlistContent;
  };
  
  const handleDownloadPlaylist = (format: 'M4A' | 'MP3') => {
    const playlistUrl = format === 'M4A' ? album?.playlistM4A : album?.playlistMP3;
    if (playlistUrl) {
      const a = document.createElement('a');
      a.href = getRawFileUrl(playlistUrl);
      a.download = `${albumName}-${format}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Generate playlist on-the-fly
      const playlistContent = generatePlaylist();
      const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${albumName}-${format}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-32">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading album...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <Link 
          to={`/collection/${encodeURIComponent(collectionName!)}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to {collectionName}
        </Link>

        <div className="mb-8">
          <div className="bg-zinc-900 rounded-lg overflow-hidden flex flex-col lg:flex-row">
            {album?.cover && (
              <div className="group w-full lg:w-96 h-96 flex-shrink-0 bg-zinc-800 relative">
                <img
                  src={getRawFileUrl(album.cover)}
                  alt={`${albumName} cover`}
                  className="w-full h-full object-cover"
                />
                {/* Button overlay on album cover */}
                {allTracks.length > 0 && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => playPlaylist(allTracks, 0)}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                      title="Play Album"
                    >
                      <Play className="w-6 h-6 text-white" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => playPlaylist(allTracks, 0, false, true)}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                      title="Shuffle Album"
                    >
                      <Shuffle className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={async () => {
                        // Download playlist - prefer MP3 format
                        if (album?.playlistMP3 || album?.playlistM4A) {
                          handleDownloadPlaylist(album?.playlistMP3 ? 'MP3' : 'M4A');
                        } else {
                          // Generate album playlist
                          let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
                          allTracks.forEach(track => {
                            const displayName = track.title || track.name;
                            playlistContent += `\n#EXTINF:-1,${displayName}\n${track.url}`;
                          });
                          playlistContent += '\n';
                          const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${albumName}-MP3.m3u8`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                      title="Download Playlist"
                    >
                      <List className="w-6 h-6 text-white" />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 p-6">
              <div className="text-sm text-zinc-400 mb-2">{collectionName}</div>
              <h1 className="text-4xl font-bold mb-4">{albumName}</h1>
              {album?.readme && (
                <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                  <Markdown skipHtml>{stripHtmlFromMarkdown(album.readme)}</Markdown>
                </div>
              )}
              
              {/* Play and Download options */}
              {allTracks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => playPlaylist(allTracks, 0)}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                    title="Play Album"
                  >
                    <Play className="w-5 h-5 text-white" fill="currentColor" />
                  </button>
                  <button
                    onClick={() => playPlaylist(allTracks, 0, false, true)}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                    title="Shuffle Album"
                  >
                    <Shuffle className="w-5 h-5 text-white" />
                  </button>
                  
                  {(album?.zipM4A || album?.zipMP3 || album?.playlistM4A || album?.playlistMP3 || allTracks.length > 0) && (
                    <>
                  {/* Mobile: Prioritize playlist (opens in native music app) */}
                  {isMobile && allTracks.length > 0 && (
                    <button
                      onClick={() => handleDownloadPlaylist(isIOS ? 'M4A' : 'MP3')}
                      className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                      title={isIOS ? "Opens in Apple Music" : isAndroid ? "Opens in your music player" : "Download playlist"}
                    >
                      <List className="w-5 h-5 text-white" />
                    </button>
                  )}
                  
                  {/* Desktop: Show both M4A and MP3 options */}
                  {!isMobile && (
                    <>
                      {album?.zipMP3 && (
                        <button
                          onClick={() => handleDownloadAlbum('MP3')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm"
                          title="Download MP3 ZIP - Universal compatibility, smaller size"
                        >
                          MP3 <span className="text-zinc-400">(universal)</span>
                        </button>
                      )}
                      {album?.zipM4A && (
                        <button
                          onClick={() => handleDownloadAlbum('M4A')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm"
                          title="Download M4A ZIP - Better quality, Apple devices"
                        >
                          M4A <span className="text-zinc-400">(Apple)</span>
                        </button>
                      )}
                      {album?.zipWAV && (
                        <button
                          onClick={() => handleDownloadAlbum('WAV')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm"
                          title="Download WAV ZIP - Lossless quality, largest size"
                        >
                          WAV <span className="text-zinc-400">(lossless)</span>
                        </button>
                      )}
                      {allTracks.length > 0 && (
                        <>
                          {album?.playlistM4A && (
                            <button
                              onClick={() => handleDownloadPlaylist('M4A')}
                              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                              title="Download M4A Playlist"
                            >
                              <List className="w-5 h-5 text-white" />
                            </button>
                          )}
                          {album?.playlistMP3 && (
                            <button
                              onClick={() => handleDownloadPlaylist('MP3')}
                              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                              title="Download MP3 Playlist"
                            >
                              <List className="w-5 h-5 text-white" />
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Mobile: Also show zip as secondary option */}
                  {isMobile && (album?.zipM4A || album?.zipMP3) && (
                    <button
                      onClick={() => handleDownloadAlbum(album?.zipM4A && isIOS ? 'M4A' : 'MP3')}
                      className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                      title="Download all files as ZIP"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {allTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-16 h-16 text-zinc-600 mb-4" />
            <div className="text-zinc-400">No tracks found</div>
          </div>
        ) : (
          <div className="space-y-2">
            {allTracks.map((trackData, index) => {
              const catalogTrack = album?.tracks.find(t => t.name === trackData.name);
              
              return (
                <div key={trackData.path} className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-500 font-mono text-sm w-8">
                      {trackData.trackNumber ? String(trackData.trackNumber).padStart(2, '0') : String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(albumName!)}/track/${encodeURIComponent(trackData.name)}`}
                      className="flex-1 flex items-center gap-4 group"
                    >
                      <Play className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                      <h3 className="font-medium group-hover:text-white transition-colors">
                        {trackData.title || trackData.name}
                      </h3>
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          playPlaylist(allTracks, index);
                        }}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="Play"
                      >
                        <Play className="w-5 h-5" fill="currentColor" />
                      </button>
                      {catalogTrack?.mp3 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const a = document.createElement('a');
                            a.href = catalogTrack.mp3!;
                            a.download = `${trackData.name}.mp3`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                          title="Download MP3 - Universal compatibility"
                        >
                          MP3
                        </button>
                      )}
                      {catalogTrack?.m4a && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const a = document.createElement('a');
                            a.href = catalogTrack.m4a!;
                            a.download = `${trackData.name}.m4a`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                          title="Download M4A - Better quality, Apple devices"
                        >
                          M4A
                        </button>
                      )}
                      {catalogTrack?.wav && catalog && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const a = document.createElement('a');
                            a.href = constructGitUrl(catalogTrack.wav!, catalog);
                            a.download = `${trackData.name}.wav`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                          title="Download WAV - Lossless quality"
                        >
                          WAV
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
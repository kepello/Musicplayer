import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, constructGitUrl, CatalogAlbum, Catalog } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List, Shuffle, ChevronDown, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import { StreamingLinks } from '@/app/components/StreamingLinks';

export function AlbumView() {
  const { collectionName, albumName } = useParams<{ collectionName: string; albumName: string }>();
  const { playPlaylist } = usePlayer();
  const [album, setAlbum] = useState<CatalogAlbum | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

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
        .filter(track => track.mp3 || track.m4a)
        .map(track => ({
          path: track.path,
          name: track.name,
          title: track.title,
          trackNumber: track.trackNumber,
          url: track.m4a || track.mp3 || '',  // Full release URLs
          album: albumName,
          collection: collectionName,
        }));
      
      setAllTracks(tracks);
      setLoading(false);
    }
    
    loadAlbum();
  }, [collectionName, albumName]);

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
              <h1 className="text-4xl font-bold mb-1">{album?.title || albumName}</h1>
              {album?.artist && (
                <p className="text-zinc-400 mb-4">{album.artist}</p>
              )}
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
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2"
                    title="Play Album"
                  >
                    <Play className="w-4 h-4 text-white" fill="currentColor" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={() => playPlaylist(allTracks, 0, false, true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2"
                    title="Shuffle Album"
                  >
                    <Shuffle className="w-4 h-4 text-white" />
                    <span>Shuffle</span>
                  </button>
                  
                  {(album?.playlistM4A || album?.playlistMP3 || allTracks.length > 0) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Download
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-white">
                        {allTracks.length > 0 && (album?.playlistMP3 || album?.playlistM4A) && (
                          <DropdownMenuItem onClick={() => handleDownloadPlaylist('MP3')} className="cursor-pointer hover:bg-zinc-800 text-white">
                            <List className="w-4 h-4" />
                            <span>Playlist <span className="text-zinc-500">(streaming)</span></span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <StreamingLinks links={album?.streaming} />
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
                      {(catalogTrack?.mp3 || catalogTrack?.m4a) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.preventDefault()}
                              className="px-3 py-1.5 text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-1.5"
                              title="Download track"
                            >
                              <Download className="w-4 h-4" />
                              <span className="hidden sm:inline">Download Track</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                            {catalogTrack?.mp3 && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  const a = document.createElement('a');
                                  a.href = catalogTrack.mp3!;
                                  a.download = `${trackData.name}.mp3`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="cursor-pointer hover:bg-zinc-800 text-white"
                              >
                                <Download className="w-3 h-3" />
                                <span className="text-xs">MP3</span>
                              </DropdownMenuItem>
                            )}
                            {catalogTrack?.m4a && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  const a = document.createElement('a');
                                  a.href = catalogTrack.m4a!;
                                  a.download = `${trackData.name}.m4a`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="cursor-pointer hover:bg-zinc-800 text-white"
                              >
                                <Download className="w-3 h-3" />
                                <span className="text-xs">M4A</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
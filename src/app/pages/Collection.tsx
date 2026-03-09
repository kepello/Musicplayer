import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, constructGitUrl, CatalogCollection, CatalogTrack, Catalog } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List, Archive, ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export function Collection() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const { playPlaylist } = usePlayer();
  const [collection, setCollection] = useState<CatalogCollection | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      if (!collectionName) return;
      
      setLoading(true);
      const catalogData = await getCatalog();
      
      if (!catalogData) {
        setLoading(false);
        return;
      }
      
      setCatalog(catalogData);
      
      // Find the collection in the catalog
      const foundCollection = catalogData.collections.find(c => c.name === collectionName);
      
      if (!foundCollection) {
        setLoading(false);
        return;
      }
      
      setCollection(foundCollection);
      
      // Build track list from collection (collections have tracks directly)
      // Sort by trackNumber if available
      const sortedTracks = [...foundCollection.tracks].sort((a, b) => 
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
          collection: collectionName,
        }));
      
      setAllTracks(tracks);
      setLoading(false);
    }
    
    loadCollection();
  }, [collectionName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-32">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading collection...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Collections
        </Link>

        <div className="mb-8">
          <div className="bg-zinc-900 rounded-lg overflow-hidden flex flex-col lg:flex-row">
            {collection?.cover && (
              <div className="w-full lg:w-96 h-96 flex-shrink-0 bg-zinc-800">
                <img
                  src={getRawFileUrl(collection.cover)}
                  alt={`${collectionName} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold">{collectionName}</h1>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      if (allTracks.length > 0) {
                        playPlaylist(allTracks, 0, true);
                      }
                    }}
                    disabled={allTracks.length === 0}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Play Album"
                  >
                    <Play className="w-5 h-5 text-white" fill="currentColor" />
                  </button>
                  <button
                    onClick={async () => {
                      if (allTracks.length === 0) return;
                      
                      // Detect device for format preference
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      const preferM4A = isMobile || /Mac/i.test(navigator.userAgent);
                      
                      // Download standalone streaming playlist
                      if (preferM4A && collection?.playlistM4A) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.playlistM4A);
                        a.download = `${collectionName}-M4A.m3u8`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else if (collection?.playlistMP3) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.playlistMP3);
                        a.download = `${collectionName}-MP3.m3u8`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else {
                        // Fallback: Generate playlist on-the-fly
                        let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
                        allTracks.forEach(track => {
                          playlistContent += `\n#EXTINF:-1,${track.name}\n${track.url}`;
                        });
                        playlistContent += '\n';
                        const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${collectionName}.m3u8`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }}
                    disabled={allTracks.length === 0}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download streaming playlist"
                  >
                    <List className="w-5 h-5 text-white" />
                  </button>
                  {(collection?.zipMP3 || collection?.zipM4A || collection?.zipWAV) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2">
                          <Archive className="w-4 h-4" />
                          Download Album
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-white">
                        {collection?.zipMP3 && (
                          <DropdownMenuItem
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = collection.zipMP3!;
                              a.download = `${collectionName}-MP3.zip`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="cursor-pointer hover:bg-zinc-800 text-white"
                          >
                            <Download className="w-4 h-4" />
                            <span>MP3 ZIP <span className="text-zinc-500">(universal)</span></span>
                          </DropdownMenuItem>
                        )}
                        {collection?.zipM4A && (
                          <DropdownMenuItem
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = collection.zipM4A!;
                              a.download = `${collectionName}-M4A.zip`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="cursor-pointer hover:bg-zinc-800 text-white"
                          >
                            <Download className="w-4 h-4" />
                            <span>M4A ZIP <span className="text-zinc-500">(Apple)</span></span>
                          </DropdownMenuItem>
                        )}
                        {collection?.zipWAV && (
                          <DropdownMenuItem
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = collection.zipWAV!;
                              a.download = `${collectionName}-WAV.zip`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="cursor-pointer hover:bg-zinc-800 text-white"
                          >
                            <Download className="w-4 h-4" />
                            <span>WAV ZIP <span className="text-zinc-500">(lossless)</span></span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {collection?.readme && (
                <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                  <Markdown skipHtml>{stripHtmlFromMarkdown(collection.readme)}</Markdown>
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
              // Get full catalog track data
              const catalogTrack = collection?.tracks.find(t => t.name === trackData.name);
              
              return (
                <div key={trackData.path} className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-500 font-mono text-sm w-8">
                      {trackData.trackNumber ? String(trackData.trackNumber).padStart(2, '0') : String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/track/${encodeURIComponent(trackData.name)}`}
                      className="flex-1 font-medium hover:text-white transition-colors"
                    >
                      {trackData.title || trackData.name}
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          playPlaylist(allTracks, index, true);
                        }}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="Play from here"
                      >
                        <Play className="w-5 h-5" fill="currentColor" />
                      </button>
                      {(catalogTrack?.mp3 || catalogTrack?.m4a || catalogTrack?.wav) && (
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
                            {catalogTrack?.wav && catalog && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  const a = document.createElement('a');
                                  a.href = constructGitUrl(catalogTrack.wav!, catalog);
                                  a.download = `${trackData.name}.wav`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="cursor-pointer hover:bg-zinc-800 text-white"
                              >
                                <Download className="w-3 h-3" />
                                <span className="text-xs">WAV</span>
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
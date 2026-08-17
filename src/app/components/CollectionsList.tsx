import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogCollection } from '@/app/services/github';
import { Folder, Music, Play, Download, List, Archive, Shuffle, ChevronDown } from 'lucide-react';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export function CollectionsList() {
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [collectionTracks, setCollectionTracks] = useState<Map<string, Track[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const { playPlaylist } = usePlayer();

  useEffect(() => {
    async function loadCollections() {
      setLoading(true);
      const catalog = await getCatalog();
      
      if (!catalog) {
        setLoading(false);
        return;
      }
      
      // Reverse the order of collections
      const reversedCollections = [...catalog.collections].reverse();
      setCollections(reversedCollections);
      
      // Convert catalog tracks to player tracks
      const tracksMap = new Map<string, Track[]>();
      for (const collection of reversedCollections) {
        const tracks: Track[] = [];
        
        // Collections have tracks directly (no nested albums)
        // Sort by trackNumber if available
        const sortedTracks = [...collection.tracks].sort((a, b) => 
          (a.trackNumber || 0) - (b.trackNumber || 0)
        );
        
        for (const track of sortedTracks) {
          if (track.mp3 || track.m4a) {
            const trackUrl = track.mp3 || track.m4a || '';
            console.log('Track URL constructed:', {
              trackName: track.name,
              mp3: track.mp3,
              m4a: track.m4a,
              finalUrl: trackUrl
            });
            tracks.push({
              path: track.path,
              name: track.name,
              title: track.title,
              trackNumber: track.trackNumber,
              url: trackUrl,
              collection: collection.name,
            });
          }
        }
        
        if (tracks.length > 0) {
          tracksMap.set(collection.name, tracks);
        }
      }
      setCollectionTracks(tracksMap);
      
      setLoading(false);
    }
    
    loadCollections();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-400">Loading collections...</div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Music className="w-16 h-16 text-zinc-600 mb-4" />
        <div className="text-zinc-400">No collections found</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => {
        const tracks = collectionTracks.get(collection.name) || [];
        return (
          <Link
            key={collection.path}
            to={`/collection/${encodeURIComponent(collection.name)}`}
            className="group block relative"
          >
            <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
              <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                <CollectionCover collection={collection} />
              </div>
              <div className="p-4 relative pb-14">
                <h3 className="font-medium group-hover:text-white transition-colors mb-3">
                  {collection.title || collection.name}
                </h3>
                {/* Buttons in bottom of card area */}
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tracks.length > 0) {
                        playPlaylist(tracks, 0, true); // Stop after album finishes
                      }
                    }}
                    disabled={tracks.length === 0}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                    title="Play Collection"
                  >
                    <Play className="w-3.5 h-3.5 text-white" fill="currentColor" />
                    <span className="text-white">Play</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tracks.length > 0) {
                        playPlaylist(tracks, 0, true, true); // Shuffle and stop after finishes
                      }
                    }}
                    disabled={tracks.length === 0}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                    title="Shuffle Collection"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Shuffle</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled={tracks.length === 0}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">Download</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                      {tracks.length > 0 && (
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Download standalone streaming playlist
                            if (collection.playlistMP3) {
                              const a = document.createElement('a');
                              a.href = getRawFileUrl(collection.playlistMP3);
                              a.download = `${collection.name}-MP3.m3u8`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else if (collection.playlistM4A) {
                              const a = document.createElement('a');
                              a.href = getRawFileUrl(collection.playlistM4A);
                              a.download = `${collection.name}-M4A.m3u8`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else {
                              // Fallback: Generate playlist on-the-fly
                              let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
                              tracks.forEach(track => {
                                playlistContent += `\n#EXTINF:-1,${track.name}\n${track.url}`;
                              });
                              playlistContent += '\n';
                              const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${collection.name}.m3u8`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="cursor-pointer hover:bg-zinc-800 text-white"
                        >
                          <List className="w-4 h-4" />
                          <span>Playlist <span className="text-zinc-500">(streaming)</span></span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CollectionCover({ collection }: { collection: CatalogCollection }) {
  if (!collection.cover) {
    return <Folder className="w-24 h-24 text-zinc-600" />;
  }

  return (
    <img
      src={getRawFileUrl(collection.cover)}
      alt="Collection cover"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}
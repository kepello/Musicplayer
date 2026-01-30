import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogCollection } from '@/app/services/github';
import { Folder, Music, Play, Download, List, Archive } from 'lucide-react';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

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
        for (const track of collection.tracks) {
          if (track.mp3) {
            tracks.push({
              path: track.path,
              name: track.name,
              url: getRawFileUrl(track.mp3),
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
              <div className="p-4 relative">
                <h3 className="font-medium group-hover:text-white transition-colors">
                  {collection.name}
                </h3>
                {/* Buttons in bottom right of text area */}
                <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tracks.length > 0) {
                        playPlaylist(tracks, 0, true); // Stop after album finishes
                      }
                    }}
                    disabled={tracks.length === 0}
                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Play Collection"
                  >
                    <Play className="w-4 h-4 text-white" fill="currentColor" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tracks.length === 0) return;
                      
                      // Detect device for format preference
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      const preferM4A = isMobile || /Mac/i.test(navigator.userAgent);
                      
                      // Download standalone streaming playlist
                      if (preferM4A && collection.playlistM4A) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.playlistM4A);
                        a.download = `${collection.name}-M4A.m3u8`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else if (collection.playlistMP3) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.playlistMP3);
                        a.download = `${collection.name}-MP3.m3u8`;
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
                    disabled={tracks.length === 0}
                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download streaming playlist"
                  >
                    <List className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Detect device for format preference
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      const preferM4A = isMobile || /Mac/i.test(navigator.userAgent);
                      
                      // Download ZIP file
                      if (preferM4A && collection.zipM4A) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.zipM4A);
                        a.download = `${collection.name}-M4A.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else if (collection.zipMP3) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.zipMP3);
                        a.download = `${collection.name}-MP3.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    disabled={!collection.zipM4A && !collection.zipMP3}
                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download complete album archive"
                  >
                    <Archive className="w-4 h-4 text-white" />
                  </button>
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
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getRepoContents, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { Folder, Music, Play, Download, List } from 'lucide-react';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

export function CollectionsList() {
  const [collections, setCollections] = useState<GitHubContent[]>([]);
  const [collectionTracks, setCollectionTracks] = useState<Map<string, Track[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const { playPlaylist } = usePlayer();

  useEffect(() => {
    async function loadCollections() {
      setLoading(true);
      const contents = await getRepoContents('');
      // Filter only directories, exclude special folders, and reverse the order
      const dirs = contents.filter(item => 
        item.type === 'dir' && 
        !item.name.startsWith('.') && 
        item.name !== 'node_modules'
      ).reverse();
      setCollections(dirs);
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
          <div key={collection.sha} className="group relative">
            <Link
              to={`/collection/${encodeURIComponent(collection.name)}`}
              className="block"
            >
              <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
                <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                  <CollectionCover path={collection.path} />
                  {/* Overlay buttons on hover */}
                  {tracks.length > 0 && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          playPlaylist(tracks, 0);
                        }}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                        title="Play Collection"
                      >
                        <Play className="w-6 h-6 text-white" fill="currentColor" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          // Generate collection playlist
                          let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n\n';
                          tracks.forEach(track => {
                            playlistContent += `#EXTINF:-1,${track.name}\n${track.url}\n\n`;
                          });
                          const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${collection.name}.m3u8`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                        title="Download Playlist"
                      >
                        <List className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium group-hover:text-white transition-colors">
                    {collection.name}
                  </h3>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function CollectionCover({ path }: { path: string }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    async function findCover() {
      const contents = await getRepoContents(path);
      const coverFile = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase().startsWith('cover') &&
          /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
      );
      
      if (coverFile) {
        setCoverUrl(getRawFileUrl(coverFile.path));
      }
    }
    
    findCover();
  }, [path]);

  if (!coverUrl) {
    return <Folder className="w-24 h-24 text-zinc-600" />;
  }

  return (
    <img
      src={coverUrl}
      alt="Collection cover"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}
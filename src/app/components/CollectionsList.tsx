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
      
      // Load tracks for each collection
      const tracksMap = new Map<string, Track[]>();
      for (const dir of dirs) {
        const dirContents = await getRepoContents(dir.path);
        const trackFolders = dirContents.filter(item => item.type === 'dir');
        
        const tracks = await Promise.all(
          trackFolders.map(async (folder) => {
            const folderPath = `${dir.path}/${folder.name}`;
            const folderContents = await getRepoContents(folderPath);
            const mp3 = folderContents.find(
              item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
            );
            
            if (mp3) {
              return {
                path: folderPath,
                name: folder.name,
                url: getRawFileUrl(mp3.path),
                collection: dir.name,
              } as Track;
            }
            return null;
          })
        );
        
        const validTracks = tracks.filter((t): t is Track => t !== null);
        if (validTracks.length > 0) {
          tracksMap.set(dir.name, validTracks);
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
            key={collection.sha}
            to={`/collection/${encodeURIComponent(collection.name)}`}
            className="group block relative"
          >
            <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
              <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                <CollectionCover path={collection.path} />
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
                        playPlaylist(tracks, 0);
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
                      // Generate collection playlist
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
                    }}
                    disabled={tracks.length === 0}
                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download Playlist"
                  >
                    <List className="w-4 h-4 text-white" />
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
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogCollection, CatalogTrack } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

export function Collection() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const { playPlaylist } = usePlayer();
  const [collection, setCollection] = useState<CatalogCollection | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      if (!collectionName) return;
      
      setLoading(true);
      const catalog = await getCatalog();
      
      if (!catalog) {
        setLoading(false);
        return;
      }
      
      // Find the collection in the catalog
      const foundCollection = catalog.collections.find(c => c.name === collectionName);
      
      if (!foundCollection) {
        setLoading(false);
        return;
      }
      
      setCollection(foundCollection);
      
      // Build track list from collection (collections have tracks directly)
      const tracks: Track[] = foundCollection.tracks
        .filter(track => track.mp3)
        .map(track => ({
          path: track.path,
          name: track.name,
          url: getRawFileUrl(track.mp3!),
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
              <h1 className="text-4xl font-bold mb-4">{collectionName}</h1>
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
              return (
                <div key={trackData.path} className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-500 font-mono text-sm w-8">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/track/${encodeURIComponent(trackData.name)}`}
                      className="flex-1 flex items-center gap-4 group"
                    >
                      <Play className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                      <h3 className="font-medium group-hover:text-white transition-colors">
                        {trackData.name}
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
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            // Generate single-track playlist
                            const playlistContent = `#EXTM3U\n#EXTENC:UTF-8\n\n#EXTINF:-1,${trackData.name}\n${trackData.url}\n`;
                            const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${trackData.name}.m3u8`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                          title="Download Playlist"
                        >
                          <List className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const a = document.createElement('a');
                            a.href = trackData.url;
                            a.download = `${trackData.name}.mp3`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                          title="Download MP3"
                        >
                          <Download className="w-5 h-5" />
                        </button>
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
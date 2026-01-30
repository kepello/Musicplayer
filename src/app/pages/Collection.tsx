import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogCollection, CatalogTrack } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List, Archive } from 'lucide-react';
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
                  <button
                    onClick={async () => {
                      // Detect device for format preference
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      const preferM4A = isMobile || /Mac/i.test(navigator.userAgent);
                      
                      // Download ZIP file
                      if (preferM4A && collection?.zipM4A) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.zipM4A);
                        a.download = `${collectionName}-M4A.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else if (collection?.zipMP3) {
                        const a = document.createElement('a');
                        a.href = getRawFileUrl(collection.zipMP3);
                        a.download = `${collectionName}-MP3.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    disabled={!collection?.zipM4A && !collection?.zipMP3}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download complete album archive"
                  >
                    <Archive className="w-5 h-5 text-white" />
                  </button>
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
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/track/${encodeURIComponent(trackData.name)}`}
                      className="flex-1 font-medium hover:text-white transition-colors"
                    >
                      {trackData.name}
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
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          // Download track playlist if available, otherwise generate it
                          if (catalogTrack?.playlist) {
                            const a = document.createElement('a');
                            a.href = getRawFileUrl(catalogTrack.playlist);
                            a.download = `${trackData.name}.m3u8`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else if (catalogTrack?.mp3 || catalogTrack?.m4a) {
                            // Generate track playlist on-the-fly
                            let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
                            if (catalogTrack.m4a) {
                              playlistContent += `\n#EXTINF:-1,${trackData.name} (M4A)\n${getRawFileUrl(catalogTrack.m4a)}`;
                            }
                            if (catalogTrack.mp3) {
                              playlistContent += `\n#EXTINF:-1,${trackData.name} (MP3)\n${getRawFileUrl(catalogTrack.mp3)}`;
                            }
                            playlistContent += '\n';
                            const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${trackData.name}.m3u8`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="Download track playlist"
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
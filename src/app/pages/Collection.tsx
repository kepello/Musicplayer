import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

export function Collection() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const { playPlaylist } = usePlayer();
  const [tracks, setTracks] = useState<GitHubContent[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      if (!collectionName) return;
      
      setLoading(true);
      const contents = await getRepoContents(collectionName);
      
      // Find README
      const readmeFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase() === 'readme.md'
      );
      if (readmeFile) {
        const content = await getFileContent(readmeFile.path);
        setReadme(stripHtmlFromMarkdown(content));
      }
      
      // Find cover
      const coverFile = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase().startsWith('cover') &&
          /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
      );
      if (coverFile) {
        setCoverUrl(getRawFileUrl(coverFile.path));
      }
      
      // Get track folders (directories)
      const dirs = contents.filter(item => item.type === 'dir');
      setTracks(dirs);
      
      // Load mp3 URLs for all tracks
      const tracksWithUrls = await Promise.all(
        dirs.map(async (dir) => {
          const dirPath = `${collectionName}/${dir.name}`;
          const dirContents = await getRepoContents(dirPath);
          const mp3 = dirContents.find(
            item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
          );
          
          if (mp3) {
            return {
              path: dirPath,
              name: dir.name,
              url: getRawFileUrl(mp3.path),
              collection: collectionName,
            } as Track;
          }
          return null;
        })
      );
      
      const validTracks = tracksWithUrls.filter((t): t is Track => t !== null);
      setAllTracks(validTracks);
      
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
            {coverUrl && (
              <div className="w-full lg:w-96 h-96 flex-shrink-0 bg-zinc-800">
                <img
                  src={coverUrl}
                  alt={`${collectionName} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-6">
              <h1 className="text-4xl font-bold mb-4">{collectionName}</h1>
              {readme && (
                <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                  <Markdown skipHtml>{readme}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-16 h-16 text-zinc-600 mb-4" />
            <div className="text-zinc-400">No tracks found</div>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => {
              const trackData = allTracks[index];
              return (
                <div key={track.sha} className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-500 font-mono text-sm w-8">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/track/${encodeURIComponent(track.name)}`}
                      className="flex-1 flex items-center gap-4 group"
                    >
                      <Play className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                      <h3 className="font-medium group-hover:text-white transition-colors">
                        {track.name}
                      </h3>
                    </Link>
                    {trackData && (
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
                            a.download = `${track.name}.mp3`;
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
                    )}
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
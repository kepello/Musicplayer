import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { ChevronLeft, Music, Play } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function AlbumView() {
  const { collectionName, albumName } = useParams<{ collectionName: string; albumName: string }>();
  const [tracks, setTracks] = useState<GitHubContent[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlbum() {
      if (!collectionName || !albumName) return;
      
      setLoading(true);
      const path = `${collectionName}/${albumName}`;
      const contents = await getRepoContents(path);
      
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
      setLoading(false);
    }
    
    loadAlbum();
  }, [collectionName, albumName]);

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
            {coverUrl && (
              <div className="w-full lg:w-96 h-96 flex-shrink-0 bg-zinc-800">
                <img
                  src={coverUrl}
                  alt={`${albumName} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-6">
              <div className="text-sm text-zinc-400 mb-2">{collectionName}</div>
              <h1 className="text-4xl font-bold mb-4">{albumName}</h1>
              {readme && (
                <div className="prose prose-invert max-w-none md:columns-2 md:gap-6">
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
            {tracks.map((track, index) => (
              <Link
                key={track.sha}
                to={`/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(albumName!)}/track/${encodeURIComponent(track.name)}`}
                className="group block"
              >
                <div className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors flex items-center gap-4">
                  <div className="text-zinc-500 font-mono text-sm w-8">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <Play className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                  <h3 className="flex-1 font-medium group-hover:text-white transition-colors">
                    {track.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
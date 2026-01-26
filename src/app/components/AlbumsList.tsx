import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { ChevronLeft, Folder, Music } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function AlbumsList() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [albums, setAlbums] = useState<GitHubContent[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlbums() {
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
      
      // Get albums (directories)
      const dirs = contents.filter(item => item.type === 'dir');
      setAlbums(dirs);
      setLoading(false);
    }
    
    loadAlbums();
  }, [collectionName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-400">Loading albums...</div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        Back to Collections
      </Link>

      <div className="mb-8">
        <div className="bg-zinc-900 rounded-lg overflow-hidden flex">
          {coverUrl && (
            <div className="w-96 h-96 flex-shrink-0 bg-zinc-800">
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
              <div className="prose prose-invert max-w-none">
                <Markdown skipHtml>{readme}</Markdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Music className="w-16 h-16 text-zinc-600 mb-4" />
          <div className="text-zinc-400">No albums found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <Link
              key={album.sha}
              to={`/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(album.name)}`}
              className="group"
            >
              <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
                <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                  <AlbumCover path={album.path} />
                </div>
                <div className="p-4">
                  <h3 className="font-medium group-hover:text-white transition-colors">
                    {album.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumCover({ path }: { path: string }) {
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
      alt="Album cover"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}
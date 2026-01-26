import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getRepoContents, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { Folder, Music } from 'lucide-react';

export function CollectionsList() {
  const [collections, setCollections] = useState<GitHubContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollections() {
      setLoading(true);
      const contents = await getRepoContents('');
      // Filter only directories
      const dirs = contents.filter(item => item.type === 'dir');
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => (
        <Link
          key={collection.sha}
          to={`/collection/${encodeURIComponent(collection.name)}`}
          className="group"
        >
          <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
            <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
              <CollectionCover path={collection.path} />
            </div>
            <div className="p-4">
              <h3 className="font-medium group-hover:text-white transition-colors">
                {collection.name}
              </h3>
            </div>
          </div>
        </Link>
      ))}
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

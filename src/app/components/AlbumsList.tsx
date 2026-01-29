import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog, getRawFileUrl, CatalogCollection, CatalogAlbum } from '@/app/services/github';
import { ChevronLeft, Folder, Music } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function AlbumsList() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [collection, setCollection] = useState<CatalogCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlbums() {
      if (!collectionName) return;
      
      setLoading(true);
      const catalog = await getCatalog();
      
      if (!catalog) {
        setLoading(false);
        return;
      }
      
      // Find the collection in the catalog
      // Since collections ARE albums, just show the collection details
      const foundCollection = catalog.collections.find(c => c.name === collectionName);
      
      if (foundCollection) {
        setCollection(foundCollection);
      }
      
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
          {collection?.cover && (
            <div className="w-96 h-96 flex-shrink-0 bg-zinc-800">
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
              <div className="prose prose-invert max-w-none">
                <Markdown skipHtml>{stripHtmlFromMarkdown(collection.readme)}</Markdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {!collection || collection.tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Music className="w-16 h-16 text-zinc-600 mb-4" />
          <div className="text-zinc-400">No albums found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Since collections ARE albums, show tracks instead */}
          <div className="col-span-full text-zinc-400">
            This collection contains {collection.tracks.length} tracks. View them in the collection page.
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumCover({ album }: { album: CatalogAlbum }) {
  if (!album.cover) {
    return <Folder className="w-24 h-24 text-zinc-600" />;
  }

  return (
    <img
      src={getRawFileUrl(album.cover)}
      alt="Album cover"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}
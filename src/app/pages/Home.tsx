import { CollectionsList } from '@/app/components/CollectionsList';
import { Music, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCatalog, getFileContent, getRawFileUrl } from '@/app/services/github';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function Home() {
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRootContent() {
      try {
        const catalog = await getCatalog();
        
        if (!catalog) {
          setError('Unable to load music catalog. The catalog.json file might be missing or inaccessible.');
          setLoading(false);
          return;
        }
        
        // Load README and cover from catalog (if provided)
        if (catalog.readme) {
          setReadme(stripHtmlFromMarkdown(catalog.readme));
        }
        
        if (catalog.cover) {
          setCoverUrl(getRawFileUrl(catalog.cover));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load content from GitHub. Please try again later.');
        setLoading(false);
      }
    }
    
    loadRootContent();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Inside Out</h1>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <AlertCircle className="mr-2" />
            <div className="text-zinc-400">{error}</div>
          </div>
        ) : (
          <>
            {(coverUrl || readme) && (
              <div className="mb-12 bg-zinc-900 rounded-lg overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-0">
                  {coverUrl && (
                    <div className="flex-shrink-0 w-full lg:w-96">
                      <img 
                        src={coverUrl} 
                        alt="Inside Out Cover" 
                        className="w-full h-96 object-cover"
                      />
                    </div>
                  )}
                  
                  {readme && (
                    <div className="flex-1 p-6">
                      <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                        <Markdown skipHtml>{readme}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <CollectionsList />
          </>
        )}
      </div>
    </div>
  );
}
import { CollectionsList } from '@/app/components/CollectionsList';
import { Music, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRepoContents, getFileContent, getRawFileUrl } from '@/app/services/github';
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
        const contents = await getRepoContents('');
        
        // Check if we got an empty array (likely rate limited)
        if (contents.length === 0) {
          setError('Unable to load content. This might be due to GitHub API rate limiting. Please try again in a few minutes, or add a GitHub token to increase the rate limit.');
          setLoading(false);
          return;
        }
        
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
            <div className="mb-8">
              {coverUrl && readme ? (
                <div className="bg-zinc-900 rounded-lg overflow-hidden flex">
                  <div className="w-96 h-96 flex-shrink-0 bg-zinc-800">
                    <img
                      src={coverUrl}
                      alt="Music collection cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 h-96 p-6 overflow-y-auto">
                    <div className="prose prose-invert max-w-none">
                      <Markdown skipHtml>{readme}</Markdown>
                    </div>
                  </div>
                </div>
              ) : coverUrl ? (
                <div className="w-96 h-96 rounded-lg overflow-hidden">
                  <img
                    src={coverUrl}
                    alt="Music collection cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : readme ? (
                <div className="bg-zinc-900 rounded-lg p-6">
                  <div className="prose prose-invert max-w-none">
                    <Markdown skipHtml>{readme}</Markdown>
                  </div>
                </div>
              ) : null}
            </div>
            
            <h2 className="text-2xl font-bold mb-6">Collections</h2>
            <CollectionsList />
          </>
        )}
      </div>
    </div>
  );
}
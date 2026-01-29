import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function AlbumView() {
  const { collectionName, albumName } = useParams<{ collectionName: string; albumName: string }>();
  const [tracks, setTracks] = useState<GitHubContent[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

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
      
      // Find zip package
      const zipFile = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}.zip`
      );
      if (zipFile) {
        setZipUrl(getRawFileUrl(zipFile.path));
      }
      
      // Find playlist file
      const playlistFile = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}.m3u8`
      );
      if (playlistFile) {
        setPlaylistUrl(getRawFileUrl(playlistFile.path));
      }
      
      // Get track folders (directories)
      const dirs = contents.filter(item => item.type === 'dir');
      setTracks(dirs);
      setLoading(false);
    }
    
    loadAlbum();
  }, [collectionName, albumName]);

  const handleDownloadAlbum = () => {
    if (zipUrl) {
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${albumName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const generatePlaylist = async () => {
    // Generate playlist content dynamically from tracks
    let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n\n';
    
    for (const track of tracks) {
      const trackPath = `${collectionName}/${albumName}/${track.name}`;
      const trackContents = await getRepoContents(trackPath);
      const mp3File = trackContents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
      );
      
      if (mp3File) {
        const mp3Url = getRawFileUrl(mp3File.path);
        playlistContent += `#EXTINF:-1,${track.name}\n`;
        playlistContent += `${mp3Url}\n\n`;
      }
    }
    
    return playlistContent;
  };
  
  const handleDownloadPlaylist = async () => {
    if (playlistUrl) {
      const a = document.createElement('a');
      a.href = playlistUrl;
      a.download = `${albumName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Generate playlist on-the-fly
      const playlistContent = await generatePlaylist();
      const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${albumName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

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
                <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                  <Markdown skipHtml>{readme}</Markdown>
                </div>
              )}
              
              {/* Download options based on device */}
              {(zipUrl || playlistUrl || tracks.length > 0) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* Mobile: Prioritize playlist (opens in native music app) */}
                  {isMobile && tracks.length > 0 && (
                    <button
                      onClick={handleDownloadPlaylist}
                      className="px-6 py-2 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
                      title={isIOS ? "Opens in Apple Music" : isAndroid ? "Opens in your music player" : "Download playlist"}
                    >
                      <Download className="w-4 h-4" />
                      {isIOS ? "Open in Apple Music" : isAndroid ? "Open in Music Player" : "Download Playlist"}
                    </button>
                  )}
                  
                  {/* Desktop: Show both options */}
                  {!isMobile && (
                    <>
                      {zipUrl && (
                        <button
                          onClick={handleDownloadAlbum}
                          className="px-6 py-2 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download ZIP
                        </button>
                      )}
                      {tracks.length > 0 && (
                        <button
                          onClick={handleDownloadPlaylist}
                          className="px-6 py-2 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <Music className="w-4 h-4" />
                          Download Playlist
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Mobile: Also show zip as secondary option */}
                  {isMobile && zipUrl && (
                    <button
                      onClick={handleDownloadAlbum}
                      className="px-6 py-2 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                      title="Download all files as ZIP"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </button>
                  )}
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
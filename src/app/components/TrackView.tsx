import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';
import { ChevronLeft, Play, Download, Music } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function TrackView() {
  const { collectionName, albumName, trackName } = useParams<{ 
    collectionName: string;
    albumName?: string;
    trackName: string;
  }>();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [readme, setReadme] = useState<string>('');
  const [mp3Url, setMp3Url] = useState<string>('');
  const [m4aUrl, setM4aUrl] = useState<string>('');
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [lyrics, setLyrics] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  
  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    async function loadTrack() {
      if (!collectionName || !trackName) return;
      
      setLoading(true);
      
      // Determine the path based on whether we have an album
      const trackPath = albumName 
        ? `${collectionName}/${albumName}/${trackName}`
        : `${collectionName}/${trackName}`;
      const parentPath = albumName 
        ? `${collectionName}/${albumName}`
        : collectionName;
      
      // Load current track
      const contents = await getRepoContents(trackPath);
      
      // Find README
      const readmeFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase() === 'readme.md'
      );
      if (readmeFile) {
        const content = await getFileContent(readmeFile.path);
        setReadme(stripHtmlFromMarkdown(content));
      }
      
      // Find MP3
      const mp3File = contents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
      );
      if (mp3File) {
        setMp3Url(getRawFileUrl(mp3File.path));
      }
      
      // Find M4A
      const m4aFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.m4a')
      );
      if (m4aFile) {
        setM4aUrl(getRawFileUrl(m4aFile.path));
      }
      
      // Find playlist file (now contains both M4A and MP3 entries)
      const playlistFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase() === `${trackName.toLowerCase()}.m3u8`
      );
      if (playlistFile) {
        setPlaylistUrl(getRawFileUrl(playlistFile.path));
      }
      
      // Find lyrics (LYRICS.txt or any .txt file)
      const lyricsFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.txt')
      );
      if (lyricsFile) {
        const content = await getFileContent(lyricsFile.path);
        setLyrics(content);
      }
      
      // Load all tracks from parent (collection or album)
      const parentContents = await getRepoContents(parentPath);
      const trackFolders = parentContents.filter(item => item.type === 'dir');
      
      // Load mp3 URLs for all tracks
      const tracksWithUrls = await Promise.all(
        trackFolders.map(async (folder) => {
          const folderPath = `${parentPath}/${folder.name}`;
          const folderContents = await getRepoContents(folderPath);
          const mp3 = folderContents.find(
            item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
          );
          
          if (mp3) {
            return {
              path: folderPath,
              name: folder.name,
              url: getRawFileUrl(mp3.path),
              album: albumName || collectionName,
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
    
    loadTrack();
  }, [collectionName, albumName, trackName]);

  const handlePlay = () => {
    if (mp3Url) {
      const trackPath = albumName 
        ? `${collectionName}/${albumName}/${trackName}`
        : `${collectionName}/${trackName}`;
      
      playTrack(
        {
          path: trackPath,
          name: trackName!,
          url: mp3Url,
          album: albumName || collectionName,
          collection: collectionName,
          lyrics: lyrics,
        },
        allTracks // Pass all tracks as playlist context
      );
    }
  };

  const handleDownload = () => {
    if (mp3Url) {
      const a = document.createElement('a');
      a.href = mp3Url;
      a.download = `${trackName}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const generatePlaylist = () => {
    // Generate playlist content for single track with both formats
    let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n\n';
    if (m4aUrl) {
      playlistContent += `#EXTINF:-1,${trackName} (M4A)\n`;
      playlistContent += `${m4aUrl}\n\n`;
    }
    if (mp3Url) {
      playlistContent += `#EXTINF:-1,${trackName} (MP3)\n`;
      playlistContent += `${mp3Url}\n`;
    }
    return playlistContent;
  };
  
  const handleDownloadPlaylist = () => {
    if (playlistUrl) {
      const a = document.createElement('a');
      a.href = playlistUrl;
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (mp3Url) {
      // Generate playlist on-the-fly
      const playlistContent = generatePlaylist();
      const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackName}.m3u8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const trackPath = albumName 
    ? `${collectionName}/${albumName}/${trackName}`
    : `${collectionName}/${trackName}`;
  const isCurrentTrack = currentTrack?.path === trackPath;
  
  const backLink = albumName 
    ? `/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(albumName)}`
    : `/collection/${encodeURIComponent(collectionName!)}`;
  const backText = albumName || collectionName;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-32">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading track...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <Link 
          to={backLink}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to {backText}
        </Link>

        <div className="mb-8">
          <div className="bg-zinc-900 rounded-lg p-6 mb-6">
            <h1 className="text-4xl font-bold mb-4">{trackName}</h1>
            
            {readme && (
              <div className="text-zinc-300 [&>p]:mb-4 columns-1 lg:columns-2 lg:gap-8">
                <Markdown skipHtml>{readme}</Markdown>
              </div>
            )}
          </div>
          
          {(mp3Url || m4aUrl) && (
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={handlePlay}
                className="px-6 py-2 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                {isCurrentTrack && isPlaying ? 'Playing' : 'Play'}
              </button>
              
              {/* Mobile: Prioritize playlist */}
              {isMobile && (mp3Url || m4aUrl) && (
                <button
                  onClick={handleDownloadPlaylist}
                  className="px-6 py-2 bg-zinc-800 rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  title={isIOS ? "Opens in Apple Music" : isAndroid ? "Opens in your music player" : "Download playlist"}
                >
                  <Music className="w-4 h-4" />
                  {isIOS ? "Add to Apple Music" : isAndroid ? "Add to Music" : "Download Playlist"}
                </button>
              )}
              
              {/* Always show MP3 download if available */}
              {mp3Url && (
                <button
                  onClick={handleDownload}
                  className={`px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2 ${
                    isMobile && playlistUrl 
                      ? 'bg-zinc-800 hover:bg-zinc-700' 
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download MP3
                </button>
              )}
              
              {/* Desktop: Show M4A and playlist options */}
              {!isMobile && (
                <>
                  {m4aUrl && (
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = m4aUrl;
                        a.download = `${trackName}.m4a`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="px-6 py-2 bg-zinc-800 rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download M4A
                    </button>
                  )}
                  {(mp3Url || m4aUrl) && (
                    <button
                      onClick={handleDownloadPlaylist}
                      className="px-6 py-2 bg-zinc-800 rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                    >
                      <Music className="w-4 h-4" />
                      Download Playlist
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {lyrics && (
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Lyrics</h2>
            <div className="text-zinc-300 whitespace-pre-wrap">{lyrics}</div>
          </div>
        )}

        {!mp3Url && !m4aUrl && (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-16 h-16 text-zinc-600 mb-4" />
            <div className="text-zinc-400">No audio file found</div>
          </div>
        )}
      </div>
    </div>
  );
}
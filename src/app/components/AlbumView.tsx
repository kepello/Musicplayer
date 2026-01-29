import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl, GitHubContent } from '@/app/services/github';
import { ChevronLeft, Music, Play, Download, List } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';
import { usePlayer, Track } from '@/app/contexts/PlayerContext';

export function AlbumView() {
  const { collectionName, albumName } = useParams<{ collectionName: string; albumName: string }>();
  const { playPlaylist } = usePlayer();
  const [tracks, setTracks] = useState<GitHubContent[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [zipUrlM4A, setZipUrlM4A] = useState<string | null>(null);
  const [zipUrlMP3, setZipUrlMP3] = useState<string | null>(null);
  const [playlistUrlM4A, setPlaylistUrlM4A] = useState<string | null>(null);
  const [playlistUrlMP3, setPlaylistUrlMP3] = useState<string | null>(null);
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
      
      // Find M4A zip package
      const zipFileM4A = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}-m4a.zip`
      );
      if (zipFileM4A) {
        setZipUrlM4A(getRawFileUrl(zipFileM4A.path));
      }
      
      // Find MP3 zip package
      const zipFileMP3 = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}-mp3.zip`
      );
      if (zipFileMP3) {
        setZipUrlMP3(getRawFileUrl(zipFileMP3.path));
      }
      
      // Find M4A playlist file
      const playlistFileM4A = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}-m4a.m3u8`
      );
      if (playlistFileM4A) {
        setPlaylistUrlM4A(getRawFileUrl(playlistFileM4A.path));
      }
      
      // Find MP3 playlist file
      const playlistFileMP3 = contents.find(
        item => 
          item.type === 'file' && 
          item.name.toLowerCase() === `${albumName.toLowerCase()}-mp3.m3u8`
      );
      if (playlistFileMP3) {
        setPlaylistUrlMP3(getRawFileUrl(playlistFileMP3.path));
      }
      
      // Get track folders (directories)
      const dirs = contents.filter(item => item.type === 'dir');
      setTracks(dirs);
      
      // Load mp3 URLs for all tracks
      const tracksWithUrls = await Promise.all(
        dirs.map(async (dir) => {
          const trackPath = `${collectionName}/${albumName}/${dir.name}`;
          const trackContents = await getRepoContents(trackPath);
          const mp3 = trackContents.find(
            item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
          );
          
          if (mp3) {
            return {
              path: trackPath,
              name: dir.name,
              url: getRawFileUrl(mp3.path),
              album: albumName,
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
    
    loadAlbum();
  }, [collectionName, albumName]);

  const handleDownloadAlbum = (format: 'M4A' | 'MP3') => {
    const zipUrl = format === 'M4A' ? zipUrlM4A : zipUrlMP3;
    if (zipUrl) {
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${albumName}-${format}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const generatePlaylist = async () => {
    // Generate playlist content dynamically from tracks
    let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
    
    for (const track of tracks) {
      const trackPath = `${collectionName}/${albumName}/${track.name}`;
      const trackContents = await getRepoContents(trackPath);
      const mp3File = trackContents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3')
      );
      
      if (mp3File) {
        const mp3Url = getRawFileUrl(mp3File.path);
        playlistContent += `\n#EXTINF:-1,${track.name}\n`;
        playlistContent += `${mp3Url}`;
      }
    }
    playlistContent += '\n';
    
    return playlistContent;
  };
  
  const handleDownloadPlaylist = async (format: 'M4A' | 'MP3') => {
    const playlistUrl = format === 'M4A' ? playlistUrlM4A : playlistUrlMP3;
    if (playlistUrl) {
      const a = document.createElement('a');
      a.href = playlistUrl;
      a.download = `${albumName}-${format}.m3u8`;
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
      a.download = `${albumName}-${format}.m3u8`;
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
              <div className="group w-full lg:w-96 h-96 flex-shrink-0 bg-zinc-800 relative">
                <img
                  src={coverUrl}
                  alt={`${albumName} cover`}
                  className="w-full h-full object-cover"
                />
                {/* Button overlay on album cover */}
                {allTracks.length > 0 && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => playPlaylist(allTracks, 0)}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                      title="Play Album"
                    >
                      <Play className="w-6 h-6 text-white" fill="currentColor" />
                    </button>
                    <button
                      onClick={async () => {
                        // Download playlist - prefer MP3 format
                        if (playlistUrlMP3 || playlistUrlM4A) {
                          await handleDownloadPlaylist(playlistUrlMP3 ? 'MP3' : 'M4A');
                        } else {
                          // Generate album playlist
                          let playlistContent = '#EXTM3U\n#EXTENC:UTF-8\n';
                          allTracks.forEach(track => {
                            playlistContent += `\n#EXTINF:-1,${track.name}\n${track.url}`;
                          });
                          playlistContent += '\n';
                          const blob = new Blob([playlistContent], { type: 'audio/x-mpegurl' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${albumName}-MP3.m3u8`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                      title="Download Playlist"
                    >
                      <List className="w-6 h-6 text-white" />
                    </button>
                  </div>
                )}
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
              
              {/* Play and Download options */}
              {allTracks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => playPlaylist(allTracks, 0)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                    title="Play Album"
                  >
                    <Play className="w-5 h-5 text-white" fill="currentColor" />
                    <span className="text-white font-medium">Play Album</span>
                  </button>
                  
                  {(zipUrlM4A || zipUrlMP3 || playlistUrlM4A || playlistUrlMP3 || tracks.length > 0) && (
                    <>
                  {/* Mobile: Prioritize playlist (opens in native music app) */}
                  {isMobile && tracks.length > 0 && (
                    <button
                      onClick={() => handleDownloadPlaylist(isIOS ? 'M4A' : 'MP3')}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                      title={isIOS ? "Opens in Apple Music" : isAndroid ? "Opens in your music player" : "Download playlist"}
                    >
                      <List className="w-5 h-5 text-white" />
                      <span className="text-white font-medium">{isIOS ? "Apple Music" : isAndroid ? "Music Player" : "Playlist"}</span>
                    </button>
                  )}
                  
                  {/* Desktop: Show both M4A and MP3 options */}
                  {!isMobile && (
                    <>
                      {zipUrlM4A && (
                        <button
                          onClick={() => handleDownloadAlbum('M4A')}
                          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                          title="Download M4A ZIP"
                        >
                          <Download className="w-5 h-5 text-white" />
                          <span className="text-white font-medium">M4A ZIP</span>
                        </button>
                      )}
                      {zipUrlMP3 && (
                        <button
                          onClick={() => handleDownloadAlbum('MP3')}
                          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                          title="Download MP3 ZIP"
                        >
                          <Download className="w-5 h-5 text-white" />
                          <span className="text-white font-medium">MP3 ZIP</span>
                        </button>
                      )}
                      {tracks.length > 0 && (
                        <>
                          {playlistUrlM4A && (
                            <button
                              onClick={() => handleDownloadPlaylist('M4A')}
                              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                              title="Download M4A Playlist"
                            >
                              <List className="w-5 h-5 text-white" />
                              <span className="text-white font-medium">M4A Playlist</span>
                            </button>
                          )}
                          {playlistUrlMP3 && (
                            <button
                              onClick={() => handleDownloadPlaylist('MP3')}
                              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                              title="Download MP3 Playlist"
                            >
                              <List className="w-5 h-5 text-white" />
                              <span className="text-white font-medium">MP3 Playlist</span>
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Mobile: Also show zip as secondary option */}
                  {isMobile && (zipUrlM4A || zipUrlMP3) && (
                    <button
                      onClick={() => handleDownloadAlbum(zipUrlM4A && isIOS ? 'M4A' : 'MP3')}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                      title="Download all files as ZIP"
                    >
                      <Download className="w-5 h-5 text-white" />
                      <span className="text-white font-medium">ZIP</span>
                    </button>
                  )}
                    </>
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
            {tracks.map((track, index) => {
              const trackData = allTracks[index];
              return (
                <div key={track.sha} className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-500 font-mono text-sm w-8">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <Link
                      to={`/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(albumName!)}/track/${encodeURIComponent(track.name)}`}
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
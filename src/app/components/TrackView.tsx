import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRepoContents, getFileContent, getRawFileUrl } from '@/app/services/github';
import { usePlayer } from '@/app/contexts/PlayerContext';
import { ChevronLeft, Play, Download, Music } from 'lucide-react';
import Markdown from 'react-markdown';
import { stripHtmlFromMarkdown } from '@/app/utils/markdown';

export function TrackView() {
  const { collectionName, albumName, trackName } = useParams<{ 
    collectionName: string; 
    albumName: string; 
    trackName: string;
  }>();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [readme, setReadme] = useState<string>('');
  const [mp3Url, setMp3Url] = useState<string>('');
  const [lyrics, setLyrics] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrack() {
      if (!collectionName || !albumName || !trackName) return;
      
      setLoading(true);
      const path = `${collectionName}/${albumName}/${trackName}`;
      const contents = await getRepoContents(path);
      
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
      
      // Find lyrics (LYRICS.txt or any .txt file)
      const lyricsFile = contents.find(
        item => item.type === 'file' && item.name.toLowerCase().endsWith('.txt')
      );
      if (lyricsFile) {
        const content = await getFileContent(lyricsFile.path);
        setLyrics(content);
      }
      
      setLoading(false);
    }
    
    loadTrack();
  }, [collectionName, albumName, trackName]);

  const handlePlay = () => {
    if (mp3Url) {
      playTrack({
        path: `${collectionName}/${albumName}/${trackName}`,
        name: trackName!,
        url: mp3Url,
        album: albumName,
        collection: collectionName,
        lyrics: lyrics,
      });
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

  const isCurrentTrack = currentTrack?.path === `${collectionName}/${albumName}/${trackName}`;

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
          to={`/collection/${encodeURIComponent(collectionName!)}/album/${encodeURIComponent(albumName!)}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to {albumName}
        </Link>

        <div className="mb-8">
          <div className="flex gap-6 mb-6">
            <div className="w-64 h-64 flex-shrink-0 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Music className="w-32 h-32 text-zinc-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-zinc-400 mb-1">{collectionName} / {albumName}</div>
              <h1 className="text-4xl font-bold mb-4">{trackName}</h1>
              {readme && (
                <div className="prose prose-invert max-w-none mb-4">
                  <Markdown skipHtml>{readme}</Markdown>
                </div>
              )}
              {mp3Url && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePlay}
                    className="px-6 py-2 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    {isCurrentTrack && isPlaying ? 'Playing' : 'Play'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2 bg-zinc-800 rounded-full font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {lyrics && (
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Lyrics</h2>
            <div className="text-zinc-300 whitespace-pre-wrap">{lyrics}</div>
          </div>
        )}

        {!mp3Url && (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-16 h-16 text-zinc-600 mb-4" />
            <div className="text-zinc-400">No audio file found</div>
          </div>
        )}
      </div>
    </div>
  );
}
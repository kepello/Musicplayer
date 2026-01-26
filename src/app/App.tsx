import { RouterProvider } from 'react-router';
import { PlayerProvider } from '@/app/contexts/PlayerContext';
import { MusicPlayer } from '@/app/components/MusicPlayer';
import { router } from '@/app/routes';

export default function App() {
  return (
    <PlayerProvider>
      <RouterProvider router={router} />
      <MusicPlayer />
    </PlayerProvider>
  );
}

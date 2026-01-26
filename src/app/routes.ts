import { createBrowserRouter } from 'react-router';
import { Home } from '@/app/pages/Home';
import { Collection } from '@/app/pages/Collection';
import { Album } from '@/app/pages/Album';
import { Track } from '@/app/pages/Track';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/collection/:collectionName',
    Component: Collection,
  },
  {
    path: '/collection/:collectionName/album/:albumName',
    Component: Album,
  },
  {
    path: '/collection/:collectionName/album/:albumName/track/:trackName',
    Component: Track,
  },
], {
  basename: '/Musicplayer',
});
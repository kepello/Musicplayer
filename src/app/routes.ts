import { createBrowserRouter } from 'react-router';
import { Home } from '@/app/pages/Home';
import { Collection } from '@/app/pages/Collection';
import { Track } from '@/app/pages/Track';
import { NotFound } from '@/app/pages/NotFound';
import { ErrorBoundary } from '@/app/pages/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: '/collection/:collectionName',
    Component: Collection,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: '/collection/:collectionName/track/:trackName',
    Component: Track,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: '*',
    Component: NotFound,
  },
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''), // Remove trailing slash
});
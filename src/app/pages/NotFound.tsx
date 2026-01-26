import { Link } from 'react-router';
import { Music } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center">
        <Music className="w-16 h-16 mx-auto mb-4 text-purple-500" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page not found</p>
        <Link
          to="/"
          className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

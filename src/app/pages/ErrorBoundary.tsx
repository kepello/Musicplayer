import { useRouteError, Link, isRouteErrorResponse } from 'react-router';
import { AlertCircle } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || 'An error occurred';
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'An unknown error occurred';
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        {errorStatus && <h1 className="text-4xl font-bold mb-2">{errorStatus}</h1>}
        <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
        <p className="text-gray-400 mb-8">{errorMessage}</p>
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

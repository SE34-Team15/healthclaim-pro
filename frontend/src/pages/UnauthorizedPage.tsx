import React from 'react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 text-center text-neutral-900">
      <h1 className="text-xl font-bold tracking-tight">403 - Access Denied</h1>
      <p className="text-neutral-500 text-xs max-w-sm mt-1">
        You do not have permission to access this resource.
      </p>
      <Link
        to="/dashboard"
        className="mt-4 px-4 py-2 rounded bg-black text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
};

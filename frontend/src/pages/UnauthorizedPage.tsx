import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-extrabold text-white tracking-tight">
        403 - Access Prohibited
      </h1>
      <p className="text-slate-400 text-sm max-w-md mt-2">
        You do not hold the required RBAC security role privileges to access this enterprise module.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to My Dashboard
      </Link>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import {
  CreditCard,
  User,
  Mail,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const quota = user?.activeQuota;
  const currentYear = new Date().getFullYear();

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true);
    try {
      // Calls the reserved TODO email verification endpoint
      const res = await apiClient.post<any, { message: string }>('/auth/send-verification-email');
      setVerificationFeedback(res.message || 'Verification link generated (check server console in development)');
      setTimeout(() => setVerificationFeedback(null), 6000);
    } catch (err: any) {
      setVerificationFeedback(err.message || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600" />
          Employee Profile & Medical Quota
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your personal healthcare coverage parameters, remaining balances, and account credentials.
        </p>
      </div>

      {verificationFeedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{verificationFeedback}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">Full Name</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">Corporate Email</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{user?.email}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">Department</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {user?.department || 'General Enterprise'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium">Email Verification</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
                {user?.isEmailVerified ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Pending Verification (TODO Reserved)
                  </span>
                )}
              </p>
            </div>
            {!user?.isEmailVerified && (
              <button
                onClick={handleSendVerificationEmail}
                disabled={sendingVerification}
                className="px-3 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                {sendingVerification ? 'Sending...' : 'Send Link'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quota Breakdown Card */}
      {quota ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                Fiscal Year {currentYear} Allocation
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                {quota.benefitTier?.name}
              </h3>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full">
              Active Coverage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Annual Quota Limit
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                ${quota.annualLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                Remaining Balance
              </span>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">
                ${quota.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-700 uppercase">
                Co-Payment Ratio
              </span>
              <p className="text-xl font-extrabold text-blue-800 mt-1">
                {((quota.benefitTier?.defaultCoPayRate || 0.8) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Deductible Threshold: ${quota.benefitTier?.defaultDeductible.toFixed(2)}</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="h-3.5 w-3.5" /> Immutable ledger record
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          No medical policy quota assigned for the current fiscal year. Please contact your system administrator.
        </div>
      )}
    </div>
  );
};

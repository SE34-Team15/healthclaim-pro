import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '@healthclaim/shared';
import { BRAND_CONFIG } from '../config/branding';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import gsap from 'gsap';
import {
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // GSAP Smooth Entrance
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.gsap-reveal'),
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: 'power3.out',
        },
      );
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (activeTab === 'login') {
        await login({ email, password });
        toast.success('Welcome back to HealthClaim Pro');
      } else {
        await register({
          email,
          password,
          firstName,
          lastName,
          department: department || undefined,
          role,
        });
        toast.success('Account created successfully');
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#0a2540] selection:text-white">
      <div ref={containerRef} className="sm:mx-auto sm:w-full sm:max-w-[420px]">
        {/* Logo & Project Title */}
        <div className="flex flex-col items-center justify-center mb-6 text-center gsap-reveal">
          <img
            src={BRAND_CONFIG.logoUrl}
            alt={BRAND_CONFIG.fullName}
            className="h-16 w-16 object-contain mb-3 hover:scale-105 transition-transform duration-300"
          />
          <h1 className="text-2xl font-bold tracking-tight text-[#0a2540]">
            {BRAND_CONFIG.name} <span className="text-[#00a88f]">{BRAND_CONFIG.suffix}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Enterprise Medical Insurance & Settlement Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-7 sm:p-8 border border-slate-200/80 rounded-2xl shadow-[0_4px_24px_-4px_rgba(10,37,64,0.06)] gsap-reveal">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-white text-[#0a2540] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-white text-[#0a2540] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3 gsap-reveal">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="gsap-reveal">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Department
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Engineering, Treasury, HR"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="gsap-reveal">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Enterprise Role
                  </label>
                  <Select
                    value={role}
                    onValueChange={(val) => setRole(val as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.EMPLOYEE}>
                        Employee (Submit Claims & View Quota)
                      </SelectItem>
                      <SelectItem value={UserRole.CLAIM_OFFICER}>
                        Claim Officer (Review & AST Audit)
                      </SelectItem>
                      <SelectItem value={UserRole.FINANCE_MANAGER}>
                        Finance Manager (Settlement Approval)
                      </SelectItem>
                      <SelectItem value={UserRole.SYSTEM_ADMIN}>
                        System Administrator
                      </SelectItem>
                      <SelectItem value={UserRole.SECURITY_AUDITOR}>
                        Security Auditor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="gsap-reveal">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@healthclaim.pro"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="gsap-reveal">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="pt-2 gsap-reveal">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 gap-2 font-bold"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{activeTab === 'login' ? 'Sign In to Workspace' : 'Create Enterprise Account'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer Security Guarantee */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 gsap-reveal font-medium">
            <ShieldCheck className="h-4 w-4 text-[#00a88f]" />
            <span>{BRAND_CONFIG.compliance}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

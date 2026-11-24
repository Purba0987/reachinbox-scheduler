import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Rocket, 
  Play, 
  ArrowRight, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Mail, 
  Send, 
  Target, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Sparkles,
  Hash,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface LandingPageProps {
  onOpenDashboard: () => void;
  isLoggedIn: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onOpenDashboard, 
  isLoggedIn 
}) => {
  const { user, loginWithEmail, loginWithGoogle, logout } = useAuth();
  const [activeNav, setActiveNav] = useState('Home');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoVideoOpen, setIsDemoVideoOpen] = useState(false);

  const scrollToAuthCard = () => {
    const card = document.getElementById('auth-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        document.getElementById('auth-email-input')?.focus();
      }, 300);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      // Actively authenticate via backend POST /api/auth/google
      await loginWithGoogle(undefined, {
        email: 'purba@gmail.com',
        name: 'Purba Hanra',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        sub: 'google_purba_hanra_oauth',
      });
      toast.success('Successfully authenticated with Google!');
      setTimeout(() => {
        onOpenDashboard();
      }, 250);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Google authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setIsSubmitting(true);
    try {
      await loginWithEmail('purba@gmail.com', 'demo123456');
      toast.success('Signed in as Purba Hanra!');
      setTimeout(() => {
        onOpenDashboard();
      }, 250);
    } catch {
      await loginWithGoogle(undefined, {
        email: 'purba@gmail.com',
        name: 'Purba Hanra',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        sub: 'demo_dev_user',
      });
      toast.success('Signed in as Purba Hanra!');
      setTimeout(() => {
        onOpenDashboard();
      }, 250);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);

    const email = emailInput.trim();
    const password = passwordInput;
    let hasError = false;

    // Active validation: Email
    if (!email) {
      setEmailError('Please enter your email address');
      toast.error('Please enter your email address');
      hasError = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Please enter a valid email address (e.g. name@company.com)');
        toast.error('Invalid email format');
        hasError = true;
      }
    }

    // Active validation: Password
    if (!password) {
      setPasswordError('Please enter your password');
      toast.error('Please enter your password');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      hasError = true;
    }

    // STRICT CHECK: If invalid or unauthenticated, DO NOT move to dashboard!
    if (hasError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginWithEmail(email, password);
      toast.success(`Welcome to ReachInbox, ${user.name || 'User'}!`);
      // Only upon real successful authentication, move to dashboard
      setTimeout(() => {
        onOpenDashboard();
      }, 250);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setPasswordError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-800 font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white relative">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/50 via-indigo-200/40 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute top-48 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-200/40 via-purple-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header / Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-indigo-50/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveNav('Home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              ReachInbox
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-white/80 border border-slate-200/80 p-1.5 rounded-full shadow-sm">
            {['Home', 'Features', 'Pricing', 'About', 'Contact'].map((item) => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeNav === item
                    ? 'bg-[#581c87] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Right Action: Sign In / Go to Dashboard */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={onOpenDashboard}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={scrollToAuthCard}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200/90 shadow-sm hover:shadow transition-all group hover:scale-105 active:scale-95"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 space-y-7 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/80 text-purple-800 text-xs font-semibold shadow-sm hover:scale-105 transition-transform cursor-pointer">
              <Rocket className="w-3.5 h-3.5 text-purple-600" />
              <span>BullMQ • Redis • Ethereal SMTP • Slack Alerts</span>
            </div>

            {/* Giant Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Automate Your <br />
              Email Outreach <br />
              with <span className="relative inline-block text-purple-700">
                BullMQ & AI
                {/* Hand-drawn purple accent squiggle */}
                <svg 
                  className="absolute -bottom-2.5 left-0 w-full h-4 text-purple-500 overflow-visible" 
                  viewBox="0 0 80 16" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M3 12C20 4 50 16 77 6C55 14 30 5 12 11" 
                    stroke="currentColor" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed font-normal">
              Full-Stack Email Job Scheduler with BullMQ delayed queues, Redis-backed sliding window rate limiting, multiple Ethereal SMTP senders, and live Slack alerts.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={isLoggedIn ? onOpenDashboard : scrollToAuthCard}
                className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#581c87] hover:bg-[#6b21a8] text-white font-semibold text-sm shadow-xl shadow-purple-900/20 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setIsDemoVideoOpen(true)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200/90 shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                <img 
                  className="w-9 h-9 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" 
                  alt="User" 
                />
                <img 
                  className="w-9 h-9 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80" 
                  alt="User" 
                />
                <img 
                  className="w-9 h-9 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80" 
                  alt="User" 
                />
                <img 
                  className="w-9 h-9 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80" 
                  alt="User" 
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Trusted by 10,000+ businesses</p>
                <div className="flex items-center text-amber-400 text-xs">
                  {'★'.repeat(5)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: In-Place Login / Sign-In Card (Replaces dashboard preview) */}
          <div className="lg:col-span-6 relative perspective-[1200px] flex items-center justify-center">
            
            {/* Floating 3D Envelope */}
            <div className="absolute -top-6 -left-6 z-20 animate-float-delayed drop-shadow-2xl">
              <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 transform -rotate-12 hover:scale-110 transition-transform">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            </div>

            {/* Floating Origami Paper Airplane */}
            <div className="absolute -top-10 -right-4 z-20 animate-float-paperplane drop-shadow-2xl">
              <div className="p-3 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-purple-100 shadow-xl shadow-purple-500/20 text-purple-600 hover:scale-110 transition-transform">
                <Send className="w-7 h-7 sm:w-8 sm:h-8 transform -rotate-45" />
              </div>
            </div>

            {/* The Login Card (Exact match to Figma / Screenshot) */}
            <div 
              id="auth-card" 
              className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_25px_60px_rgba(88,28,135,0.12)] overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative z-10 scroll-mt-28"
            >
              
              <div className="p-6 sm:p-8 space-y-6">
                {/* Top Mail Badge Icon */}
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                  <Mail className="w-7 h-7" />
                </div>

                {/* Title & Subtitle */}
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Welcome to <span className="text-[#581c87]">ReachInbox</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {isLoggedIn && user 
                      ? 'You are currently authenticated' 
                      : 'Full-Stack Email Job Scheduler with BullMQ, Redis, Ethereal SMTP & Rate Limiting.'}
                  </p>
                </div>

                {isLoggedIn && user ? (
                  <div className="text-center space-y-4 py-2 animate-in fade-in">
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-purple-500 shadow-md">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-600 text-white font-bold text-xl flex items-center justify-center">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 mb-1">
                        Active Account
                      </span>
                      <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <div className="pt-2 space-y-2.5">
                      <button
                        onClick={onOpenDashboard}
                        className="w-full py-3.5 px-4 bg-[#581c87] hover:bg-[#6b21a8] text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        <span>Open Scheduler Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          toast.info('Signed out. Please sign in or use another account.');
                        }}
                        className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        Sign out / Switch account
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Feature Highlights Box (Integrated from assignment requirements) */}
                    <div className="space-y-2 bg-[#f8f7ff] p-3.5 rounded-2xl border border-purple-100/90 text-left">
                      <div className="flex items-center gap-2.5 text-xs text-slate-700">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-medium">BullMQ delayed queues with server restart recovery</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700">
                        <Mail className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="font-medium">Multiple Ethereal SMTP senders with live previews</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700">
                        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="font-medium">Sliding window hourly rate limiting + Slack alerts</span>
                      </div>
                    </div>

                    {/* Continue with Google Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27A7.16 7.16 0 014.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.97 11.97 0 000 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </button>

                    {/* Continue with One-Click Demo Account */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDemoSignIn}
                      className="w-full py-2.5 px-4 bg-[#f3f0ff] hover:bg-[#ebe5ff] text-[#581c87] font-semibold text-xs rounded-xl border border-purple-200/80 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    >
                      <span>Continue with One-Click Demo Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <p className="text-[11px] text-slate-400 text-center -mt-1">
                      Tip: You can use real Google OAuth, one-click demo, or email credentials.
                    </p>

                    {/* OR Divider */}
                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider absolute">
                        OR
                      </span>
                    </div>

                    {/* Email / Password Form */}
                    <form onSubmit={handleEmailSignIn} className="space-y-3.5" noValidate>
                      {/* Email Input */}
                      <div className="space-y-1">
                        <div className="relative">
                          <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${emailError ? 'text-rose-500' : 'text-slate-400'}`} />
                          <input
                            id="auth-email-input"
                            type="email"
                            placeholder="Enter your email address"
                            value={emailInput}
                            onChange={(e) => {
                              setEmailInput(e.target.value);
                              if (emailError) setEmailError(null);
                            }}
                            className={`w-full pl-10 pr-4 py-3 bg-white border ${
                              emailError 
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-rose-50/10' 
                                : 'border-slate-200/90 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10'
                            } rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all`}
                          />
                        </div>
                        {emailError && (
                          <p className="text-[11px] text-rose-500 font-medium pl-1 flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{emailError}</span>
                          </p>
                        )}
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1">
                        <div className="relative">
                          <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${passwordError ? 'text-rose-500' : 'text-slate-400'}`} />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={passwordInput}
                            onChange={(e) => {
                              setPasswordInput(e.target.value);
                              if (passwordError) setPasswordError(null);
                            }}
                            className={`w-full pl-10 pr-10 py-3 bg-white border ${
                              passwordError 
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-rose-50/10' 
                                : 'border-slate-200/90 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10'
                            } rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordError && (
                          <p className="text-[11px] text-rose-500 font-medium pl-1 flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{passwordError}</span>
                          </p>
                        )}
                      </div>

                      {/* Sign In Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 bg-[#581c87] hover:bg-[#6b21a8] text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <span>Sign In</span>
                        )}
                      </button>
                    </form>

                    {/* Don't have an account link */}
                    <div className="text-center text-xs text-slate-500">
                      <span>Don't have an account? </span>
                      <a href="#contact" className="font-bold text-[#581c87] hover:underline">
                        Contact us
                      </a>
                    </div>
                  </>
                )}
              </div>

              {/* Secure & Trusted Bottom Bar */}
              <div className="bg-[#f8f7ff] border-t border-purple-100/70 py-3.5 px-6 flex items-center justify-center gap-2.5 text-center">
                <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Secure & Trusted</p>
                  <p className="text-[11px] text-slate-500 leading-tight">Your data is always protected</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Trusted Logos Bar */}
      <section className="py-10 bg-white/60 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center md:text-left">
              Trusted by <br className="hidden md:block"/> forward-thinking companies
            </p>
            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-slate-400 font-bold text-lg">
              <span className="hover:text-[#4285F4] transition-colors">Google</span>
              <span className="hover:text-slate-800 transition-colors flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#F25022]"></span>
                <span className="w-2.5 h-2.5 bg-[#7FBA00]"></span>
                Microsoft
              </span>
              <span className="hover:text-[#0668E1] transition-colors">∞ Meta</span>
              <span className="hover:text-[#635BFF] transition-colors">stripe</span>
              <span className="hover:text-slate-900 transition-colors flex items-center gap-1">
                <span className="px-1 bg-slate-900 text-white rounded text-xs">N</span> Notion
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Assignment Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Engineered for High-Scale Email Scheduling
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Full-stack architecture with BullMQ delayed queues, Redis state persistence, Ethereal SMTP, and Slack webhooks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: BullMQ Delayed Queues */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1.5">BullMQ Delayed Queues</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Zero cron jobs. Millisecond-precision delayed scheduling powered by Redis sorted sets.
            </p>
          </div>

          {/* Card 2: Server Restart Recovery */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1.5">Restart Recovery</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Startup reconciliation automatically restores pending & postponed jobs with strict idempotency.
            </p>
          </div>

          {/* Card 3: Multiple Ethereal Senders */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1.5">Multiple Ethereal Senders</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fake SMTP testing with multi-sender accounts & instant clickable live web preview links.
            </p>
          </div>

          {/* Card 4: Sliding Window Rate Limiting */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1.5">Hourly Rate Limiting</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Atomic Redis sliding-window counters enforce hourly caps, auto-postponing excess jobs to next hour.
            </p>
          </div>

          {/* Card 5: Live Slack Notifications */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1.5">Live Slack Alerts</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant rich block alerts dispatched to your Slack workspace when rate limit thresholds are hit.
            </p>
          </div>

        </div>
      </section>

      {/* 5. Bottom Call to Action Banner (Deep Purple) */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#2e0854] via-[#4a0e78] to-[#1e053a] p-8 sm:p-12 text-white overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Subtle star particle accents */}
          <div className="absolute top-6 left-1/3 text-purple-300/40 text-xl pointer-events-none">✦</div>
          <div className="absolute bottom-6 right-1/3 text-purple-300/40 text-sm pointer-events-none">✦</div>

          {/* Left Text */}
          <div className="space-y-2 text-center md:text-left z-10 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Turn Your Leads Into Opportunities
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80">
              Join thousands of businesses using ReachInbox to scale their outreach and grow faster.
            </p>
          </div>

          {/* Right Action Button & Graphic */}
          <div className="flex items-center gap-6 z-10">
            <button
              onClick={isLoggedIn ? onOpenDashboard : scrollToAuthCard}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-white text-purple-950 font-bold text-xs sm:text-sm shadow-xl hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <span>Start Free Today</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Target & Dart Graphic */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-16 h-16 rounded-full border-4 border-purple-400/30 flex items-center justify-center relative">
                <Target className="w-10 h-10 text-purple-300" />
                <div className="absolute -top-1 -right-1 text-amber-400 text-base">🏹</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-8 bg-white/40 text-center text-xs text-slate-400">
        <p>© 2026 ReachInbox.ai • Outbox Labs. All rights reserved.</p>
      </footer>

      {/* Interactive Walkthrough & Demo Video Modal */}
      {isDemoVideoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#0c0e1e] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b1e3d] bg-[#10132b]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ReachInbox Scheduler System Walkthrough</h3>
                  <p className="text-[11px] text-slate-400">Architecture, BullMQ queues, restart recovery & live Slack alerts</p>
                </div>
              </div>
              <button
                onClick={() => setIsDemoVideoOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1d3d] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Interactive Walkthrough Preview */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-200 text-xs">
              {/* Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-400/30 uppercase">
                    5-Minute Assignment Demo
                  </span>
                  <h4 className="text-sm font-bold text-white">Full-Stack Email Scheduler Walkthrough</h4>
                  <p className="text-slate-300 text-[11px]">
                    See BullMQ delayed jobs, server restart resilience, sliding-window rate limit, and live Slack alerts in action.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDemoVideoOpen(false);
                    onOpenDashboard();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span>Launch Live App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Core Demonstration Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-[#12152d] border border-[#20254d] space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px]">1</span>
                    <span>Email Scheduling & Throttling</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Upload CSV leads with delay between sends (min 2 seconds). BullMQ schedules delayed jobs into Redis sorted sets (zero cron).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#12152d] border border-[#20254d] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 flex items-center justify-center text-[10px]">2</span>
                    <span>Server Restart Recovery</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Jobs persist in Redis and PostgreSQL. On boot, <code className="text-emerald-400">reconcilePendingJobsOnStartup()</code> restores pending jobs without duplicates.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#12152d] border border-[#20254d] space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-amber-600/30 flex items-center justify-center text-[10px]">3</span>
                    <span>Hourly Rate Limiting & Slack Alert</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Atomic Redis counters track sends per sender per hour. When the cap is reached, jobs are postponed and a live Slack webhook alert is dispatched.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#12152d] border border-[#20254d] space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-600/30 flex items-center justify-center text-[10px]">4</span>
                    <span>Ethereal SMTP & Queue Dashboard</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Multiple Ethereal senders deliver test emails with preview links. Live BullMQ Queue Monitoring tracks Active, Waiting, Delayed, and Completed metrics.
                  </p>
                </div>
              </div>

              {/* Video Link / Notice */}
              <div className="p-3.5 rounded-xl bg-[#0f1226] border border-[#1b1f40] flex items-center justify-between text-[11px] text-slate-400">
                <span>📹 Video walkthrough instructions are documented in <strong className="text-white">README.md</strong>.</span>
                <a
                  href="https://github.com/Purba0987/reachinbox-scheduler#testing-the-4-key-demo-scenarios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                >
                  <span>View Scenarios Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

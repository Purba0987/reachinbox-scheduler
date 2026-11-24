import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, isLoading } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Logged in successfully via Google!');
    } catch (err: any) {
      toast.error('Google login failed. Please try again.');
    }
  };

  const handleDemoSignIn = async () => {
    try {
      await loginWithGoogle(undefined, {
        email: 'purba@gmail.com',
        name: 'Purba Hanra',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        sub: 'google_dev_demo_123',
      });
      toast.success('Signed in as Purba Hanra');
    } catch {
      // Instant local login fallback so user is never blocked
      const fallbackUser = {
        id: 'dev_reachinbox_demo',
        email: 'purba@gmail.com',
        name: 'Purba Hanra',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        hasSlack: false,
      };
      localStorage.setItem('reachinbox_user', JSON.stringify(fallbackUser));
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090d]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0e1017] border border-[#23283c] rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1c28] transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {/* Glow effect */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 font-bold text-white text-2xl">
          RI
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-1">
          Welcome to ReachInbox
        </h2>
        <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
          Full-Stack Email Job Scheduler with BullMQ, Redis, Ethereal SMTP & Rate Limiting.
        </p>

        {/* Features highlights */}
        <div className="space-y-2 mb-6 text-left bg-[#131622] p-3.5 rounded-xl border border-[#1f2333]">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>BullMQ delayed queues with server restart recovery</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Multiple Ethereal SMTP senders with live previews</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Sliding window hourly rate limiting + Slack alerts</span>
          </div>
        </div>

        {/* Real Google Login Component */}
        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google Sign-In failed')}
            useOneTap
            shape="pill"
            theme="filled_black"
            text="signin_with"
          />
        </div>

        {/* Fast Demo Sign-In Fallback Button */}
        <div className="pt-3 border-t border-[#1f2333]">
          <button
            onClick={handleDemoSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#171a27] hover:bg-[#1f2333] border border-[#2a2f45] text-xs font-semibold text-gray-300 hover:text-white transition-all"
          >
            <span>Continue with One-Click Demo Account</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <p className="text-[10px] text-gray-500 mt-2">
            Tip: You can use real Google OAuth or quick demo login anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

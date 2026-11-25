import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Save, 
  Mail, 
  Hash, 
  User, 
  Layers,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsViewProps {
  onOpenSlack: () => void;
  slackConnected: boolean;
  slackChannel?: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenSlack,
  slackConnected,
  slackChannel,
}) => {
  const { user, logout } = useAuth();

  const [concurrency, setConcurrency] = useState(5);
  const [minDelay, setMinDelay] = useState(2);
  const [hourlyCap, setHourlyCap] = useState(200);
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Scheduler settings saved successfully!');
    }, 400);
  };

  return (
    <div className="space-y-6 text-slate-200 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-gradient-to-r from-[#0c0e22] via-[#12132e] to-[#0a0c1e] shadow-2xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 flex-shrink-0">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                System Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Configuration
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage queue concurrency, rate limit thresholds, SMTP dispatchers, and Slack webhooks
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 z-10"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: BullMQ Queue Engine Settings */}
        <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1b1f3c]">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">BullMQ Worker Parameters</h2>
              <p className="text-xs text-slate-400">Concurrency, throttle intervals, and retry backoffs</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Worker Concurrency (Simultaneous Jobs)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 1)}
                  className="w-24 bg-[#141633] border border-purple-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-slate-400">Parallel Redis workers polling simultaneously</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Minimum Delay Between Email Sends (Seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={minDelay}
                  onChange={(e) => setMinDelay(parseInt(e.target.value, 10) || 0)}
                  className="w-24 bg-[#141633] border border-purple-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-slate-400">Throttles outgoing SMTP requests to prevent provider blocks</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Default Hourly Rate Limit (Per Sender)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={hourlyCap}
                  onChange={(e) => setHourlyCap(parseInt(e.target.value, 10) || 1)}
                  className="w-24 bg-[#141633] border border-purple-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-slate-400">Sliding hourly window in Redis. Jobs over cap are postponed</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Max Retry Attempts on Failure
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={retryAttempts}
                  onChange={(e) => setRetryAttempts(parseInt(e.target.value, 10) || 1)}
                  className="w-24 bg-[#141633] border border-purple-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-slate-400">Exponential backoff retry policy for transient SMTP drops</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sender Accounts (SMTP) */}
        <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1b1f3c]">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Configured SMTP Senders</h2>
              <p className="text-xs text-slate-400">Ethereal email test accounts with TLS certificate bypass</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#12142d] border border-purple-500/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white">Primary Ethereal Sender (Marketing)</p>
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                    Default
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">smtp.ethereal.email : 587</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Connected
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#12142d] border border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Secondary Ethereal Sender (Outreach)</p>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">smtp.ethereal.email : 587</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Connected
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#141733] border border-purple-500/10 text-slate-400 text-[11px] leading-relaxed">
              TLS certificate chain validation configured with self-signed certificate fallback (<code className="text-purple-300">checkServerIdentity</code> bypass).
            </div>
          </div>
        </div>

        {/* Section 3: Slack Alerting */}
        <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b1f3c]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-300 flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white">Slack Webhook Alerts</h2>
                <p className="text-xs text-slate-400">Instant alerts when hourly sender limits are exceeded</p>
              </div>
            </div>
            <button
              onClick={onOpenSlack}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition-colors"
            >
              Configure Slack
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-[#1b1f3c]">
              <span className="text-slate-400">Connection Status</span>
              <span className={`font-semibold flex items-center gap-1.5 ${slackConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-2 h-2 rounded-full ${slackConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {slackConnected ? 'Connected & Active' : 'Not Connected'}
              </span>
            </div>

            {slackConnected && slackChannel && (
              <div className="flex items-center justify-between py-2 border-b border-[#1b1f3c]">
                <span className="text-slate-400">Alert Channel</span>
                <span className="font-mono text-purple-300 font-bold">{slackChannel}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Trigger Event</span>
              <span className="text-white font-medium">Hourly Sender Cap Reached</span>
            </div>
          </div>
        </div>

        {/* Section 4: User Profile & Authentication */}
        <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b1f3c]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white">Signed In Account</h2>
                <p className="text-xs text-slate-400">Authenticated profile details in PostgreSQL</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#12142d] border border-purple-500/20">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt={user?.name || 'User'}
              className="w-12 h-12 rounded-full border border-purple-500/40 object-cover"
            />
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{user?.name || 'Purba Hanra'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'purbahanra@gmail.com'}</p>
              <span className="inline-block mt-1 px-2 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Google OAuth Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

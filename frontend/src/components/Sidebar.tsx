import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Calendar, 
  Send, 
  AlertTriangle, 
  Megaphone, 
  BarChart3, 
  Activity, 
  Users, 
  Hash, 
  Settings, 
  Rocket, 
  Mail,
  ArrowRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'queue' | 'scheduled' | 'sent' | 'failed' | 'overview' | 'campaigns' | 'analytics';
  onSelectTab: (tab: 'queue' | 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  failedCount?: number;
  onOpenSlack: () => void;
  onToggleLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  scheduledCount,
  sentCount,
  failedCount = 0,
  onOpenSlack,
  onToggleLanding
}) => {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 bg-[#0a0c18] border-r border-[#191b30] flex flex-col justify-between p-4 flex-shrink-0 min-h-screen text-slate-300 select-none">
      <div className="space-y-6">
        {/* Brand Logo matching Image 1 */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onToggleLanding}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              ReachInbox
            </span>
          </div>

          {onToggleLanding && (
            <button
              onClick={onToggleLanding}
              title="View Public Landing Page"
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-[#16182a] transition-colors text-xs"
            >
              🌐
            </button>
          )}
        </div>

        {/* Primary Navigation Menu */}
        <nav className="space-y-1">
          <button
            onClick={() => onSelectTab('queue')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-lg shadow-purple-600/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121426]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onSelectTab('scheduled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#181a38] text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121426]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className={activeTab === 'scheduled' ? 'text-white' : ''}>Scheduled Emails</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30">
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sent'
                ? 'bg-[#181a38] text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121426]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4 text-emerald-400" />
              <span className={activeTab === 'sent' ? 'text-white' : ''}>Sent Emails</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
              {sentCount}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('sent')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-[#121426] transition-all"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Failed Emails</span>
            </div>
            {failedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                {failedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('queue')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-[#121426] transition-all"
          >
            <Megaphone className="w-4 h-4 text-purple-400" />
            <span>Campaigns</span>
          </button>

          <button
            onClick={() => onSelectTab('queue')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-[#121426] transition-all"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Analytics</span>
          </button>
        </nav>

        {/* SYSTEM Category matching Image 1 */}
        <div className="space-y-1 pt-2">
          <p className="px-3.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            System
          </p>

          <button
            onClick={() => onSelectTab('queue')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-[#181a38] text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.25)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121426]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className={activeTab === 'queue' ? 'text-white' : ''}>Queue Monitoring</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          </button>

          <button
            onClick={() => onSelectTab('scheduled')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#121426] transition-all"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Sender Accounts</span>
          </button>

          <button
            onClick={onOpenSlack}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#121426] transition-all"
          >
            <Hash className="w-4 h-4 text-amber-400" />
            <span>Slack Integration</span>
          </button>

          <button
            onClick={() => onSelectTab('queue')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#121426] transition-all"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Bottom Promo Card: "Grow Faster with ReachInbox" */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#12142c] via-[#1a1738] to-[#14122b] border border-purple-500/20 shadow-xl relative overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-2.5">
            <Rocket className="w-4 h-4" />
          </div>

          <h4 className="text-xs font-bold text-white mb-0.5">Grow Faster with ReachInbox</h4>
          <p className="text-[11px] text-slate-400 mb-3 leading-snug">
            Automate. Engage. Scale.
          </p>

          <button 
            onClick={() => window.open('https://reachinbox.ai', '_blank')}
            className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-[11px] rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom User Profile Bar - Fully synced with Header & useAuth */}
        <div className="pt-3 border-t border-[#181a32] flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full border border-purple-500/40 object-cover flex-shrink-0"
            />
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">{user?.name || 'Purba Hanra'}</p>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{user?.email || 'purba@gmail.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

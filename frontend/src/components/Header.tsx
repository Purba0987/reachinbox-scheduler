import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onOpenSlack: () => void;
  slackConnected: boolean;
  slackChannel?: string | null;
  onToggleView?: () => void;
  viewMode?: 'dashboard' | 'landing';
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSlack, 
  slackConnected, 
  slackChannel,
  onToggleView,
}) => {
  const { user } = useAuth();

  return (
    <header className="border-b border-[#16182e] bg-[#090b16]/80 backdrop-blur-md sticky top-0 z-30 h-16 px-6 flex items-center justify-between">
      {/* Left: Live BullMQ Queue Monitor Pill matching Image 1 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#121429] border border-[#222547] text-xs font-semibold text-slate-300 shadow-sm cursor-pointer hover:border-purple-500/40 transition-colors">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <span>Live BullMQ Queue Monitor</span>
        </div>
      </div>

      {/* Right: Slack Connect, Notification Bell, User Profile */}
      <div className="flex items-center gap-4">
        {/* Toggle to Landing Page button */}
        {onToggleView && (
          <button
            onClick={onToggleView}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 rounded-xl transition-all"
          >
            <span>🌐 Landing Page</span>
          </button>
        )}

        {/* Multi-colored Slack Connect Button */}
        <button
          onClick={onOpenSlack}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            slackConnected
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-[#151730] text-purple-200 border-purple-500/30 hover:border-purple-500/50 hover:bg-[#1a1c3d]'
          }`}
        >
          {/* Slack 4-Color Hash Icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 10.5C6.88 10.5 8 9.38 8 8V5.5C8 4.12 6.88 3 5.5 3C4.12 3 3 4.12 3 5.5C3 6.88 4.12 8 5.5 8H8" fill="#E01E5A"/>
            <path d="M10.5 5.5C10.5 4.12 9.38 3 8 3C6.62 3 5.5 4.12 5.5 5.5V13C5.5 14.38 6.62 15.5 8 15.5C9.38 15.5 10.5 14.38 10.5 13V5.5Z" fill="#E01E5A"/>
            <path d="M13.5 5.5C13.5 4.12 14.62 3 16 3C17.38 3 18.5 4.12 18.5 5.5V8C18.5 9.38 17.38 10.5 16 10.5H13.5V5.5Z" fill="#36C5F0"/>
            <path d="M18.5 10.5C19.88 10.5 21 9.38 21 8C21 6.62 19.88 5.5 18.5 5.5H11C9.62 5.5 8.5 6.62 8.5 8C8.5 9.38 9.62 10.5 11 10.5H18.5Z" fill="#36C5F0"/>
            <path d="M18.5 13.5C17.12 13.5 16 14.62 16 16V18.5C16 19.88 17.12 21 18.5 21C19.88 21 21 19.88 21 18.5C21 17.12 19.88 16 18.5 16H16" fill="#2EB67D"/>
            <path d="M13.5 18.5C13.5 19.88 14.62 21 16 21C17.38 21 18.5 19.88 18.5 18.5V11C18.5 9.62 17.38 8.5 16 8.5C14.62 8.5 13.5 9.62 13.5 11V18.5Z" fill="#2EB67D"/>
            <path d="M10.5 18.5C10.5 19.88 9.38 21 8 21C6.62 21 5.5 19.88 5.5 18.5V16C5.5 14.62 6.62 13.5 8 13.5H10.5V18.5Z" fill="#ECB22E"/>
            <path d="M5.5 13.5C4.12 13.5 3 14.62 3 16C3 17.38 4.12 18.5 5.5 18.5H13C14.38 18.5 15.5 17.38 15.5 16C15.5 14.62 14.38 13.5 13 13.5H5.5Z" fill="#ECB22E"/>
          </svg>
          <span>{slackConnected ? (slackChannel ? `Slack: ${slackChannel}` : 'Slack Connected') : 'Connect Slack'}</span>
        </button>

        {/* Notification Bell Icon with Badge 2 */}
        <div className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16182f] cursor-pointer transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
            2
          </span>
        </div>

        {/* User Profile matching Image 1 */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1b1e38] cursor-pointer">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
            alt={user?.name || 'Purba Hanra'}
            className="w-8 h-8 rounded-full border border-purple-500/40 object-cover"
          />
          <span className="hidden sm:inline font-bold text-xs text-white">
            {user?.name || 'Purba Hanra'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>
    </header>
  );
};

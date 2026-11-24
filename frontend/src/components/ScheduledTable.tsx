import React from 'react';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { Clock, Trash2, AlertTriangle, RefreshCw, Send, Mail } from 'lucide-react';

interface ScheduledTableProps {
  jobs: EmailJob[];
  isLoading: boolean;
  onCancelJob: (id: string) => void;
  onCompose?: () => void;
  searchQuery?: string;
  onClearFilter?: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({ 
  jobs, 
  isLoading, 
  onCancelJob,
  onCompose,
  searchQuery = '',
  onClearFilter
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-purple-300">
        <RefreshCw className="w-7 h-7 animate-spin text-purple-500" />
        <p className="text-xs font-semibold tracking-wide">Loading scheduled jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    const isFiltered = Boolean(searchQuery && searchQuery.trim().length > 0);

    return (
      <div className="w-full py-20 flex flex-col items-center justify-center text-center px-4 relative">
        {/* Glow behind illustration */}
        <div className="absolute w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Envelope with Clock Badge & Sparkles matching Image 1 */}
        <div className="relative mb-6">
          {/* Sparkles */}
          <div className="absolute -top-3 -left-4 text-purple-300/70 text-xs animate-pulse">✦</div>
          <div className="absolute -bottom-2 -right-3 text-purple-300/70 text-sm animate-pulse">✦</div>

          {/* Envelope Graphic */}
          <div className="w-20 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-purple-600/40 transform -rotate-3">
            <Mail className="w-10 h-10 text-white drop-shadow-md" />
          </div>

          {/* Clock Badge Overlap */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#181a38] border-2 border-purple-400/50 flex items-center justify-center text-purple-300 shadow-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">
          {isFiltered ? 'No emails match these filters' : 'No Scheduled Emails'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          {isFiltered 
            ? `No scheduled emails match "${searchQuery}". Clear your search filters to view all scheduled campaigns.`
            : "You haven't scheduled any emails yet. Click \"Compose New Email\" to start your first campaign."}
        </p>

        {/* Filter Clear or Compose CTA Button */}
        {isFiltered && onClearFilter ? (
          <button
            onClick={onClearFilter}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#181a38] hover:bg-[#20234a] text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <span>Clear filters</span>
          </button>
        ) : onCompose ? (
          <button
            onClick={onCompose}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose New Email</span>
            <span>&rarr;</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-purple-500/20 bg-[#0e1022]/90 shadow-2xl">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-[#14162e] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#212447]">
          <tr>
            <th className="py-4 px-5">Recipient</th>
            <th className="py-4 px-5">Subject</th>
            <th className="py-4 px-5">Sender</th>
            <th className="py-4 px-5">Scheduled For</th>
            <th className="py-4 px-5">Status</th>
            <th className="py-4 px-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c1f3d]">
          {jobs.map((job) => {
            const scheduledDate = new Date(job.scheduledAt);
            const isValidDate = !isNaN(scheduledDate.getTime());

            return (
              <tr key={job.id} className="hover:bg-[#151836] transition-colors">
                <td className="py-4 px-5 font-semibold text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500"></span>
                    <span>{job.recipientEmail}</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-slate-300 max-w-xs truncate" title={job.subject}>
                  {job.subject}
                </td>
                <td className="py-4 px-5 text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                  {job.sender?.email || 'Default Sender'}
                </td>
                <td className="py-4 px-5 text-xs text-slate-300 whitespace-nowrap">
                  {isValidDate ? format(scheduledDate, 'MMM d, yyyy • h:mm a') : job.scheduledAt}
                </td>
                <td className="py-4 px-5">
                  {job.status === 'RATE_LIMITED' ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      title={job.errorMessage || 'Rate limit reached. Automatically postponed to next hour window.'}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Rate Limited (Postponed)
                    </span>
                  ) : job.status === 'PROCESSING' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                      Sending...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Scheduled
                    </span>
                  )}
                </td>
                <td className="py-4 px-5 text-right">
                  <button
                    onClick={() => onCancelJob(job.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Cancel scheduled job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

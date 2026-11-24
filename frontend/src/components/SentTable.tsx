import React from 'react';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { MailCheck, ExternalLink, XCircle, RefreshCw, Send, Mail } from 'lucide-react';

interface SentTableProps {
  jobs: EmailJob[];
  isLoading: boolean;
  onCompose?: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ jobs, isLoading, onCompose }) => {
  if (isLoading) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-emerald-300">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold tracking-wide">Loading sent emails...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center text-center px-4 relative">
        {/* Glow behind illustration */}
        <div className="absolute w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Envelope Graphic */}
        <div className="relative mb-6">
          <div className="absolute -top-3 -left-4 text-emerald-300/70 text-xs animate-pulse">✦</div>
          <div className="absolute -bottom-2 -right-3 text-emerald-300/70 text-sm animate-pulse">✦</div>

          <div className="w-20 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-600/30 transform -rotate-3">
            <Mail className="w-10 h-10 text-white drop-shadow-md" />
          </div>

          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#142622] border-2 border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-lg">
            <MailCheck className="w-4 h-4" />
          </div>
        </div>

        <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">
          No Sent Emails Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Emails sent by the BullMQ worker will show up here along with live Ethereal test preview links.
        </p>

        {onCompose && (
          <button
            onClick={onCompose}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose New Email</span>
            <span>&rarr;</span>
          </button>
        )}
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
            <th className="py-4 px-5">Sent At</th>
            <th className="py-4 px-5">Status</th>
            <th className="py-4 px-5 text-right">Ethereal Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c1f3d]">
          {jobs.map((job) => {
            const sentDate = job.sentAt ? new Date(job.sentAt) : null;
            const isSuccess = job.status === 'SENT';

            return (
              <tr key={job.id} className="hover:bg-[#151836] transition-colors">
                <td className="py-4 px-5 font-semibold text-white">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500 shadow-sm shadow-rose-500'}`}></span>
                    <span>{job.recipientEmail}</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-slate-300 max-w-xs truncate" title={job.subject}>
                  {job.subject}
                </td>
                <td className="py-4 px-5 text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                  {job.sender?.email || 'Ethereal Sender'}
                </td>
                <td className="py-4 px-5 text-xs text-slate-300 whitespace-nowrap">
                  {sentDate ? format(sentDate, 'MMM d, yyyy • h:mm a') : '—'}
                </td>
                <td className="py-4 px-5">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <MailCheck className="w-3.5 h-3.5" />
                      Sent
                    </span>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                      {job.errorMessage && (
                        <p className="text-[10px] text-rose-400/80 mt-1 max-w-[180px] truncate" title={job.errorMessage}>
                          {job.errorMessage}
                        </p>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-4 px-5 text-right">
                  {job.previewUrl ? (
                    <a
                      href={job.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl transition-colors hover:scale-105"
                    >
                      <span>View in Ethereal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No preview link</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

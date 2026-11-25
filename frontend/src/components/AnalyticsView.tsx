import React, { useMemo } from 'react';
import { EmailJob } from '../types';
import { 
  BarChart3, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsViewProps {
  scheduledJobs: EmailJob[];
  sentJobs: EmailJob[];
  onRefresh: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  scheduledJobs,
  sentJobs,
}) => {
  const sentCount = sentJobs.filter(j => j.status === 'SENT').length;
  const failedCount = sentJobs.filter(j => j.status === 'FAILED').length;
  const scheduledCount = scheduledJobs.length;
  const totalAttempted = sentCount + failedCount;

  const successRate = totalAttempted > 0 
    ? Math.round((sentCount / totalAttempted) * 100) 
    : 100;

  // Breakdown by sender account
  const senderAnalytics = useMemo(() => {
    const map = new Map<string, { email: string; sent: number; failed: number; scheduled: number }>();

    [...scheduledJobs, ...sentJobs].forEach(job => {
      const email = job.sender?.email || 'Default Ethereal Sender';
      if (!map.has(email)) {
        map.set(email, { email, sent: 0, failed: 0, scheduled: 0 });
      }
      const item = map.get(email)!;
      if (job.status === 'SENT') item.sent++;
      else if (job.status === 'FAILED') item.failed++;
      else item.scheduled++;
    });

    return Array.from(map.values());
  }, [scheduledJobs, sentJobs]);

  return (
    <div className="space-y-6 text-slate-200 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-gradient-to-r from-[#0c0e22] via-[#12132e] to-[#0a0c1e] shadow-2xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-cyan-600/20 flex-shrink-0">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Delivery Analytics
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Live Metrics
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Detailed tracking of email delivery success rates, throughput, and sender health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#141733] border border-cyan-500/20 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Delivery Status:</span>
          <span className="font-bold text-emerald-400">Optimal ({successRate}%)</span>
        </div>
      </div>

      {/* 2. 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Healthy
            </span>
          </div>
          <h3 className="text-3xl font-black text-white">{successRate}%</h3>
          <p className="text-xs text-slate-400 mt-1">Delivery Success Rate</p>
          <div className="w-full h-1.5 rounded-full bg-[#1b1f3c] mt-3 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        {/* Total Sent */}
        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-purple-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Delivered
            </span>
          </div>
          <h3 className="text-3xl font-black text-white">{sentCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Successfully Sent Emails</p>
          <svg className="w-full h-6 mt-2 text-purple-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,18 Q30,6 60,16 T100,6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* In Queue */}
        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Pending
            </span>
          </div>
          <h3 className="text-3xl font-black text-white">{scheduledCount}</h3>
          <p className="text-xs text-slate-400 mt-1">In Queue / Scheduled</p>
          <svg className="w-full h-6 mt-2 text-amber-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,15 Q35,22 70,8 T100,12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Failed / Bounced */}
        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-rose-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Errors
            </span>
          </div>
          <h3 className="text-3xl font-black text-white">{failedCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Failed Sends</p>
          <svg className="w-full h-6 mt-2 text-rose-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,20 Q40,10 70,18 T100,12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* 3. Senders Performance Table */}
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-base text-white">Sender Account Performance</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Ethereal SMTP Dispatchers
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#1f2244]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#14162e] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#212447]">
              <tr>
                <th className="py-3.5 px-4">Sender Email</th>
                <th className="py-3.5 px-4">Sent Count</th>
                <th className="py-3.5 px-4">Scheduled</th>
                <th className="py-3.5 px-4">Failures</th>
                <th className="py-3.5 px-4">Success Rate</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e3d]">
              {senderAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No sender telemetry recorded yet.
                  </td>
                </tr>
              ) : (
                senderAnalytics.map(s => {
                  const rate = (s.sent + s.failed) > 0 
                    ? Math.round((s.sent / (s.sent + s.failed)) * 100) 
                    : 100;
                  return (
                    <tr key={s.email} className="hover:bg-[#151836] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {s.email}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-mono font-bold">
                        {s.sent}
                      </td>
                      <td className="py-3.5 px-4 text-amber-300 font-mono">
                        {s.scheduled}
                      </td>
                      <td className="py-3.5 px-4 text-rose-400 font-mono">
                        {s.failed}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-white">{rate}%</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

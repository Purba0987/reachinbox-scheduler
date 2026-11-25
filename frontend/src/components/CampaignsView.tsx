import React, { useState, useMemo } from 'react';
import { EmailJob } from '../types';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  Users, 
  Layers, 
  Mail
} from 'lucide-react';

interface CampaignsViewProps {
  scheduledJobs: EmailJob[];
  sentJobs: EmailJob[];
  onOpenCompose: () => void;
  onRefresh: () => void;
}

interface CampaignGroup {
  id: string;
  name: string;
  subject: string;
  totalRecipients: number;
  sentCount: number;
  scheduledCount: number;
  failedCount: number;
  scheduledAt: string;
  createdAt: string;
  senderEmail: string;
  delaySeconds: number;
  hourlyLimit: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  jobs: EmailJob[];
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  scheduledJobs,
  sentJobs,
  onOpenCompose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  // Group real jobs into campaigns by batchId or subject
  const campaigns: CampaignGroup[] = useMemo(() => {
    const allJobs = [...scheduledJobs, ...sentJobs];
    const map = new Map<string, EmailJob[]>();

    allJobs.forEach(job => {
      const key = job.batchId || `campaign_${job.subject}_${job.createdAt.slice(0, 10)}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(job);
    });

    const groups: CampaignGroup[] = [];

    map.forEach((jobs, key) => {
      const firstJob = jobs[0];
      const sent = jobs.filter(j => j.status === 'SENT').length;
      const scheduled = jobs.filter(j => j.status === 'SCHEDULED' || j.status === 'PROCESSING' || j.status === 'RATE_LIMITED').length;
      const failed = jobs.filter(j => j.status === 'FAILED').length;

      let status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' = 'SCHEDULED';
      if (scheduled === 0 && sent > 0) {
        status = 'COMPLETED';
      } else if (sent > 0 && scheduled > 0) {
        status = 'IN_PROGRESS';
      }

      const campaignName = firstJob.subject ? `Campaign: ${firstJob.subject}` : `Batch #${key.substring(0, 8)}`;

      groups.push({
        id: key,
        name: campaignName,
        subject: firstJob.subject,
        totalRecipients: jobs.length,
        sentCount: sent,
        scheduledCount: scheduled,
        failedCount: failed,
        scheduledAt: firstJob.scheduledAt,
        createdAt: firstJob.createdAt,
        senderEmail: firstJob.sender?.email || 'Primary Ethereal Sender',
        delaySeconds: firstJob.delaySeconds || 2,
        hourlyLimit: firstJob.hourlyLimit || 5,
        status,
        jobs,
      });
    });

    return groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [scheduledJobs, sentJobs]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!c.name.toLowerCase().includes(q) && !c.subject.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const totalRecipients = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + c.totalRecipients, 0);
  }, [campaigns]);

  const activeCampaignsCount = useMemo(() => {
    return campaigns.filter(c => c.status === 'IN_PROGRESS' || c.status === 'SCHEDULED').length;
  }, [campaigns]);

  return (
    <div className="space-y-6 text-slate-200 animate-in fade-in duration-300">
      {/* 1. Hero Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-gradient-to-r from-[#0c0e22] via-[#12132e] to-[#0a0c1e] shadow-2xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 flex-shrink-0">
            <Megaphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Email Campaigns
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                BullMQ Batches
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Create and orchestrate bulk email marketing campaigns with rate limits & throttling
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCompose}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 z-10"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* 2. 4 Campaign Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-purple-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30">
              Total
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">{campaigns.length}</h3>
          <p className="text-xs text-slate-400">Total Campaigns Created</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Active
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">{activeCampaignsCount}</h3>
          <p className="text-xs text-slate-400">In Progress / Scheduled</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Delivered
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">
            {campaigns.filter(c => c.status === 'COMPLETED').length}
          </h3>
          <p className="text-xs text-slate-400">Completed Campaigns</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1022]/85 border border-indigo-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Audience
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">{totalRecipients}</h3>
          <p className="text-xs text-slate-400">Total Recipients Targeted</p>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns by name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-[#12142d] text-slate-400 hover:text-white'
              }`}
            >
              All Campaigns
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-[#12142d] text-amber-400 hover:text-white'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-[#12142d] text-emerald-400 hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* 4. Campaigns Cards Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Megaphone className="w-10 h-10 text-purple-400/40 mx-auto mb-2" />
            <p className="text-base font-bold text-white">No Campaigns Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;New Campaign&quot; to schedule your first email blast.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCampaigns.map(c => {
              const percent = c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;
              return (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-[#12142d]/80 border border-purple-500/20 hover:border-purple-500/50 transition-all shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-purple-300 text-[11px] font-bold">
                        #{c.id.substring(0, 12)}
                      </span>
                      {c.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Completed
                        </span>
                      ) : c.status === 'IN_PROGRESS' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Sending...
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          ⏳ Scheduled
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm line-clamp-1" title={c.subject}>
                      {c.subject || 'Untitled Campaign'}
                    </h3>

                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      <span>Sender: <strong className="text-slate-300">{c.senderEmail}</strong></span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold text-white">{c.sentCount} / {c.totalRecipients} sent ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#1c1f40] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-emerald-400 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Details Footer */}
                  <div className="pt-3 border-t border-[#1c1f3c] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Delay: {c.delaySeconds}s | Cap: {c.hourlyLimit}/hr</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

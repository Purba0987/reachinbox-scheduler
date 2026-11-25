import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  Clock, 
  Hourglass, 
  AlertTriangle, 
  Layers, 
  Search, 
  RefreshCw, 
  Eye, 
  Trash2, 
  RotateCcw, 
  ExternalLink, 
  Zap, 
  Sparkles, 
  Copy, 
  Check, 
  Database, 
  SlidersHorizontal,
  X,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { queueApi } from '../services/api';
import { PrioritizedJob, QueuePriorityStats } from '../types';

interface QueueMonitoringViewProps {
  onRefresh?: () => void;
  recentJobs?: any[];
}

export const QueueMonitoringView: React.FC<QueueMonitoringViewProps> = ({ 
  onRefresh 
}) => {
  // 1. Live Data State
  const [jobs, setJobs] = useState<PrioritizedJob[]>([]);
  const [stats, setStats] = useState<QueuePriorityStats>({
    totalPrioritized: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    activeJobs: 0,
    isPaused: false,
    counts: { active: 0, waiting: 0, delayed: 0, completed: 0, failed: 0, paused: 0 },
  });
  const [queueMeta, setQueueMeta] = useState({
    queueName: 'email-send-queue',
    connection: 'Healthy',
    workers: 5,
    rateLimit: '200 jobs/hour',
    minDelay: '2 seconds',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // 2. Filter & Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'createdAt' | 'scheduledAt'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 3. Modals & Dialog State
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<PrioritizedJob | null>(null);
  const [priorityModalJob, setPriorityModalJob] = useState<PrioritizedJob | null>(null);
  const [targetNewPriority, setTargetNewPriority] = useState<number>(2);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'primary',
    action: async () => {},
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);

  // API Base URL for Bull Board
  const bullBoardUrl = (import.meta.env.VITE_API_BASE_URL 
    ? (import.meta.env.VITE_API_BASE_URL as string).replace('/api', '') 
    : 'http://localhost:5000') + '/admin/queues';

  // 4. Data Fetching
  const fetchQueueData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [statsRes, jobsRes] = await Promise.all([
        queueApi.getStats(),
        queueApi.getPrioritizedJobs({
          search: searchQuery,
          priority: selectedPriority,
          status: selectedStatus,
          sortBy,
          sortOrder,
        }),
      ]);

      if (statsRes) {
        setQueueMeta({
          queueName: statsRes.queueName || 'email-send-queue',
          connection: statsRes.connection || 'Healthy',
          workers: statsRes.workers || 5,
          rateLimit: statsRes.rateLimit || '200 jobs/hour',
          minDelay: statsRes.minDelay || '2 seconds',
        });
        if (statsRes.stats) {
          setStats(statsRes.stats);
        } else if (jobsRes?.stats) {
          setStats(jobsRes.stats);
        }
      }

      if (jobsRes?.jobs) {
        setJobs(jobsRes.jobs);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.warn('Queue data fetch note:', err.message);
    } finally {
      setIsLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 350);
      }
    }
  }, [searchQuery, selectedPriority, selectedStatus, sortBy, sortOrder, onRefresh]);

  // Initial load and timer
  useEffect(() => {
    fetchQueueData();
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchQueueData();
    }, 4500);

    return () => clearInterval(interval);
  }, [fetchQueueData, autoRefreshEnabled]);

  // 5. Actions Handlers
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Job ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdatePriority = async (jobId: string, newPriority: number) => {
    setIsUpdatingAction(true);
    try {
      await queueApi.updatePriority(jobId, newPriority);
      toast.success(`Priority updated to ${newPriority === 1 ? 'High (1)' : newPriority === 3 ? 'Low (3)' : 'Medium (2)'}`);
      setPriorityModalJob(null);
      if (selectedJobForDetails && selectedJobForDetails.id === jobId) {
        setSelectedJobForDetails(prev => prev ? { 
          ...prev, 
          priority: newPriority, 
          priorityLabel: newPriority === 1 ? 'HIGH' : newPriority === 3 ? 'LOW' : 'MEDIUM' 
        } : null);
      }
      fetchQueueData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update job priority');
    } finally {
      setIsUpdatingAction(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setIsUpdatingAction(true);
    try {
      await queueApi.retryJob(jobId);
      toast.success(`Job #${jobId.substring(0, 6)} queued for retry`);
      setSelectedJobForDetails(null);
      fetchQueueData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to retry job');
    } finally {
      setIsUpdatingAction(false);
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    setIsUpdatingAction(true);
    try {
      await queueApi.removeJob(jobId);
      toast.success(`Job #${jobId.substring(0, 6)} removed from queue`);
      setSelectedJobForDetails(null);
      fetchQueueData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove job');
    } finally {
      setIsUpdatingAction(false);
    }
  };

  const handleToggleQueuePause = async () => {
    const isPaused = stats.isPaused;
    setConfirmDialog({
      isOpen: true,
      title: isPaused ? 'Resume Email Queue?' : 'Pause Email Queue?',
      description: isPaused
        ? 'Active workers will immediately resume dequeuing prioritized jobs from Redis.'
        : 'Paused queues will cease dispatching new jobs. Current executing jobs will complete gracefully.',
      confirmText: isPaused ? 'Resume Processing' : 'Pause Queue',
      variant: isPaused ? 'primary' : 'warning',
      action: async () => {
        try {
          if (isPaused) {
            await queueApi.resumeQueue();
            toast.success('BullMQ email queue resumed!');
          } else {
            await queueApi.pauseQueue();
            toast.warning('BullMQ email queue paused.');
          }
          fetchQueueData(true);
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to toggle queue state');
        }
      },
    });
  };

  // Client-side quick filter in case API returned unfiltered set
  const filteredAndSortedJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          job.id.toLowerCase().includes(q) ||
          job.recipientEmail.toLowerCase().includes(q) ||
          job.subject.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Priority
      if (selectedPriority !== 'ALL') {
        const targetP = parseInt(selectedPriority, 10);
        if (job.priority !== targetP) return false;
      }
      // Status
      if (selectedStatus !== 'ALL') {
        const s = selectedStatus.toUpperCase();
        if (s === 'ACTIVE' && !(job.status === 'PROCESSING' || job.bullState === 'active')) return false;
        if (s === 'COMPLETED' && !(job.status === 'SENT' || job.bullState === 'completed')) return false;
        if (s === 'FAILED' && !(job.status === 'FAILED' || job.bullState === 'failed')) return false;
        if (s === 'DELAYED' && !(job.bullState === 'delayed' || job.status === 'SCHEDULED' || job.status === 'RATE_LIMITED')) return false;
        if (s === 'WAITING' && job.bullState !== 'waiting') return false;
      }
      return true;
    });
  }, [jobs, searchQuery, selectedPriority, selectedStatus]);

  return (
    <div className="space-y-6 text-slate-200 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. Header Banner & Global Queue Controls                 */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-gradient-to-r from-[#0c0e22] via-[#12132e] to-[#0a0c1e] shadow-2xl overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 flex-shrink-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Prioritized Jobs
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-sm shadow-purple-500/10">
                <Sparkles className="w-3 h-3 text-purple-300" />
                BullMQ Priority Queue
              </span>
              {stats.isPaused && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Pause className="w-3 h-3" />
                  QUEUE PAUSED
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage High, Medium, and Low priority job execution in real-time
            </p>
          </div>
        </div>

        {/* Global Queue Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap z-10 w-full sm:w-auto">
          {/* Pause / Resume Button */}
          <button
            onClick={handleToggleQueuePause}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              stats.isPaused
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-600/15'
                : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-600/15'
            }`}
          >
            {stats.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Queue</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Queue</span>
              </>
            )}
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(prev => !prev)}
            title={autoRefreshEnabled ? 'Click to disable auto-refresh' : 'Click to enable auto-refresh'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoRefreshEnabled
                ? 'bg-purple-600/20 text-purple-200 border-purple-500/40 shadow-sm'
                : 'bg-[#14162e] text-slate-400 border-[#23274c]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{autoRefreshEnabled ? 'Live: 5s' : 'Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchQueueData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14162e] hover:bg-[#1a1d3c] border border-purple-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* External Bull-Board */}
          <a
            href={bullBoardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-700/80 to-indigo-700/80 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all border border-purple-400/30"
          >
            <span>Bull-Board UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 5 Queue Statistics Cards (Specific Requirement 1)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Prioritized Jobs */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/85 border border-purple-500/30 shadow-lg relative overflow-hidden group hover:border-purple-500/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/25 text-purple-200 border border-purple-500/30">
              Total Queue
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {stats.totalPrioritized}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Total Prioritized Jobs</p>
          </div>
          <svg className="w-full h-6 mt-2 text-purple-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,18 Q30,6 60,16 T100,6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 2: High Priority Jobs */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/85 border border-rose-500/35 shadow-lg relative overflow-hidden group hover:border-rose-500/70 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Flame className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]">
              Priority 1
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{stats.highPriority}</span>
              <span className="text-[11px] font-normal text-rose-300 font-mono">⚡ First Out</span>
            </h3>
            <p className="text-xs text-rose-200/80 font-medium">High Priority Jobs</p>
          </div>
          <svg className="w-full h-6 mt-2 text-rose-500/45" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,20 Q25,5 50,14 T100,4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 3: Medium Priority Jobs */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/85 border border-amber-500/35 shadow-lg relative overflow-hidden group hover:border-amber-500/70 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Clock className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Priority 2
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{stats.mediumPriority}</span>
              <span className="text-[11px] font-normal text-amber-300 font-mono">⏳ Standard</span>
            </h3>
            <p className="text-xs text-amber-200/80 font-medium">Medium Priority Jobs</p>
          </div>
          <svg className="w-full h-6 mt-2 text-amber-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,15 Q35,22 70,8 T100,12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 4: Low Priority Jobs */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/85 border border-blue-500/35 shadow-lg relative overflow-hidden group hover:border-blue-500/70 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.25)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              Priority 3
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{stats.lowPriority}</span>
              <span className="text-[11px] font-normal text-blue-300 font-mono">💤 Bulk</span>
            </h3>
            <p className="text-xs text-blue-200/80 font-medium">Low Priority Jobs</p>
          </div>
          <svg className="w-full h-6 mt-2 text-blue-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,22 Q30,8 60,18 T100,10" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 5: Currently Active Jobs */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/85 border border-emerald-500/35 shadow-lg relative overflow-hidden group hover:border-emerald-500/70 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {stats.activeJobs}
            </h3>
            <p className="text-xs text-emerald-300 font-medium">Currently Active Jobs</p>
          </div>
          <svg className="w-full h-6 mt-2 text-emerald-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,18 Q40,4 70,16 T100,5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. Worker Activity & Queue Health Info Bar               */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-[#0c0e22]/90 via-[#0f1128]/90 to-[#0c0e22]/90 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141733] border border-purple-500/20">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Queue:</span>
            <span className="font-mono text-purple-300 font-bold">{queueMeta.queueName}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141733] border border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Connection:</span>
            <span className="font-semibold text-emerald-400">{queueMeta.connection}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Workers:</span>
            <span className="font-bold text-white">{queueMeta.workers} active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Rate Limit:</span>
            <span className="font-bold text-amber-300">{queueMeta.rateLimit}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Min Delay:</span>
            <span className="font-bold text-slate-200">{queueMeta.minDelay}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. Priority Management & Jobs Table Section              */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/95 via-[#0a0c1e]/95 to-[#070815]/95 shadow-2xl p-6 relative overflow-hidden">
        {/* Top Header & Search & Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Prioritized Queue Jobs
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                ({filteredAndSortedJobs.length} {filteredAndSortedJobs.length === 1 ? 'job' : 'jobs'})
              </span>
            </div>

            {/* Priority Filter Badges (Requirement 3) */}
            <div className="flex items-center gap-1.5 p-1 bg-[#12142d] rounded-xl border border-purple-500/20 text-xs">
              <button
                onClick={() => setSelectedPriority('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedPriority === 'ALL'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedPriority('1')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  selectedPriority === '1'
                    ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'text-rose-400 hover:text-rose-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>High (1)</span>
              </button>
              <button
                onClick={() => setSelectedPriority('2')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  selectedPriority === '2'
                    ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'text-amber-400 hover:text-amber-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Med (2)</span>
              </button>
              <button
                onClick={() => setSelectedPriority('3')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  selectedPriority === '3'
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'text-blue-400 hover:text-blue-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Low (3)</span>
              </button>
            </div>
          </div>

          {/* Search, Status Filter & Sorting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input (Job ID, Recipient, Subject) */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Job ID, recipient email, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value="ALL" className="bg-[#0e1022]">All Statuses</option>
                <option value="ACTIVE" className="bg-[#0e1022]">► Active (Processing)</option>
                <option value="WAITING" className="bg-[#0e1022]">⏱ Waiting (In Queue)</option>
                <option value="DELAYED" className="bg-[#0e1022]">⏳ Delayed / Scheduled</option>
                <option value="COMPLETED" className="bg-[#0e1022]">✓ Completed (Sent)</option>
                <option value="FAILED" className="bg-[#0e1022]">✗ Failed</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="sm:col-span-3 flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value="priority" className="bg-[#0e1022]">Sort: Priority (High → Low)</option>
                <option value="createdAt" className="bg-[#0e1022]">Sort: Creation Time</option>
                <option value="scheduledAt" className="bg-[#0e1022]">Sort: Scheduled Time</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                className="p-2 bg-[#12142d] hover:bg-[#181a3d] border border-purple-500/30 rounded-xl text-slate-300 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Table View                                               */}
        {/* ======================================================== */}
        <div className="overflow-x-auto rounded-2xl border border-[#1f2244]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#14162e] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#212447]">
              <tr>
                <th className="py-3.5 px-4">Job ID</th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created At</th>
                <th className="py-3.5 px-4">Attempts</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e3d]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                      <p className="text-sm font-semibold text-white">Loading BullMQ Queue Jobs...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-purple-400/50 mb-1" />
                      <p className="text-sm font-semibold text-white">No Jobs Found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || selectedPriority !== 'ALL' || selectedStatus !== 'ALL'
                          ? 'No queue jobs match your current search and filter criteria.'
                          : 'No jobs are currently in the queue. Click "Compose & Schedule" to enqueue an email.'}
                      </p>
                      {(searchQuery || selectedPriority !== 'ALL' || selectedStatus !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedPriority('ALL');
                            setSelectedStatus('ALL');
                          }}
                          className="mt-2 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedJobs.map((job) => {
                  const priority = job.priority || 2;
                  return (
                    <tr key={job.id} className="hover:bg-[#151836] transition-colors group">
                      {/* Job ID with copy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-purple-300 font-bold">
                            #{job.id.substring(0, 6)}
                          </span>
                          <button
                            onClick={() => handleCopyId(job.id)}
                            title="Copy full Job ID"
                            className="text-slate-500 hover:text-purple-300 transition-colors p-1"
                          >
                            {copiedId === job.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[10px] font-bold border border-purple-500/30">
                            {job.recipientEmail.charAt(0).toUpperCase()}
                          </div>
                          <span>{job.recipientEmail}</span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={job.subject}>
                        {job.subject}
                      </td>

                      {/* Glowing Priority Badge (Requirement 2 & 7) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {priority === 1 ? (
                          <button
                            onClick={() => {
                              setPriorityModalJob(job);
                              setTargetNewPriority(1);
                            }}
                            title="High Priority (Click to change)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:scale-105 transition-transform"
                          >
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span>High (1)</span>
                          </button>
                        ) : priority === 3 ? (
                          <button
                            onClick={() => {
                              setPriorityModalJob(job);
                              setTargetNewPriority(3);
                            }}
                            title="Low Priority (Click to change)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)] hover:scale-105 transition-transform"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span>Low (3)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPriorityModalJob(job);
                              setTargetNewPriority(2);
                            }}
                            title="Medium Priority (Click to change)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:scale-105 transition-transform"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Med (2)</span>
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.status === 'SENT' || job.bullState === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span>✓</span> Completed
                          </span>
                        ) : job.status === 'FAILED' || job.bullState === 'failed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <span>✗</span> Failed
                          </span>
                        ) : job.status === 'PROCESSING' || job.bullState === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                            <span>►</span> Active
                          </span>
                        ) : job.status === 'RATE_LIMITED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <span>⏱</span> Rescheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <span>⏳</span> Delayed
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                        {job.createdAt ? new Date(job.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>

                      {/* Attempts */}
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#181b36] border border-purple-500/20 font-mono text-[10px]">
                          {job.attemptCount ?? 0} / {job.maxAttempts || 3}
                        </span>
                      </td>

                      {/* Actions (View Details, Edit Priority, Retry, Remove) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedJobForDetails(job)}
                            title="View Job Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-600/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Priority */}
                          <button
                            onClick={() => {
                              setPriorityModalJob(job);
                              setTargetNewPriority(job.priority || 2);
                            }}
                            title="Assign / Update Priority"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-600/20 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Retry (if failed) */}
                          {(job.status === 'FAILED' || job.bullState === 'failed') && (
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Retry Job Execution?',
                                  description: `Queue job #${job.id.substring(0, 6)} for immediate retry in BullMQ?`,
                                  confirmText: 'Retry Now',
                                  variant: 'primary',
                                  action: () => handleRetryJob(job.id),
                                });
                              }}
                              title="Retry Failed Job"
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-600/20 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Remove Job */}
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Remove Job from Queue?',
                                description: `Are you sure you want to delete job #${job.id.substring(0, 6)}? This action removes it permanently from Redis and database.`,
                                confirmText: 'Remove Job',
                                variant: 'danger',
                                action: () => handleRemoveJob(job.id),
                              });
                            }}
                            title="Remove Job"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-600/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. Job Details Modal (Requirement 4)                     */}
      {/* ======================================================== */}
      {selectedJobForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0d0f22] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1f3d] bg-[#12142d]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">Job Details</h3>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      #{selectedJobForDetails.id.substring(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">BullMQ Payload & Execution Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobForDetails(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1c1f3d] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Badges Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141632] border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Priority:</span>
                  {selectedJobForDetails.priority === 1 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                      <Flame className="w-3.5 h-3.5" /> High Priority (1)
                    </span>
                  ) : selectedJobForDetails.priority === 3 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      <ShieldCheck className="w-3.5 h-3.5" /> Low Priority (3)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Clock className="w-3.5 h-3.5" /> Medium Priority (2)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className="font-bold text-white font-mono uppercase">
                    {selectedJobForDetails.status}
                  </span>
                </div>
              </div>

              {/* Email Summary Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-[#111327] border border-[#1e2246]">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Recipient</p>
                  <p className="font-semibold text-white break-all">{selectedJobForDetails.recipientEmail}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111327] border border-[#1e2246]">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Sender</p>
                  <p className="font-semibold text-white break-all">{selectedJobForDetails.sender?.email || 'Default Ethereal Sender'}</p>
                </div>
              </div>

              {/* Subject & Body */}
              <div className="p-3.5 rounded-xl bg-[#111327] border border-[#1e2246] space-y-2">
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Subject</p>
                <p className="font-bold text-white text-sm">{selectedJobForDetails.subject}</p>
                <p className="text-[11px] text-slate-400 font-semibold uppercase pt-2">Message Body</p>
                <div className="p-3 bg-[#0a0c1b] rounded-lg border border-[#1a1c38] text-slate-300 whitespace-pre-wrap font-sans">
                  {selectedJobForDetails.body}
                </div>
              </div>

              {/* Execution Profiling */}
              <div className="p-3.5 rounded-xl bg-[#111327] border border-[#1e2246] space-y-2.5">
                <p className="text-[11px] text-slate-400 font-semibold uppercase">BullMQ Queue State</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Bull State</span>
                    <span className="text-purple-300 font-bold">{selectedJobForDetails.bullState}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Delay</span>
                    <span className="text-white">{selectedJobForDetails.delaySeconds}s</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Attempts Made</span>
                    <span className="text-white">{selectedJobForDetails.attemptCount || 0} / {selectedJobForDetails.maxAttempts || 3}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hourly Limit</span>
                    <span className="text-amber-300">{selectedJobForDetails.hourlyLimit}/hr</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1b1f3c] text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Created At:</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(selectedJobForDetails.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scheduled / Processed At:</span>
                    <span className="text-slate-300 font-mono">
                      {selectedJobForDetails.sentAt 
                        ? new Date(selectedJobForDetails.sentAt).toLocaleString()
                        : selectedJobForDetails.scheduledAt 
                          ? new Date(selectedJobForDetails.scheduledAt).toLocaleString() 
                          : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error callout for failed jobs (Requirement 4) */}
              {selectedJobForDetails.errorMessage && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Failed Execution Information</span>
                  </div>
                  <p className="font-mono text-[11px] whitespace-pre-wrap break-all bg-black/40 p-2.5 rounded-lg border border-rose-500/20">
                    {selectedJobForDetails.errorMessage}
                  </p>
                </div>
              )}

              {/* Ethereal Preview Link if sent */}
              {selectedJobForDetails.previewUrl && (
                <div className="p-3 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-between">
                  <span className="text-purple-300 font-medium">Ethereal Email Preview Available</span>
                  <a
                    href={selectedJobForDetails.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <span>Open Preview</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#1c1f3d] bg-[#12142d] flex items-center justify-between">
              <button
                onClick={() => {
                  const j = selectedJobForDetails;
                  setSelectedJobForDetails(null);
                  setPriorityModalJob(j);
                  setTargetNewPriority(j.priority || 2);
                }}
                className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Change Priority</span>
              </button>

              <div className="flex items-center gap-2">
                {(selectedJobForDetails.status === 'FAILED' || selectedJobForDetails.bullState === 'failed') && (
                  <button
                    onClick={() => handleRetryJob(selectedJobForDetails.id)}
                    disabled={isUpdatingAction}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Job</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedJobForDetails(null)}
                  className="px-4 py-2 bg-[#1b1f3c] hover:bg-[#252a50] text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. Edit Priority Modal (Requirement 2)                   */}
      {/* ======================================================== */}
      {priorityModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d0f22] border border-purple-500/30 rounded-3xl shadow-2xl p-6 text-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">Update Job Priority</h3>
              </div>
              <button
                onClick={() => setPriorityModalJob(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select new priority for job <span className="font-mono text-purple-300 font-bold">#{priorityModalJob.id.substring(0, 6)}</span> to <span className="text-white font-semibold">{priorityModalJob.recipientEmail}</span>. Changes apply live to BullMQ.
            </p>

            {/* Priority Selection Cards */}
            <div className="space-y-2.5">
              {/* Option 1: High */}
              <div
                onClick={() => setTargetNewPriority(1)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetNewPriority === 1
                    ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-[#12142d] border-[#1f2247] hover:border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">High Priority (1)</h4>
                    <p className="text-[11px] text-slate-400">Processed first before medium and low jobs</p>
                  </div>
                </div>
                {targetNewPriority === 1 && <Check className="w-4 h-4 text-rose-400" />}
              </div>

              {/* Option 2: Medium */}
              <div
                onClick={() => setTargetNewPriority(2)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetNewPriority === 2
                    ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-[#12142d] border-[#1f2247] hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Medium Priority (2)</h4>
                    <p className="text-[11px] text-slate-400">Standard FIFO processing queue</p>
                  </div>
                </div>
                {targetNewPriority === 2 && <Check className="w-4 h-4 text-amber-400" />}
              </div>

              {/* Option 3: Low */}
              <div
                onClick={() => setTargetNewPriority(3)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetNewPriority === 3
                    ? 'bg-blue-950/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-[#12142d] border-[#1f2247] hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Low Priority (3)</h4>
                    <p className="text-[11px] text-slate-400">Processed after higher priority queues clear</p>
                  </div>
                </div>
                {targetNewPriority === 3 && <Check className="w-4 h-4 text-blue-400" />}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2247]">
              <button
                onClick={() => setPriorityModalJob(null)}
                className="px-4 py-2 bg-[#171936] hover:bg-[#20234a] text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePriority(priorityModalJob.id, targetNewPriority)}
                disabled={isUpdatingAction}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
              >
                {isUpdatingAction ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Save Priority</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. Destructive Confirmation Modal (Requirement 5)       */}
      {/* ======================================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d0f22] border border-purple-500/30 rounded-3xl shadow-2xl p-6 text-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                confirmDialog.variant === 'danger'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : confirmDialog.variant === 'warning'
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                    : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please confirm your action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#12142d] p-3.5 rounded-2xl border border-[#1f2247]">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2247]">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#171936] hover:bg-[#20234a] text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const act = confirmDialog.action;
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  await act();
                }}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : confirmDialog.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

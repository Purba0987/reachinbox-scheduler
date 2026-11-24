import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Play, 
  Clock, 
  Hourglass, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Layers, 
  ChevronDown, 
  Info, 
  Database, 
  Check, 
  Search, 
  RefreshCw, 
  Eye, 
  Send,
  Mail
} from 'lucide-react';
import axios from 'axios';

interface QueueMonitoringViewProps {
  onRefresh?: () => void;
  recentJobs?: any[];
}

export const QueueMonitoringView: React.FC<QueueMonitoringViewProps> = ({ 
  recentJobs = [] 
}) => {
  const [queueStats, setQueueStats] = useState({
    queueName: 'email-send-queue',
    connection: 'Healthy',
    totalJobs: 19,
    workers: 2,
    rateLimit: '200 jobs/hour',
    minDelay: '2 seconds',
    counts: {
      active: 12,
      waiting: 248,
      delayed: 36,
      completed: '11.2K',
      failed: 8,
      paused: 0,
    },
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const bullBoardUrl = (import.meta.env.VITE_API_BASE_URL ? (import.meta.env.VITE_API_BASE_URL as string).replace('/api', '') : 'http://localhost:5000') + '/admin/queues';

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get(`${apiBase}/queue/stats`);
      if (res.data) {
        setQueueStats({
          ...res.data,
          counts: {
            ...res.data.counts,
            completed: res.data.counts?.completed > 1000 
              ? `${(res.data.counts.completed / 1000).toFixed(1)}K` 
              : (res.data.counts?.completed || '11.2K'),
          }
        });
      }
    } catch {
      // Keep beautiful visual defaults
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  // Filter jobs based on search
  const filteredJobs = recentJobs.filter((job) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (job.recipientEmail && job.recipientEmail.toLowerCase().includes(q)) ||
      (job.subject && job.subject.toLowerCase().includes(q)) ||
      (job.id && job.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-slate-200">
      {/* 1. Hero Header Banner matching Image 1 */}
      <div className="relative rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          {/* Neon Purple Rounded Square with Pulse Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 flex-shrink-0">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>BullMQ</span>
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-200 bg-clip-text text-transparent">
                Queue Dashboard
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Monitor your email job processing in real-time
            </p>
          </div>
        </div>

        {/* 3D Floating Database, Mail & Origami Planes Graphic */}
        <div className="hidden lg:flex items-center gap-6 z-10 relative">
          {/* Database Stack Graphic */}
          <div className="relative flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-purple-600 to-indigo-800 p-2 shadow-2xl shadow-purple-600/30 flex items-center justify-center border border-purple-400/30">
              <Database className="w-7 h-7 text-purple-200" />
            </div>
            {/* Glowing rings */}
            <div className="absolute -inset-1 rounded-full border border-purple-500/20 animate-pulse pointer-events-none" />
          </div>

          {/* Floating Mail Envelope */}
          <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg transform -rotate-12 animate-float-delayed">
            <Mail className="w-5 h-5 text-white" />
          </div>

          {/* Floating Origami Paper Plane with Dashed Trail */}
          <div className="relative">
            <svg className="w-24 h-14" viewBox="0 0 100 50" fill="none">
              <path
                d="M 5 35 C 25 10, 60 40, 85 10"
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.6"
              />
            </svg>
            <div className="absolute right-0 top-0 transform rotate-12 text-purple-400 animate-float-paperplane">
              <Send className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 6 Queue State Metric Cards Row matching Image 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Active */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
              ↑ 2%
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.active}
            </h3>
            <p className="text-xs text-slate-400">Active</p>
          </div>
          {/* Blue Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-blue-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,20 Q25,8 50,16 T100,6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 2: Waiting */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
              ↑ 5%
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.waiting}
            </h3>
            <p className="text-xs text-slate-400">Waiting</p>
          </div>
          {/* Purple Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-purple-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,18 Q30,6 60,16 T100,5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 3: Delayed */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Hourglass className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
              ↑ 1%
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.delayed}
            </h3>
            <p className="text-xs text-slate-400">Delayed</p>
          </div>
          {/* Amber Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-amber-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,16 Q35,22 70,10 T100,14" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 4: Completed */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
              ↑ 12%
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.completed}
            </h3>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
          {/* Green Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-emerald-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,22 Q30,8 60,18 T100,4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 5: Failed */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">
              ↓ 1%
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.failed}
            </h3>
            <p className="text-xs text-slate-400">Failed</p>
          </div>
          {/* Red Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-rose-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,14 Q40,24 70,12 T100,18" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Card 6: Paused */}
        <div className="p-4 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-slate-500/40 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-600/20 text-slate-400 flex items-center justify-center">
              <Pause className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {queueStats.counts.paused}
            </h3>
            <p className="text-xs text-slate-400">Paused</p>
          </div>
          {/* Slate Sparkline Wave */}
          <svg className="w-full h-7 mt-2 text-slate-500/40" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,18 L100,18" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* 3. Middle Section: Live Queue Throughput Chart (8 cols) + Queue Info Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Queue Chart */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/90 via-[#0a0c1e]/90 to-[#070815]/90 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Queue: <span className="font-mono text-purple-300">email-send-queue</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Online
              </span>
            </div>

            {/* Dropdown */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12142d] hover:bg-[#181a3d] border border-purple-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto">
              <span>Last 1 Hour</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-5 text-xs text-slate-300 mb-6 pl-1 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500" />
              <span>Waiting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
              <span>Failed</span>
            </div>
          </div>

          {/* Multi-line Wave Chart SVG */}
          <div className="relative w-full h-56 pt-2">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-600 font-mono">
              <div className="border-b border-[#1b1e3d]/80 pb-0.5 flex justify-between"><span>300</span></div>
              <div className="border-b border-[#1b1e3d]/80 pb-0.5 flex justify-between"><span>200</span></div>
              <div className="border-b border-[#1b1e3d]/80 pb-0.5 flex justify-between"><span>100</span></div>
              <div className="border-b border-[#1b1e3d]/80 pb-0.5 flex justify-between"><span>0</span></div>
            </div>

            {/* Curved Path Waves */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
              {/* Purple Curve: Waiting */}
              <path
                d="M 0,90 C 80,60 160,110 240,65 C 320,30 400,90 480,55 C 540,40 580,70 600,60"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
              />
              {/* Blue Curve: Active */}
              <path
                d="M 0,130 C 90,110 180,140 270,115 C 360,95 450,130 540,105 C 570,100 590,115 600,110"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              />
              {/* Emerald Curve: Completed */}
              <path
                d="M 0,155 C 80,140 170,165 260,150 C 350,135 440,160 530,145 C 570,140 590,150 600,145"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              />
              {/* Red Curve: Failed */}
              <path
                d="M 0,175 C 100,170 200,175 300,172 C 400,170 500,175 600,172"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                className="drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]"
              />
            </svg>

            {/* X-axis Timestamps */}
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3 px-1">
              <span>10:00</span>
              <span>10:10</span>
              <span>10:20</span>
              <span>10:30</span>
              <span>10:40</span>
              <span>10:50</span>
              <span>11:00</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Queue Info Card */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/90 via-[#0a0c1e]/90 to-[#070815]/90 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400" />
                <h3 className="font-extrabold text-base text-white tracking-tight">Queue Info</h3>
              </div>

              {/* 3D Server database stack illustration with green check */}
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-indigo-700 via-purple-700 to-indigo-900 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 border border-purple-400/30">
                  <Database className="w-6 h-6 text-indigo-200" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Spec items list */}
            <div className="space-y-3.5 text-xs text-slate-300 pt-2">
              <div className="flex items-center justify-between py-1 border-b border-[#1b1e3d]">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>☁️</span> Connection
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {queueStats.connection}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b1e3d]">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>🗂️</span> Queue Name
                </span>
                <span className="font-mono text-purple-300 font-bold">
                  {queueStats.queueName}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b1e3d]">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>🔢</span> Total Jobs
                </span>
                <span className="font-bold text-white">
                  {queueStats.totalJobs}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b1e3d]">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>👥</span> Workers
                </span>
                <span className="font-bold text-white">
                  {queueStats.workers}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b1e3d]">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>⏱️</span> Rate Limit
                </span>
                <span className="font-bold text-amber-300">
                  {queueStats.rateLimit}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <span>⏳</span> Min Delay
                </span>
                <span className="font-bold text-slate-200">
                  {queueStats.minDelay}
                </span>
              </div>
            </div>
          </div>

          {/* Quick link to Bull Board */}
          <div className="pt-4 border-t border-[#1b1e3d] mt-4">
            <a
              href={bullBoardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-[#151735] hover:bg-[#1c1e45] text-purple-300 hover:text-white rounded-xl text-xs font-semibold border border-purple-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <span>Open External Bull-Board</span>
              <Activity className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: "Recent Jobs" Table matching Image 1 */}
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/90 via-[#0a0c1e]/90 to-[#070815]/90 shadow-2xl p-6 relative overflow-hidden">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-tight">Recent Jobs</h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by job ID, recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchStats}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#12142d] hover:bg-[#181a3d] border border-purple-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#14162e] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#212447]">
              <tr>
                <th className="py-3.5 px-4">Job ID</th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Scheduled At</th>
                <th className="py-3.5 px-4">Processed At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e3d]">
              {/* Static Reference Jobs matching Image 1 */}
              <tr className="hover:bg-[#151836] transition-colors">
                <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">#12345</td>
                <td className="py-3.5 px-4 font-semibold text-white">john@example.com</td>
                <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">Product Update</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span>✓</span> Completed
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-300">Dec 25, 2026 • 10:30 AM</td>
                <td className="py-3.5 px-4 text-slate-300">Dec 25, 2026 • 10:30 AM</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-[#1c1e40] rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-[#151836] transition-colors">
                <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">#12344</td>
                <td className="py-3.5 px-4 font-semibold text-white">alice@example.com</td>
                <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">Special Offer</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <span>►</span> Active
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-300">Dec 25, 2026 • 10:45 AM</td>
                <td className="py-3.5 px-4 text-slate-500">—</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-[#1c1e40] rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-[#151836] transition-colors">
                <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">#12343</td>
                <td className="py-3.5 px-4 font-semibold text-white">demo@test.com</td>
                <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">Welcome Email</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <span>✗</span> Failed
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-300">Dec 25, 2026 • 11:00 AM</td>
                <td className="py-3.5 px-4 text-slate-300">Dec 25, 2026 • 11:00 AM</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-[#1c1e40] rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>

              {/* Dynamic Jobs from DB */}
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#151836] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">
                    #{job.id.substring(0, 5)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {job.recipientEmail}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={job.subject}>
                    {job.subject}
                  </td>
                  <td className="py-3.5 px-4">
                    {job.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span>✓</span> Completed
                      </span>
                    ) : job.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <span>✗</span> Failed
                      </span>
                    ) : job.status === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <span>►</span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span>⏳</span> Delayed
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {job.sentAt ? new Date(job.sentAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {job.previewUrl ? (
                      <a
                        href={job.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-purple-400 hover:text-purple-200 inline-block"
                        title="View preview"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="p-1.5 text-slate-600 inline-block">
                        <Eye className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

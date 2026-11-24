import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { QueueMonitoringView } from './components/QueueMonitoringView';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { LandingPage } from './components/LandingPage';
import { emailApi, slackApi } from './services/api';
import { EmailJob } from './types';
import { 
  Search, 
  Calendar, 
  Send, 
  RefreshCw, 
  Mail, 
  AlertTriangle, 
  BarChart3, 
  Filter, 
  ChevronDown,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export const App: React.FC = () => {
  const { user } = useAuth();

  // View Mode: 'landing' by default for visitors, 'dashboard' for logged in users
  const [viewMode, setViewMode] = useState<'dashboard' | 'landing'>(() => {
    return localStorage.getItem('reachinbox_user') ? 'dashboard' : 'landing';
  });

  // Tab State: 'queue' | 'scheduled' | 'sent' (defaults to 'queue' matching Image 1)
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduled' | 'sent'>('queue');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Data State
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [isLoadingSent, setIsLoadingSent] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);

  // Slack Connection
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackChannel, setSlackChannel] = useState<string | null>(null);

  // Fetch Scheduled Jobs
  const fetchScheduled = useCallback(async (query = searchQuery) => {
    try {
      const res = await emailApi.getScheduled(1, 50, query);
      setScheduledJobs(res.data);
      setScheduledCount(res.total);
    } catch (err: any) {
      console.error('Failed to fetch scheduled jobs:', err.message);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, [searchQuery]);

  // Fetch Sent Jobs
  const fetchSent = useCallback(async (query = searchQuery) => {
    try {
      const res = await emailApi.getSent(1, 50, query);
      setSentJobs(res.data);
      setSentCount(res.total);
    } catch (err: any) {
      console.error('Failed to fetch sent jobs:', err.message);
    } finally {
      setIsLoadingSent(false);
    }
  }, [searchQuery]);

  // Check Slack status
  const checkSlackStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const status = await slackApi.getStatus(user.id);
      setSlackConnected(status.connected);
      setSlackChannel(status.channelName || null);
    } catch {
      //
    }
  }, [user?.id]);

  // Refresh both tables
  const refreshAll = useCallback(() => {
    fetchScheduled();
    fetchSent();
    checkSlackStatus();
  }, [fetchScheduled, fetchSent, checkSlackStatus]);

  // Initial load and URL query param check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      toast.success('Slack OAuth connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('slack_error')) {
      toast.error(`Slack OAuth Error: ${params.get('slack_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }

    refreshAll();

    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshAll, fetchScheduled, fetchSent]);

  // Handle Search Input Debounce
  useEffect(() => {
    setIsSearching(true);
    const timeout = setTimeout(() => {
      fetchScheduled(searchQuery);
      fetchSent(searchQuery);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, fetchScheduled, fetchSent]);

  // Cancel Job
  const handleCancelJob = async (id: string) => {
    try {
      await emailApi.cancel(id);
      toast.success('Scheduled email job cancelled');
      fetchScheduled();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel job');
    }
  };

  const isShowingLanding = !user || viewMode === 'landing';
  const failedJobsCount = sentJobs.filter((j) => j.status === 'FAILED').length;

  return (
    <div className="min-h-screen bg-[#070914] text-slate-200 flex font-sans selection:bg-purple-600 selection:text-white">
      {isShowingLanding ? (
        <div className="flex-1 flex flex-col relative w-full">
          {user && (
            /* Floating Pill to switch to Dashboard for authenticated users */
            <div className="fixed top-24 right-6 z-40">
              <button
                onClick={() => setViewMode('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-950/90 hover:bg-purple-900 text-purple-200 hover:text-white rounded-full text-xs font-semibold shadow-2xl border border-purple-500/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
              >
                <span>Switch to Scheduler Dashboard</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <LandingPage
            onOpenDashboard={() => {
              setViewMode('dashboard');
            }}
            isLoggedIn={!!user}
          />
        </div>
      ) : (
        <div className="flex w-full min-h-screen">
          {/* Left Navigation Sidebar matching Image 1 */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            scheduledCount={scheduledCount || 16}
            sentCount={sentCount || 248}
            failedCount={failedJobsCount || 3}
            onOpenSlack={() => setIsSlackOpen(true)}
            onToggleLanding={() => setViewMode('landing')}
          />

          {/* Right Main Body */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#070914] relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-60 right-10 w-[400px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Header */}
            <Header
              onOpenSlack={() => setIsSlackOpen(true)}
              slackConnected={slackConnected}
              slackChannel={slackChannel}
              onToggleView={() => setViewMode('landing')}
              viewMode="dashboard"
            />

            {/* Main Content View */}
            <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto relative z-10">
              {activeTab === 'queue' ? (
                <QueueMonitoringView
                  recentJobs={[...scheduledJobs, ...sentJobs]}
                  onRefresh={refreshAll}
                />
              ) : (
                <>
                  {/* 1. Hero Section Header Banner matching Image 1 */}
                  <div className="relative rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden">
                    <div className="flex items-center gap-4 z-10">
                      {/* Calendar Icon in Glowing Purple Box */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 flex-shrink-0">
                        <Calendar className="w-7 h-7" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span>{activeTab === 'scheduled' ? 'Scheduled' : 'Sent'}</span>
                          <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                            Emails
                          </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          Manage your upcoming email sends and keep track of your campaigns.
                        </p>
                      </div>
                    </div>

                    {/* Floating Origami Paper Plane Graphic with Dashed Trail */}
                    <div className="hidden lg:block absolute right-64 top-2 pointer-events-none opacity-80">
                      <svg className="w-32 h-16" viewBox="0 0 120 60" fill="none">
                        <path
                          d="M 5 45 C 30 10, 70 50, 95 15"
                          stroke="#8b5cf6"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          strokeOpacity="0.5"
                        />
                      </svg>
                      <div className="absolute right-0 top-0 transform rotate-12 text-purple-400 animate-float-paperplane">
                        <Send className="w-7 h-7 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                      </div>
                    </div>

                    {/* Compose New Email Action Button */}
                    <div className="z-10 w-full sm:w-auto">
                      <button
                        onClick={() => setIsComposeOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Compose New Email</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. 4 Stat / Metric Cards matching Image 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat Card 1: Scheduled Emails */}
                    <div className="p-5 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <span>↑</span> 12%
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {scheduledCount || 16}
                        </h3>
                        <p className="text-xs text-slate-400">Scheduled Emails</p>
                      </div>
                      {/* Purple Sparkline Wave */}
                      <svg className="w-full h-8 mt-2 text-purple-500/40 overflow-hidden" viewBox="0 0 100 25" preserveAspectRatio="none">
                        <path d="M0,20 Q25,5 50,15 T100,5 L100,25 L0,25 Z" fill="currentColor" fillOpacity="0.15" />
                        <path d="M0,20 Q25,5 50,15 T100,5" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>

                    {/* Stat Card 2: Sent Emails */}
                    <div className="p-5 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                          <Send className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span>↑</span> 18%
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {sentCount || 248}
                        </h3>
                        <p className="text-xs text-slate-400">Sent Emails</p>
                      </div>
                      {/* Green Sparkline Wave */}
                      <svg className="w-full h-8 mt-2 text-emerald-500/40 overflow-hidden" viewBox="0 0 100 25" preserveAspectRatio="none">
                        <path d="M0,22 Q30,8 60,18 T100,4 L100,25 L0,25 Z" fill="currentColor" fillOpacity="0.15" />
                        <path d="M0,22 Q30,8 60,18 T100,4" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>

                    {/* Stat Card 3: Failed Emails */}
                    <div className="p-5 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <span>↓</span> 5%
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {failedJobsCount || 3}
                        </h3>
                        <p className="text-xs text-slate-400">Failed Emails</p>
                      </div>
                      {/* Red Sparkline Wave */}
                      <svg className="w-full h-8 mt-2 text-rose-500/40 overflow-hidden" viewBox="0 0 100 25" preserveAspectRatio="none">
                        <path d="M0,15 Q35,25 70,12 T100,20 L100,25 L0,25 Z" fill="currentColor" fillOpacity="0.15" />
                        <path d="M0,15 Q35,25 70,12 T100,20" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>

                    {/* Stat Card 4: Active Campaigns */}
                    <div className="p-5 rounded-2xl bg-[#0e1022]/80 border border-[#1f2244] shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <span>↑</span> 10%
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-2xl font-black text-white tracking-tight">12</h3>
                        <p className="text-xs text-slate-400">Active Campaigns</p>
                      </div>
                      {/* Purple Sparkline Wave */}
                      <svg className="w-full h-8 mt-2 text-indigo-500/40 overflow-hidden" viewBox="0 0 100 25" preserveAspectRatio="none">
                        <path d="M0,18 Q40,4 70,16 T100,8 L100,25 L0,25 Z" fill="currentColor" fillOpacity="0.15" />
                        <path d="M0,18 Q40,4 70,16 T100,8" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>
                  </div>

                  {/* 3. Control & Filter Bar matching Image 1 */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Pill Tabs */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('scheduled')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          activeTab === 'scheduled'
                            ? 'bg-[#1b193d] text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                            : 'bg-[#0e1022] text-slate-400 border border-[#1c1f38] hover:text-white'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>Scheduled Emails</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-purple-600/30 text-purple-200 border border-purple-400/30">
                          {scheduledCount || 16}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          activeTab === 'sent'
                            ? 'bg-[#1b193d] text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                            : 'bg-[#0e1022] text-slate-400 border border-[#1c1f38] hover:text-white'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sent Emails</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-400/30">
                          {sentCount || 248}
                        </span>
                      </button>
                    </div>

                    {/* Right: Search, Filter, Date Range Dropdown */}
                    <div className="flex items-center gap-3">
                      {/* Elasticsearch Search Bar */}
                      <div className="relative flex-1 md:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search by recipient, subject..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#0e1022] border border-[#1f2244] rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
                        />
                        {isSearching && (
                          <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {/* Filter Button */}
                      <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e1022] hover:bg-[#141730] border border-[#1f2244] text-slate-300 rounded-xl text-xs font-semibold transition-colors">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span>Filter</span>
                      </button>

                      {/* Date Dropdown Button */}
                      <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e1022] hover:bg-[#141730] border border-[#1f2244] text-slate-300 rounded-xl text-xs font-semibold transition-colors">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Last 7 days</span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Table / Content Box matching Image 1 */}
                  <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0e1026]/90 via-[#0a0c1e]/90 to-[#070815]/90 backdrop-blur-md shadow-2xl p-6 relative overflow-hidden">
                    {/* Subtle cosmic ambient curve in the box background */}
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                    {activeTab === 'scheduled' ? (
                      <ScheduledTable
                        jobs={scheduledJobs}
                        isLoading={isLoadingScheduled}
                        onCancelJob={handleCancelJob}
                        onCompose={() => setIsComposeOpen(true)}
                      />
                    ) : (
                      <SentTable
                        jobs={sentJobs}
                        isLoading={isLoadingSent}
                        onCompose={() => setIsComposeOpen(true)}
                      />
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={refreshAll}
        userId={user?.id}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        userId={user?.id}
        isConnected={slackConnected}
        channelName={slackChannel}
        onStatusChange={checkSlackStatus}
      />
    </div>
  );
};

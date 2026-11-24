import React, { useState } from 'react';
import { slackApi } from '../services/api';
import { X, Hash, BellRing, ExternalLink, ShieldCheck, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  isConnected: boolean;
  channelName?: string | null;
  onStatusChange: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  userId,
  isConnected,
  channelName,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [customChannel, setCustomChannel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleConnectOAuth = () => {
    if (!userId) {
      toast.error('Please log in first to connect Slack');
      return;
    }
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.location.href = `${backendUrl}/slack/auth?userId=${userId}`;
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      toast.error('Please enter a valid Slack Incoming Webhook URL (starts with https://hooks.slack.com/)');
      return;
    }

    setIsSubmitting(true);
    try {
      await slackApi.connectWebhook(userId || 'default_user', webhookUrl, customChannel || '#general');
      toast.success('Slack connected and test ping delivered to channel!');
      onStatusChange();
      setWebhookUrl('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to connect Slack webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    try {
      await slackApi.sendTestNotification(userId || 'default_user');
      toast.success('Live test alert successfully delivered to your Slack channel!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Test alert failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack?')) return;
    try {
      await slackApi.disconnect(userId || 'default_user');
      toast.success('Slack disconnected successfully');
      onStatusChange();
    } catch (err: any) {
      toast.error('Failed to disconnect Slack');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0e1017] border border-[#23283c] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2333] bg-[#12141f]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Slack Notifications</h2>
              <p className="text-xs text-gray-400">Live alerts when hourly rate limits are exceeded</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1c2030] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Current Connection Status */}
          <div className="p-4 rounded-xl border border-[#202538] bg-[#131622] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-gray-200">
                  {isConnected ? 'Active & Receiving Alerts' : 'Slack Not Connected'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {isConnected
                    ? `Posting to ${channelName || '#general'}`
                    : 'Rate limit hits will silently continue without crashing'}
                </p>
              </div>
            </div>

            {isConnected && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Sending...' : 'Test Alert'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Disconnect Slack"
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Connection Options */}
          {!isConnected && (
            <div className="space-y-4">
              {/* Option A: Slack OAuth */}
              <div className="p-4 rounded-xl bg-[#12141f] border border-[#1f2333]">
                <h4 className="text-xs font-semibold text-gray-200 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Option A: One-Click Slack OAuth
                </h4>
                <p className="text-xs text-gray-400 mb-3">
                  Authorizes ReachInbox directly via Slack App OAuth flow.
                </p>
                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#4A154B] hover:bg-[#5c1c5e] text-white text-xs font-semibold rounded-lg shadow transition-all"
                >
                  <Hash className="w-4 h-4" />
                  <span>Connect with Slack OAuth</span>
                </button>
              </div>

              {/* Option B: Incoming Webhook */}
              <form onSubmit={handleSaveWebhook} className="p-4 rounded-xl bg-[#12141f] border border-[#1f2333] space-y-3">
                <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  Option B: Incoming Webhook URL (Instant Demo)
                </h4>
                <p className="text-xs text-gray-400">
                  Paste any Slack Incoming Webhook URL to verify live notifications instantly.
                </p>

                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  className="w-full bg-[#171a27] border border-[#272d42] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                />

                <input
                  type="text"
                  placeholder="Channel name (optional, e.g. #rate-limit-alerts)"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  className="w-full bg-[#171a27] border border-[#272d42] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying & Saving...' : 'Save Webhook & Test Ping'}
                </button>
              </form>
            </div>
          )}

          {/* Explanation note */}
          <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-gray-300 leading-relaxed">
            💡 <strong>ReachInbox Live Scheduler Rule:</strong> The moment any sender crosses their configured hourly email limit, BullMQ preserves the job, reschedules it for the next hour window, and immediately dispatches a real alert to this Slack channel.
          </div>
        </div>
      </div>
    </div>
  );
};

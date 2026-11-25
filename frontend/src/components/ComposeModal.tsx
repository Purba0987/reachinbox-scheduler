import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Sender } from '../types';
import { senderApi, emailApi } from '../services/api';
import { X, Upload, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string | null;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess, userId }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [manualRecipients, setManualRecipients] = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');

  // Scheduling options
  const [startTime, setStartTime] = useState<string>(() => {
    // Default to 1 minute in future
    const d = new Date(Date.now() + 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSenders();
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      const data = await senderApi.getAll();
      setSenders(data);
      if (data.length > 0) {
        const defaultSender = data.find(s => s.isDefault) || data[0];
        setSelectedSenderId(defaultSender.id);
      }
    } catch {
      //
    }
  };

  // Parse CSV or Text file of leads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const textContent = JSON.stringify(results.data);
        const matches = textContent.match(emailRegex) || [];
        const uniqueEmails = Array.from(new Set(matches.map(m => m.toLowerCase())));

        if (uniqueEmails.length === 0) {
          toast.error('No valid email addresses found in the file');
          return;
        }

        setDetectedEmails(prev => Array.from(new Set([...prev, ...uniqueEmails])));
        toast.success(`Detected ${uniqueEmails.length} email lead(s) from file!`);
      },
      error: (err) => {
        toast.error(`Error reading CSV: ${err.message}`);
      },
    });
  };

  const handleManualEmailAdd = () => {
    if (!manualRecipients.trim()) return;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = manualRecipients.match(emailRegex) || [];
    const unique = Array.from(new Set(matches.map(m => m.toLowerCase())));

    if (unique.length === 0) {
      toast.error('No valid emails detected');
      return;
    }

    setDetectedEmails(prev => Array.from(new Set([...prev, ...unique])));
    setManualRecipients('');
    toast.success(`Added ${unique.length} email(s)`);
  };

  const removeEmail = (emailToRemove: string) => {
    setDetectedEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (detectedEmails.length === 0) {
      toast.error('Please upload a CSV or add at least one recipient email');
      return;
    }

    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!body.trim()) {
      toast.error('Email body is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await emailApi.schedule({
        recipients: detectedEmails,
        subject,
        body,
        scheduledAt: new Date(startTime).toISOString(),
        delaySeconds,
        hourlyLimit,
        senderId: selectedSenderId || undefined,
        userId: userId || undefined,
      });

      toast.success(`Successfully scheduled ${detectedEmails.length} email(s)!`);
      onSuccess();
      onClose();
      // Reset form
      setDetectedEmails([]);
      setSubject('');
      setBody('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e1017] border border-[#23283c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2333] bg-[#12141f]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compose & Schedule Emails</h2>
              <p className="text-xs text-gray-400">Queue emails with concurrency, delay, and rate limiting</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sender Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Select Sender
            </label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full bg-[#141724] border border-[#23283c] rounded-lg px-3.5 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              {senders.length === 0 ? (
                <>
                  <option value="primary_ethereal_sender">Primary Ethereal Sender (Marketing) • [Default]</option>
                  <option value="secondary_ethereal_sender">Secondary Ethereal Sender (Outreach)</option>
                </>
              ) : (
                senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) {s.isDefault ? '• [Default]' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Lead CSV/Text File Upload & Leads list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Recipients (Upload CSV / Text Leads)
              </label>
              {detectedEmails.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {detectedEmails.length} lead(s) detected
                </span>
              )}
            </div>

            {/* Drag & drop / upload area */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-center gap-2 p-3.5 bg-[#131622] hover:bg-[#181b2a] border border-dashed border-[#2a2f45] hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium text-gray-300">Click to upload leads (.csv, .txt)</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {detectedEmails.length > 0 && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      {detectedEmails.length} recipient lead(s) successfully detected & ready to queue
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetectedEmails([])}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Quick manual input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste emails separated by commas..."
                value={manualRecipients}
                onChange={(e) => setManualRecipients(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualEmailAdd())}
                className="flex-1 bg-[#141724] border border-[#23283c] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleManualEmailAdd}
                className="px-3 py-1.5 bg-[#1b1f2e] hover:bg-[#23283c] text-xs font-medium text-gray-200 border border-[#2b3046] rounded-lg transition-colors"
              >
                Add
              </button>
            </div>

            {/* Email chips list */}
            {detectedEmails.length > 0 && (
              <div className="max-h-24 overflow-y-auto p-2 bg-[#12141f] rounded-lg border border-[#1f2333] flex flex-wrap gap-1.5">
                {detectedEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 text-xs"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:text-red-400 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Email Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Transforming cold outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full bg-[#141724] border border-[#23283c] rounded-lg px-3.5 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Hi there, ReachInbox helps you discover high-intent leads..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="w-full bg-[#141724] border border-[#23283c] rounded-lg px-3.5 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Scheduler Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#12141f] rounded-xl border border-[#1f2333]">
            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-[#171a27] border border-[#272d42] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Delay between emails */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Delay Between Emails
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#171a27] border border-[#272d42] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-gray-400">sec</span>
              </div>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Hourly Cap / Sender
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#171a27] border border-[#272d42] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-gray-400">/hr</span>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f2333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#151824] hover:bg-[#1b1f2e] border border-[#23283c] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling in BullMQ...' : `Schedule ${detectedEmails.length || ''} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

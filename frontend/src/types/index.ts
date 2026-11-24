export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  hasSlack?: boolean;
  slackChannel?: string | null;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface EmailJob {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  bullJobId?: string | null;
  batchId?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  previewUrl?: string | null;
  errorMessage?: string | null;
  sender?: Sender | null;
  createdAt: string;
}

export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delaySeconds?: number;
  hourlyLimit?: number;
  senderId?: string | null;
  userId?: string | null;
}

export interface SlackStatus {
  connected: boolean;
  channelName?: string | null;
  teamName?: string | null;
}

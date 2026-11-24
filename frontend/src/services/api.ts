import axios from 'axios';
import { EmailJob, ScheduleEmailPayload, Sender, SlackStatus, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const emailApi = {
  schedule: async (payload: ScheduleEmailPayload) => {
    const res = await api.post('/emails/schedule', payload);
    return res.data;
  },
  getScheduled: async (page = 1, limit = 20, search = '') => {
    const res = await api.get<{
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      data: EmailJob[];
    }>('/emails/scheduled', {
      params: { page, limit, search },
    });
    return res.data;
  },
  getSent: async (page = 1, limit = 20, search = '') => {
    const res = await api.get<{
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      data: EmailJob[];
    }>('/emails/sent', {
      params: { page, limit, search },
    });
    return res.data;
  },
  search: async (query: string, status?: string) => {
    const res = await api.get('/emails/search', {
      params: { q: query, status },
    });
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },
};

export const senderApi = {
  getAll: async (): Promise<Sender[]> => {
    const res = await api.get('/senders');
    return res.data;
  },
  create: async (name: string, email?: string, autoGenerate = false): Promise<Sender> => {
    const res = await api.post('/senders', { name, email, autoGenerate });
    return res.data;
  },
};

export const authApi = {
  loginWithEmail: async (email: string, password: string): Promise<{ user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  googleLogin: async (credential?: string, profile?: any): Promise<{ user: User }> => {
    const res = await api.post('/auth/google', { credential, profile });
    return res.data;
  },
  getMe: async (email: string): Promise<{ user: User }> => {
    const res = await api.get('/auth/me', { params: { email } });
    return res.data;
  },
};

export const slackApi = {
  getStatus: async (userId: string): Promise<SlackStatus> => {
    const res = await api.get('/slack/status', { params: { userId } });
    return res.data;
  },
  connectWebhook: async (userId: string, webhookUrl: string, channelName?: string) => {
    const res = await api.post('/slack/webhook', { userId, webhookUrl, channelName });
    return res.data;
  },
  sendTestNotification: async (userId: string, senderEmail?: string) => {
    const res = await api.post('/slack/test', { userId, senderEmail });
    return res.data;
  },
  disconnect: async (userId: string) => {
    const res = await api.delete('/slack/disconnect', { data: { userId } });
    return res.data;
  },
};

export default api;

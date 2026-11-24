import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/reachinbox_scheduler?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ethereal: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
  },
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  defaultDelayBetweenEmails: parseInt(process.env.DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10),
  defaultMaxEmailsPerHour: parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER || '5', 10),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback',
    defaultWebhookUrl: process.env.SLACK_DEFAULT_WEBHOOK_URL || '',
  },
};

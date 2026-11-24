import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';

export const EMAIL_QUEUE_NAME = 'email-send-queue';

export interface EmailJobPayload {
  emailJobId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderId?: string | null;
  userId?: string | null;
  hourlyLimit: number;
  delaySeconds: number;
}

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 500, // Keep last 500 completed jobs in BullMQ dashboard
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for inspection
    },
  },
});

/**
 * Enqueue an email job into BullMQ with a calculated delay.
 * Uses emailJob.id as BullMQ jobId to guarantee strict idempotency.
 */
export async function enqueueEmailJob(emailJob: {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  senderId?: string | null;
  userId?: string | null;
  hourlyLimit: number;
  delaySeconds: number;
}, overrideDelayMs?: number) {
  const now = Date.now();
  const scheduledTime = new Date(emailJob.scheduledAt).getTime();
  const delay = overrideDelayMs !== undefined
    ? Math.max(0, overrideDelayMs)
    : Math.max(0, scheduledTime - now);

  const payload: EmailJobPayload = {
    emailJobId: emailJob.id,
    recipientEmail: emailJob.recipientEmail,
    subject: emailJob.subject,
    body: emailJob.body,
    senderId: emailJob.senderId,
    userId: emailJob.userId,
    hourlyLimit: emailJob.hourlyLimit,
    delaySeconds: emailJob.delaySeconds,
  };

  const job = await emailQueue.add(
    `send-email-${emailJob.recipientEmail}`,
    payload,
    {
      jobId: emailJob.id, // Idempotency key
      delay,
    }
  );

  // Update bullJobId in database
  await prisma.emailJob.update({
    where: { id: emailJob.id },
    data: { bullJobId: job.id },
  });

  return job;
}

/**
 * Startup Reconciler:
 * Runs on application boot to ensure complete persistence and restart resilience.
 * Checks for any pending SCHEDULED jobs in the database and ensures they are in BullMQ.
 */
export async function reconcilePendingJobsOnStartup() {
  console.log('🔄 [Startup] Checking for pending scheduled email jobs to reconcile...');
  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
      },
    });

    console.log(`📋 Found ${pendingJobs.length} scheduled email jobs in DB.`);

    let restoredCount = 0;
    const now = Date.now();

    for (const jobRecord of pendingJobs) {
      // Check if job exists in BullMQ
      const existingBullJob = await emailQueue.getJob(jobRecord.id);

      if (!existingBullJob) {
        const scheduledTime = new Date(jobRecord.scheduledAt).getTime();
        const delay = Math.max(0, scheduledTime - now);

        await emailQueue.add(
          `send-email-${jobRecord.recipientEmail}`,
          {
            emailJobId: jobRecord.id,
            recipientEmail: jobRecord.recipientEmail,
            subject: jobRecord.subject,
            body: jobRecord.body,
            senderId: jobRecord.senderId,
            userId: jobRecord.userId,
            hourlyLimit: jobRecord.hourlyLimit,
            delaySeconds: jobRecord.delaySeconds,
          },
          {
            jobId: jobRecord.id,
            delay,
          }
        );
        restoredCount++;
      }
    }

    console.log(`✅ [Startup] Reconciled and restored ${restoredCount} jobs in BullMQ.`);
  } catch (error: any) {
    console.error('⚠️ [Startup Reconciliation Error]:', error.message);
  }
}

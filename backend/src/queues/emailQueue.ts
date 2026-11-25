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
  priority?: number;
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
 * Enqueue an email job into BullMQ with a calculated delay and priority.
 * Uses emailJob.id as BullMQ jobId to guarantee strict idempotency.
 * In BullMQ: 1 = High, 2 = Medium, 3 = Low (lower number = higher priority).
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
  priority?: number;
}, overrideDelayMs?: number) {
  const now = Date.now();
  const scheduledTime = new Date(emailJob.scheduledAt).getTime();
  const delay = overrideDelayMs !== undefined
    ? Math.max(0, overrideDelayMs)
    : Math.max(0, scheduledTime - now);

  const priority = emailJob.priority || 2;

  const payload: EmailJobPayload = {
    emailJobId: emailJob.id,
    recipientEmail: emailJob.recipientEmail,
    subject: emailJob.subject,
    body: emailJob.body,
    senderId: emailJob.senderId,
    userId: emailJob.userId,
    hourlyLimit: emailJob.hourlyLimit,
    delaySeconds: emailJob.delaySeconds,
    priority,
  };

  const job = await emailQueue.add(
    `send-email-${emailJob.recipientEmail}`,
    payload,
    {
      jobId: emailJob.id, // Idempotency key
      delay,
      priority, // BullMQ priority option
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
 * Assign or update a job's priority live in BullMQ and PostgreSQL database.
 */
export async function changeJobPriority(jobId: string, priority: number) {
  const bullJob = await emailQueue.getJob(jobId);
  if (bullJob) {
    try {
      await bullJob.changePriority({ priority });
      console.log(`⚡ [BullMQ] Priority for job ${jobId} updated to ${priority}`);
    } catch (err: any) {
      console.warn(`⚠️ [BullMQ] Failed to update priority in BullMQ for ${jobId}:`, err.message);
    }
  }

  const updatedDbJob = await prisma.emailJob.update({
    where: { id: jobId },
    data: { priority },
  });

  return { bullJob, dbJob: updatedDbJob };
}

/**
 * Retry a failed job in BullMQ and reset DB status.
 */
export async function retryFailedJob(jobId: string) {
  const bullJob = await emailQueue.getJob(jobId);
  if (bullJob) {
    try {
      await bullJob.retry();
      console.log(`🔄 [BullMQ] Retried job ${jobId}`);
    } catch (err: any) {
      console.warn(`⚠️ [BullMQ] Error calling retry on BullMQ job ${jobId}:`, err.message);
    }
  }

  const updatedDbJob = await prisma.emailJob.update({
    where: { id: jobId },
    data: {
      status: 'SCHEDULED',
      errorMessage: null,
      scheduledAt: new Date(),
    },
  });

  // If the job wasn't active in BullMQ, re-enqueue it immediately
  if (!bullJob) {
    await enqueueEmailJob(updatedDbJob, 0);
  }

  return updatedDbJob;
}

/**
 * Remove an eligible job from BullMQ and cancel/delete from database.
 */
export async function removeQueueJob(jobId: string) {
  const bullJob = await emailQueue.getJob(jobId);
  if (bullJob) {
    try {
      await bullJob.remove();
      console.log(`🗑️ [BullMQ] Removed job ${jobId} from queue`);
    } catch (err: any) {
      console.warn(`⚠️ [BullMQ] Error removing BullMQ job ${jobId}:`, err.message);
    }
  }

  await prisma.emailJob.delete({
    where: { id: jobId },
  });

  return true;
}

/**
 * Pause the BullMQ email queue.
 */
export async function pauseEmailQueue() {
  await emailQueue.pause();
  console.log('⏸️ [BullMQ] Email queue paused.');
  return true;
}

/**
 * Resume the BullMQ email queue.
 */
export async function resumeEmailQueue() {
  await emailQueue.resume();
  console.log('▶️ [BullMQ] Email queue resumed.');
  return true;
}

/**
 * Check if the email queue is paused.
 */
export async function isEmailQueuePaused() {
  return await emailQueue.isPaused();
}

/**
 * Fetch live prioritized jobs combining BullMQ Redis queue state and PostgreSQL records.
 */
export async function getPrioritizedQueueData() {
  const [bullCounts, isPaused] = await Promise.all([
    emailQueue.getJobCounts('waiting', 'delayed', 'active', 'completed', 'failed', 'paused'),
    emailQueue.isPaused(),
  ]);

  const dbJobs = await prisma.emailJob.findMany({
    take: 100,
    orderBy: [
      { priority: 'asc' }, // 1 (High) first, 2 (Medium), 3 (Low)
      { createdAt: 'desc' },
    ],
    include: { sender: true },
  });

  const enrichedJobs = await Promise.all(
    dbJobs.map(async (dbJob) => {
      let bullState: string | null = null;
      let attemptsMade = dbJob.attemptCount;
      let failedReason = dbJob.errorMessage;
      let bullOpts: any = null;

      try {
        const bullJob = await emailQueue.getJob(dbJob.id);
        if (bullJob) {
          bullState = await bullJob.getState();
          attemptsMade = bullJob.attemptsMade;
          if (bullJob.failedReason) {
            failedReason = bullJob.failedReason;
          }
          bullOpts = {
            priority: bullJob.opts?.priority ?? dbJob.priority,
            delay: bullJob.opts?.delay,
            attempts: bullJob.opts?.attempts,
          };
        }
      } catch {
        // Fallback to DB state
      }

      const priorityNum = dbJob.priority ?? 2;
      const priorityLabel = priorityNum === 1 ? 'HIGH' : priorityNum === 3 ? 'LOW' : 'MEDIUM';

      return {
        id: dbJob.id,
        bullJobId: dbJob.bullJobId || dbJob.id,
        recipientEmail: dbJob.recipientEmail,
        subject: dbJob.subject,
        body: dbJob.body,
        priority: priorityNum,
        priorityLabel,
        status: dbJob.status,
        bullState: bullState || (dbJob.status === 'SENT' ? 'completed' : dbJob.status === 'PROCESSING' ? 'active' : dbJob.status === 'FAILED' ? 'failed' : 'delayed'),
        delaySeconds: dbJob.delaySeconds,
        hourlyLimit: dbJob.hourlyLimit,
        attemptCount: attemptsMade,
        maxAttempts: 3,
        scheduledAt: dbJob.scheduledAt,
        sentAt: dbJob.sentAt,
        createdAt: dbJob.createdAt,
        sender: dbJob.sender ? {
          id: dbJob.sender.id,
          name: dbJob.sender.name,
          email: dbJob.sender.email,
        } : null,
        previewUrl: dbJob.previewUrl,
        errorMessage: failedReason,
        opts: bullOpts,
      };
    })
  );

  const totalPrioritized = enrichedJobs.length;
  const highPriority = enrichedJobs.filter((j) => j.priority === 1).length;
  const mediumPriority = enrichedJobs.filter((j) => j.priority === 2).length;
  const lowPriority = enrichedJobs.filter((j) => j.priority === 3).length;
  const activeJobs = enrichedJobs.filter((j) => j.status === 'PROCESSING' || j.bullState === 'active').length;

  return {
    stats: {
      totalPrioritized,
      highPriority,
      mediumPriority,
      lowPriority,
      activeJobs: bullCounts.active || activeJobs,
      isPaused,
      counts: bullCounts,
    },
    jobs: enrichedJobs,
  };
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
            priority: jobRecord.priority || 2,
          },
          {
            jobId: jobRecord.id,
            delay,
            priority: jobRecord.priority || 2,
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

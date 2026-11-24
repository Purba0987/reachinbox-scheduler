import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { config } from '../config';
import { EMAIL_QUEUE_NAME, EmailJobPayload, emailQueue } from '../queues/emailQueue';
import { sendEmailViaEthereal, getOrCreateDefaultSender } from '../services/emailService';
import { checkAndIncrementRateLimit, decrementRateLimit } from '../services/rateLimitService';
import { sendSlackRateLimitNotification } from '../services/slackService';
import { indexEmailJobInElasticsearch } from '../services/elasticsearchService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startEmailWorker() {
  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { emailJobId, recipientEmail, subject, body, senderId, userId, hourlyLimit, delaySeconds } = job.data;
      console.log(`\n📨 [Worker] Processing email job ${job.id} for ${recipientEmail}...`);

      // 1. Fetch job from DB to check current state
      const dbJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { sender: true },
      });

      if (!dbJob) {
        console.warn(`⚠️ [Worker] Job ${emailJobId} not found in DB. Skipping.`);
        return { status: 'SKIPPED_NOT_FOUND' };
      }

      // Idempotency check: If already sent, do not resend!
      if (dbJob.status === 'SENT') {
        console.log(`ℹ️ [Worker] Job ${emailJobId} is already marked SENT. Skipping duplicate execution.`);
        return { status: 'ALREADY_SENT' };
      }

      // Mark as PROCESSING
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'PROCESSING',
          attemptCount: { increment: 1 },
        },
      });

      // 2. Identify sender
      let sender = dbJob.sender;
      if (!sender) {
        sender = await getOrCreateDefaultSender();
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: { senderId: sender.id },
        });
      }

      // 3. Rate Limit Check (Redis-backed atomic counter per sender per hour)
      const limit = hourlyLimit || config.defaultMaxEmailsPerHour;
      const rateLimitStatus = await checkAndIncrementRateLimit(sender.email, limit);

      if (!rateLimitStatus.allowed) {
        console.warn(
          `🚨 [Rate Limit Reached] Sender "${sender.email}" reached hourly cap of ${limit} emails/hr.` +
          ` Attempt count: ${rateLimitStatus.currentCount}. Rescheduling job for next hour window.`
        );

        // Update DB status to RATE_LIMITED
        const rescheduledTime = rateLimitStatus.nextAvailableTime;
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: rescheduledTime,
            errorMessage: `Postponed due to hourly rate limit (${limit}/hr). Rescheduled for ${rescheduledTime.toISOString()}`,
          },
        });

        // Record Rate Limit Event in DB
        const existingEvent = await prisma.rateLimitEvent.findFirst({
          where: {
            senderEmail: sender.email,
            hourWindow: rateLimitStatus.hourWindow,
          },
        });

        const shouldNotifySlack = !existingEvent || !existingEvent.slackNotified;

        if (!existingEvent) {
          await prisma.rateLimitEvent.create({
            data: {
              senderEmail: sender.email,
              hourWindow: rateLimitStatus.hourWindow,
              limitSet: limit,
              slackNotified: true,
            },
          });
        }

        // Live Slack Notification on Rate Limit Hit
        if (shouldNotifySlack) {
          console.log(`🔔 Sending Slack notification for sender ${sender.email}...`);
          await sendSlackRateLimitNotification({
            senderEmail: sender.email,
            hourlyLimit: limit,
            currentCount: rateLimitStatus.currentCount,
            nextAvailableTime: rescheduledTime,
            affectedRecipient: recipientEmail,
            userId: userId || dbJob.userId,
          });
        }

        // Reschedule in BullMQ for next available hour
        const delayUntilNextHour = Math.max(1000, rescheduledTime.getTime() - Date.now());
        // Remove current job and re-queue with updated delay
        const newBullJob = await emailQueue.add(
          `send-email-${recipientEmail}`,
          {
            ...job.data,
            senderId: sender.id,
          },
          {
            delay: delayUntilNextHour,
          }
        );

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: { bullJobId: newBullJob.id },
        });

        return {
          status: 'RESCHEDULED',
          rescheduledAt: rescheduledTime,
          reason: 'HOURLY_RATE_LIMIT_EXCEEDED',
        };
      }

      // 4. Provider Throttling: Delay between individual email sends
      const perEmailDelayMs = (delaySeconds ?? config.defaultDelayBetweenEmails) * 1000;
      if (perEmailDelayMs > 0) {
        console.log(`⏳ [Worker Throttling] Waiting ${perEmailDelayMs / 1000}s minimum delay between sends...`);
        await delay(perEmailDelayMs);
      }

      // 5. Send Email via Ethereal SMTP
      try {
        const sendResult = await sendEmailViaEthereal({
          to: recipientEmail,
          subject,
          body,
          senderId: sender.id,
        });

        const sentAt = new Date();

        // 6. Update DB status to SENT
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt,
            previewUrl: sendResult.previewUrl,
            errorMessage: null,
          },
        });

        // 7. Index in Elasticsearch for instant searchability
        await indexEmailJobInElasticsearch({
          id: updatedJob.id,
          recipientEmail: updatedJob.recipientEmail,
          subject: updatedJob.subject,
          body: updatedJob.body,
          status: updatedJob.status,
          scheduledAt: updatedJob.scheduledAt,
          sentAt: updatedJob.sentAt,
          senderEmail: sendResult.senderEmail,
          batchId: updatedJob.batchId,
          createdAt: updatedJob.createdAt,
        });

        console.log(`🎉 [Worker Success] Email sent to ${recipientEmail}! Preview: ${sendResult.previewUrl}`);

        return {
          status: 'SENT',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError: any) {
        console.error(`❌ [Worker Error] Failed to send email to ${recipientEmail}:`, sendError.message);

        // Decrement rate limit counter since send did not succeed
        await decrementRateLimit(sender.email);

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message,
          },
        });

        throw sendError; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: config.workerConcurrency, // Worker Concurrency configurable
      limiter: {
        max: 50, // Worker level guard limit
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ [BullMQ Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [BullMQ Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`🚀 [BullMQ Worker] Started with concurrency = ${config.workerConcurrency}`);

  return worker;
}

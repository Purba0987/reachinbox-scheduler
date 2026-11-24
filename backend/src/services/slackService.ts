import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config';

interface RateLimitAlertParams {
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  nextAvailableTime: Date;
  affectedRecipient: string;
  userId?: string | null;
}

export async function sendSlackRateLimitNotification(params: RateLimitAlertParams) {
  try {
    let webhookUrl: string | null = null;
    let accessToken: string | null = null;
    let channel: string | null = null;

    // Check if user has an active Slack integration
    if (params.userId) {
      const userSlack = await prisma.slackIntegration.findUnique({
        where: { userId: params.userId },
      });

      if (userSlack && userSlack.isActive) {
        webhookUrl = userSlack.webhookUrl;
        accessToken = userSlack.accessToken;
        channel = userSlack.channelId;
      }
    }

    // Fallback to default system webhook if configured in env
    if (!webhookUrl && !accessToken) {
      webhookUrl = config.slack.defaultWebhookUrl || null;
    }

    if (!webhookUrl && !accessToken) {
      console.log(`[Slack] No Slack integration configured for user ${params.userId || 'system'}. Skipping notification.`);
      return { success: false, reason: 'No Slack integration found' };
    }

    const resetFormatted = params.nextAvailableTime.toUTCString();

    const slackPayload = {
      text: `⚠️ *Hourly Rate Limit Reached for Sender:* \`${params.senderEmail}\``,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 ReachInbox Email Rate Limit Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Sender:* \`${params.senderEmail}\` has reached its configured limit of *${params.hourlyLimit} emails/hour*.\n` +
                  `*Current Count:* ${params.currentCount} attempts\n` +
                  `*Rescheduled Job Recipient:* \`${params.affectedRecipient}\`\n` +
                  `*Next Available Send Window:* \`${resetFormatted}\``,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🛡️ *BullMQ Queue Protection*: The job has NOT been dropped. It has been rescheduled automatically to the next hour window.',
            },
          ],
        },
      ],
    };

    if (webhookUrl) {
      await axios.post(webhookUrl, slackPayload);
      console.log(`✅ [Slack Notification Sent] Sent rate limit alert via Webhook to Slack for ${params.senderEmail}`);
      return { success: true, method: 'webhook' };
    }

    if (accessToken) {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: channel || '#general',
          ...slackPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ [Slack Notification Sent] Sent rate limit alert via Web API to Slack channel ${channel}`);
      return { success: true, method: 'oauth_api' };
    }

    return { success: false, reason: 'No delivery channel available' };
  } catch (error: any) {
    console.error(`❌ [Slack Notification Failed]: ${error.message}`);
    // Non-blocking: Do not crash worker or scheduler on Slack failure
    return { success: false, error: error.message };
  }
}

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config';

const router = Router();

// GET /api/slack/auth - Start Slack OAuth Flow
router.get('/auth', (req: Request, res: Response) => {
  const userId = req.query.userId as string || '';
  const redirectUri = encodeURIComponent(config.slack.redirectUri);
  const clientId = config.slack.clientId;

  if (!clientId) {
    return res.status(400).send('SLACK_CLIENT_ID not configured in backend .env. Please configure it or use Webhook option.');
  }

  const scopes = encodeURIComponent('incoming-webhook,chat:write');
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${userId}`;

  return res.redirect(slackAuthUrl);
});

// GET /api/slack/oauth/callback - Slack OAuth Redirect Handler
router.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    console.error('Slack OAuth error:', error);
    return res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.redirect(`${config.frontendUrl}?slack_error=no_code_provided`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code: String(code),
        redirect_uri: config.slack.redirectUri,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = tokenResponse.data;

    if (!data.ok) {
      console.error('Slack token exchange error:', data.error);
      return res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(data.error)}`);
    }

    const webhookUrl = data.incoming_webhook?.url || null;
    const channelName = data.incoming_webhook?.channel || null;
    const channelId = data.incoming_webhook?.channel_id || null;
    const teamName = data.team?.name || null;
    const teamId = data.team?.id || null;
    const accessToken = data.access_token || null;

    if (userId && typeof userId === 'string') {
      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          webhookUrl,
          channelName,
          channelId,
          teamName,
          teamId,
          accessToken,
          isActive: true,
        },
        create: {
          userId,
          webhookUrl,
          channelName,
          channelId,
          teamName,
          teamId,
          accessToken,
          isActive: true,
        },
      });
    }

    return res.redirect(`${config.frontendUrl}?slack_connected=true`);
  } catch (err: any) {
    console.error('Slack OAuth Exchange Exception:', err.message);
    return res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/slack/webhook - Direct Webhook Connect (Fast & Zero OAuth friction)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { userId, webhookUrl, channelName } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Valid Slack Webhook URL starting with https://hooks.slack.com/ is required' });
    }

    // Test the webhook with a welcome ping
    await axios.post(webhookUrl, {
      text: '🚀 *ReachInbox Email Scheduler Connected!* You will now receive live alerts here whenever an email sender hits their hourly rate limit.',
    });

    if (userId) {
      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          webhookUrl,
          channelName: channelName || '#general',
          isActive: true,
        },
        create: {
          userId,
          webhookUrl,
          channelName: channelName || '#general',
          isActive: true,
        },
      });
    }

    return res.json({ message: 'Slack Webhook connected successfully and test ping sent!' });
  } catch (error: any) {
    console.error('Slack webhook setup failed:', error.message);
    return res.status(500).json({ error: `Could not verify Slack webhook: ${error.message}` });
  }
});

// GET /api/slack/status - Check connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.json({ connected: false });
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    return res.json({
      connected: !!(integration && integration.isActive),
      channelName: integration?.channelName || null,
      teamName: integration?.teamName || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

// POST /api/slack/test - Send a test rate-limit alert to Slack
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { userId, senderEmail } = req.body;
    let webhookUrl: string | null = null;

    if (userId) {
      const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
      webhookUrl = integration?.webhookUrl || null;
    }

    if (!webhookUrl) {
      webhookUrl = config.slack.defaultWebhookUrl || null;
    }

    if (!webhookUrl) {
      return res.status(400).json({ error: 'No Slack integration or webhook URL connected' });
    }

    await axios.post(webhookUrl, {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 ReachInbox Slack Integration Test',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Success!* ReachInbox is successfully connected to this channel.\n` +
                  `*Test Sender:* \`${senderEmail || 'demo-sender@ethereal.email'}\`\n` +
                  `*Status:* Ready to receive live alerts when hourly limits are reached.`,
          },
        },
      ],
    });

    return res.json({ message: 'Test notification sent to Slack successfully!' });
  } catch (error: any) {
    return res.status(500).json({ error: `Slack test failed: ${error.message}` });
  }
});

// DELETE /api/slack/disconnect - Disconnect Slack
router.delete('/disconnect', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await prisma.slackIntegration.deleteMany({
      where: { userId },
    });

    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

export default router;

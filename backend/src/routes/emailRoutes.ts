import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { enqueueEmailJob } from '../queues/emailQueue';
import { searchEmailJobsFromElasticsearch, searchEmailJobsFromDatabase, indexEmailJobInElasticsearch } from '../services/elasticsearchService';
import { emailQueue } from '../queues/emailQueue';

const router = Router();

const scheduleEmailSchema = z.object({
  recipients: z.array(z.string().email('Invalid email format')).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  scheduledAt: z.string().or(z.date()),
  delaySeconds: z.number().int().min(0).optional().default(2),
  hourlyLimit: z.number().int().min(1).optional().default(5),
  senderId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  priority: z.union([z.number().int().min(1).max(3), z.string()]).optional().default(2),
});

// POST /api/emails/schedule - Accept email scheduling requests via API
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const validatedData = scheduleEmailSchema.parse(req.body);
    const scheduledDate = new Date(validatedData.scheduledAt);

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledAt date format' });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdJobs: any[] = [];

    // 1. Resolve a valid sender in the database to prevent foreign key errors
    let validSenderId: string | null = null;
    if (validatedData.senderId) {
      const existingSender = await prisma.sender.findUnique({
        where: { id: validatedData.senderId },
      });
      if (existingSender) {
        validSenderId = existingSender.id;
      }
    }
    if (!validSenderId) {
      try {
        const defaultSender = await prisma.sender.findFirst({ where: { isDefault: true } }) 
          || await prisma.sender.findFirst();
        if (defaultSender) {
          validSenderId = defaultSender.id;
        }
      } catch (err: any) {
        console.warn('Could not find existing sender in DB:', err.message);
      }
    }

    // 2. Resolve a valid userId in the database to prevent foreign key errors
    let validUserId: string | null = null;
    if (validatedData.userId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });
      if (existingUser) {
        validUserId = existingUser.id;
      }
    }

    // Resolve numeric priority: 1 = High, 2 = Medium, 3 = Low
    let resolvedPriority = 2;
    if (typeof validatedData.priority === 'number') {
      resolvedPriority = validatedData.priority;
    } else if (typeof validatedData.priority === 'string') {
      const p = validatedData.priority.toUpperCase();
      if (p === 'HIGH' || p === '1') resolvedPriority = 1;
      else if (p === 'LOW' || p === '3') resolvedPriority = 3;
      else resolvedPriority = 2;
    }

    // Create DB records and enqueue each job into BullMQ
    for (let i = 0; i < validatedData.recipients.length; i++) {
      const recipient = validatedData.recipients[i].trim();

      // Stagger start time slightly if multiple recipients in batch: i * delaySeconds
      const recipientScheduledAt = new Date(scheduledDate.getTime() + (i * validatedData.delaySeconds * 1000));

      const emailJob = await prisma.emailJob.create({
        data: {
          recipientEmail: recipient,
          subject: validatedData.subject,
          body: validatedData.body,
          scheduledAt: recipientScheduledAt,
          status: 'SCHEDULED',
          delaySeconds: validatedData.delaySeconds,
          hourlyLimit: validatedData.hourlyLimit,
          priority: resolvedPriority,
          senderId: validSenderId,
          userId: validUserId,
          batchId,
        },
      });

      // Enqueue in BullMQ with delayed execution
      await enqueueEmailJob(emailJob);

      // Index initial scheduled status in Elasticsearch
      await indexEmailJobInElasticsearch({
        id: emailJob.id,
        recipientEmail: emailJob.recipientEmail,
        subject: emailJob.subject,
        body: emailJob.body,
        status: emailJob.status,
        scheduledAt: emailJob.scheduledAt,
        batchId: emailJob.batchId,
        createdAt: emailJob.createdAt,
      });

      createdJobs.push(emailJob);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${createdJobs.length} email(s)`,
      batchId,
      count: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error scheduling email:', error);
    return res.status(500).json({ error: error.message || 'Internal server error while scheduling email' });
  }
});

// GET /api/emails/scheduled - View scheduled emails
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = (req.query.search as string) || '';

    if (search.trim()) {
      const result = await searchEmailJobsFromElasticsearch({
        query: search,
        status: 'SCHEDULED',
        page,
        limit,
      });
      return res.json(result);
    }

    const skip = (page - 1) * limit;
    const where = {
      status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING'] as any },
    };

    const [total, data] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: { sender: true },
      }),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error: any) {
    console.error('Error fetching scheduled emails:', error);
    return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
});

// GET /api/emails/sent - View sent emails
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = (req.query.search as string) || '';

    if (search.trim()) {
      const result = await searchEmailJobsFromElasticsearch({
        query: search,
        status: 'SENT',
        page,
        limit,
      });
      return res.json(result);
    }

    const skip = (page - 1) * limit;
    const where = {
      status: { in: ['SENT', 'FAILED'] as any },
    };

    const [total, data] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: { sender: true },
      }),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    return res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// GET /api/emails/search - Elasticsearch search API
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const status = req.query.status as string || undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    const result = await searchEmailJobsFromElasticsearch({
      query,
      status,
      page,
      limit,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Elasticsearch search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// DELETE /api/emails/:id - Cancel a scheduled email
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    if (job.status === 'SENT') {
      return res.status(400).json({ error: 'Cannot cancel an email that is already sent' });
    }

    // Remove from BullMQ if present
    const bullJob = await emailQueue.getJob(id);
    if (bullJob) {
      await bullJob.remove();
    }

    await prisma.emailJob.delete({ where: { id } });

    return res.json({ message: 'Email scheduled job cancelled successfully' });
  } catch (error: any) {
    console.error('Error deleting email job:', error);
    return res.status(500).json({ error: 'Failed to cancel email job' });
  }
});

export default router;

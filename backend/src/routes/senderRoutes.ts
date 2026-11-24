import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { createNewSender, getOrCreateDefaultSender, ensureMultipleSendersExist } from '../services/emailService';

const router = Router();

// GET /api/senders - List all senders (guarantees multiple senders for demo)
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureMultipleSendersExist();

    let senders = await prisma.sender.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      const defaultSender = await getOrCreateDefaultSender();
      senders = [defaultSender];
    }

    return res.json(senders);
  } catch (error: any) {
    console.warn('Error fetching senders from DB, using fallback multi-senders:', error.message);
    return res.json([
      {
        id: 'primary_ethereal_sender',
        name: 'Primary Ethereal Sender (Marketing)',
        email: 'marketing.campaigns@ethereal.email',
        isDefault: true,
      },
      {
        id: 'secondary_ethereal_sender',
        name: 'Secondary Ethereal Sender (Outreach)',
        email: 'outreach.leads@ethereal.email',
        isDefault: false,
      },
    ]);
  }
});

// POST /api/senders - Add a new sender (or auto-generate ethereal sender)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, autoGenerate } = req.body;

    if (autoGenerate) {
      const newSender = await createNewSender(name || `Ethereal Sender ${Date.now()}`);
      return res.status(201).json(newSender);
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const newSender = await createNewSender(name, email);
    return res.status(201).json(newSender);
  } catch (error: any) {
    console.error('Error creating sender:', error);
    return res.status(500).json({ error: 'Failed to create sender' });
  }
});

export default router;

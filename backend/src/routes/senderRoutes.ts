import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { createNewSender, getOrCreateDefaultSender } from '../services/emailService';

const router = Router();

// GET /api/senders - List all senders
router.get('/', async (req: Request, res: Response) => {
  try {
    let senders = await prisma.sender.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      const defaultSender = await getOrCreateDefaultSender();
      senders = [defaultSender];
    }

    return res.json(senders);
  } catch (error: any) {
    console.warn('Error fetching senders from DB, using fallback default sender:', error.message);
    return res.json([
      {
        id: 'default_ethereal_sender',
        name: 'Primary Ethereal Sender',
        email: 'sender@ethereal.email',
        isDefault: true,
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

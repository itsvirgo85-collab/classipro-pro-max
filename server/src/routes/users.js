import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const r = Router();

r.get('/me', auth, async (req, res) =>
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    phone: req.user.phone,
    avatarUrl: req.user.avatarUrl,
    bio: req.user.bio,
    role: req.user.role,
  })
);

r.get('/me/messages', auth, async (req, res, next) => {
  try {
    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });
    res.json(msgs);
  } catch (e) {
    next(e);
  }
});

r.get('/:id', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        verified: true,
        createdAt: true,
      },
    });
    if (!u) return res.status(404).json({ error: 'Seller not found' });
    res.json(u);
  } catch (e) {
    next(e);
  }
});

r.get('/:id/listings', async (req, res, next) => {
  try {
    res.json(
      await prisma.listing.findMany({
        where: { sellerId: req.params.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      })
    );
  } catch (e) {
    next(e);
  }
});

export default r;

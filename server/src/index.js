import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import userRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import { authSocket } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const uploads = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploads, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));

// Stripe webhook MUST receive raw body before JSON parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON body for all other API routes
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploads));
app.get('/api/health', (_, res) =>
  res.json({ ok: true, service: 'ClassiPro API', time: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend (client/) when deployed as single service
const clientDir = path.resolve(__dirname, '../../client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err.name === 'ZodError' ? 400 : 500);
  const message =
    err.name === 'ZodError'
      ? err.errors?.map((e) => e.message).join(', ') || 'Validation error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

const io = new Server(server, { cors: { origin: true, credentials: true } });
io.use(authSocket);
io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`);
  socket.on('message:send', async ({ receiverId, body, listingId }, ack) => {
    try {
      if (!receiverId || !body?.trim()) throw new Error('Message is required');
      const msg = await prisma.message.create({
        data: {
          senderId: socket.user.id,
          receiverId,
          body: body.trim().slice(0, 4000),
          listingId: listingId || null,
        },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      });
      io.to(`user:${receiverId}`).emit('message:new', msg);
      io.to(`user:${socket.user.id}`).emit('message:new', msg);
      ack?.({ ok: true, message: msg });
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });
});
app.set('io', io);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => console.log(`ClassiPro API running on :${port}`));

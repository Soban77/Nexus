import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import meetingRoutes from './routes/meetings.js';
import callRoutes from './routes/calls.js';
import documentRoutes from './routes/documents.js';
import paymentsRoutes from './routes/payments.js';
import collaborationRoutes from './routes/collaborations.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import dealRoutes from './routes/deals.js';
import {
  addParticipant,
  getParticipants,
  removeParticipant,
  updateParticipantMedia,
  clearRoom,
  removeParticipantBySocket
} from './utils/callRooms.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.resolve('./uploads')));

app.get('/', (req, res) => {
  res.json({ status: 'ok', environment: nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/deals', dealRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('join_room', ({ roomId, user }) => {
    if (!roomId || !user) {
      return socket.emit('error', { message: 'roomId and user are required to join' });
    }

    socket.join(roomId);
    const participants = addParticipant(roomId, {
      socketId: socket.id,
      user,
      audio: true,
      video: true
    });

    socket.to(roomId).emit('user_joined', { socketId: socket.id, user });
    socket.emit('room_joined', { roomId, participants });
  });

  socket.on('leave_room', ({ roomId }) => {
    if (!roomId) return;

    removeParticipant(roomId, socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit('user_left', { socketId: socket.id });
  });

  socket.on('offer', (payload) => {
    socket.to(payload.roomId).emit('offer', { ...payload, from: socket.id });
  });

  socket.on('answer', (payload) => {
    socket.to(payload.roomId).emit('answer', { ...payload, from: socket.id });
  });

  socket.on('ice_candidate', (payload) => {
    socket.to(payload.roomId).emit('ice_candidate', { ...payload, from: socket.id });
  });

  socket.on('toggle_media', ({ roomId, audio, video }) => {
    const participant = updateParticipantMedia(roomId, socket.id, { audio, video });
    if (participant) {
      io.in(roomId).emit('media_toggled', {
        socketId: socket.id,
        audio: participant.audio,
        video: participant.video
      });
    }
  });

  socket.on('end_call', ({ roomId }) => {
    if (!roomId) return;

    io.in(roomId).emit('call_ended', { roomId, by: socket.id });
    clearRoom(roomId);
    io.in(roomId).socketsLeave(roomId);
  });

  socket.on('disconnect', () => {
    const roomIds = removeParticipantBySocket(socket.id);
    roomIds.forEach((roomId) => {
      io.to(roomId).emit('user_left', { socketId: socket.id });
    });
  });
});

const startServer = async () => {
  try {
    await connectDB();
    server.listen(port, () => {
      console.log(`Server running in ${nodeEnv} mode on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

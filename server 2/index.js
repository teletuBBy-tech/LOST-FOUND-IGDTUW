const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
console.log("🚀 Server starting...");

dotenv.config();
const app = express();
const server = http.createServer(app);

// 📡 Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 👥 Store userId → socketId mapping
const userSocketMap = new Map();
const getUserSocket = (userId) => userSocketMap.get(userId);

// 🌐 CORS & Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔌 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 📡 Socket events
io.on('connection', (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on('identify', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      userSocketMap.set(userId, socket.id);
      console.log(`🔗 Mapped user ${userId} to socket ${socket.id}`);
    } catch {
      console.error('❌ Invalid token on identify');
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of userSocketMap.entries()) {
      if (sockId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`🔌 Disconnected user ${userId}`);
        break;
      }
    }
  });
});

// ✅ Routes (after io + getUserSocket are defined)
const itemRoutes = require('./routes/Item')(io, getUserSocket);
app.use('/api/items', itemRoutes);
app.use('/api/auth', require('./routes/auth'));

// 🌱 Root route
app.get('/', (req, res) => res.send('✅ Server is running'));

// 🚀 Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ✅ Export getUserSocket for use elsewhere if needed
module.exports.getUserSocket = getUserSocket;

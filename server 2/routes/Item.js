const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const fs = require('fs');

module.exports = (io, getUserSocket) => {
  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  });
  const upload = multer({ storage });

  // Upload image
  router.post('/upload', upload.single('image'), (req, res) => {
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  // Get items with filters
  router.get('/', async (req, res) => {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    try {
      const items = await Item.find(query).sort({ postedAt: -1 });
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create item
  router.post('/', auth, async (req, res) => {
    try {
      const { title, description, imageUrl, status } = req.body;
      const newItem = new Item({
        title,
        description,
        imageUrl,
        status,
        postedBy: req.user.userId,
      });
      const savedItem = await newItem.save();
      res.status(201).json(savedItem);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  // Claim request
  router.post('/:id/claim-request', auth, upload.single('proof'), async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const message = {
        senderId: req.user.userId,
        senderName: req.user.name,
        receiverId: item.postedBy,
        message: req.body.message,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        timestamp: new Date(),
      };

      item.messages.push(message);
      if (!item.claimedBy) item.claimedBy = req.user.userId;

      await item.save();

      io.emit('new_claim_request', {
        itemId: item._id,
        itemTitle: item.title,
        message,
      });

      res.status(200).json({ message: 'Claim request sent' });
    } catch (err) {
      console.error('Claim request failed:', err);
      res.status(500).json({ error: 'Failed to send claim request' });
    }
  });

  // Delete item
  router.delete('/:id', auth, async (req, res) => {
    try {
      await Item.findByIdAndDelete(req.params.id);
      res.json({ message: 'Item deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  // Update item
  router.put('/:id', auth, async (req, res) => {
    try {
      const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Claim item
  router.post('/:id/claim', auth, async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (item.claimedBy) return res.status(400).json({ error: 'Already claimed' });
      item.claimedBy = req.user.userId;
      await item.save();
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Claim failed' });
    }
  });

  // Deny claim
  router.post('/:id/deny-claim', auth, async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (String(item.postedBy) !== req.user.userId) {
        return res.status(403).json({ error: 'Not authorized to deny this claim' });
      }

      const deniedUserId = item.claimedBy?.toString();
      item.claimedBy = null;
      await item.save();

      if (deniedUserId) {
        const deniedSocketId = getUserSocket(deniedUserId);
        if (deniedSocketId) {
          io.to(deniedSocketId).emit('claim_status_updated', {
            itemId: item._id,
            status: 'denied'
          });
        }
      }

      const posterSocketId = getUserSocket(item.postedBy.toString());
      if (posterSocketId) {
        io.to(posterSocketId).emit('claim_status_updated', {
          itemId: item._id,
          status: 'denied'
        });
      }

      res.json(item);
    } catch (err) {
      console.error('❌ Error in deny-claim:', err);
      res.status(500).json({ error: 'Deny claim failed' });
    }
  });

  // Mark as claimed
  router.post('/:id/mark-claimed', auth, async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const latestClaim = item.messages.filter(msg => String(msg.receiverId) === req.user.userId).slice(-1)[0];
      if (!latestClaim) return res.status(400).json({ error: 'No valid claim request found' });

      item.claimedBy = latestClaim.senderId;
      item.status = 'found';
      await item.save();

      const claimerSocketId = getUserSocket(latestClaim.senderId);
      if (claimerSocketId) {
        io.to(claimerSocketId).emit('claim_status_updated', {
          itemId: item._id,
          status: 'approved'
        });
      }

      const posterSocketId = getUserSocket(item.postedBy.toString());
      if (posterSocketId) {
        io.to(posterSocketId).emit('claim_status_updated', {
          itemId: item._id,
          status: 'approved'
        });
      }

      res.json(item);
    } catch (err) {
      console.error('❌ Error in mark-claimed:', err);
      res.status(500).json({ error: 'Mark claimed failed' });
    }
  });

  // Claim request inbox
  router.get('/claim-requests/inbox', auth, async (req, res) => {
    try {
      const items = await Item.find({ postedBy: req.user.userId });
      const requests = [];
      for (const item of items) {
        for (const msg of item.messages) {
          if (String(msg.receiverId) === req.user.userId) {
            requests.push({
              itemId: item._id,
              itemTitle: item.title,
              senderName: msg.senderName,
              message: msg.message,
              timestamp: msg.timestamp,
              itemStatus: item.status,
              claimedBy: item.claimedBy,
              imageUrl: msg.imageUrl,
            });
          }
        }
      }
      res.json(requests);
    } catch (err) {
      console.error("Inbox fetch failed:", err);
      res.status(500).json({ error: "Failed to load inbox" });
    }
  });

  // Get user items
  router.get('/mine', auth, async (req, res) => {
    try {
      const items = await Item.find({ postedBy: req.user.userId }).sort({ createdAt: -1 });
      res.json(items);
    } catch (err) {
      console.error('Error fetching user items:', err);
      res.status(500).json({ error: 'Failed to fetch your items' });
    }
  });

  function extractItemId(roomId) {
    return roomId.split('-')[0];
  }

  // Get messages
  router.get('/:roomId/messages', auth, async (req, res) => {
    try {
      const itemId = extractItemId(req.params.roomId);
      const item = await Item.findById(itemId).select('messages postedBy claimedBy');
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const isPoster = item.postedBy?.equals(req.user.userId);
      const isClaimer = item.claimedBy?.equals(req.user.userId);
      if (!isPoster && !isClaimer) {
        return res.status(403).json({ error: 'Unauthorized to view messages' });
      }

      res.json(item.messages || []);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Post message
  router.post('/:roomId/message', auth, async (req, res) => {
    try {
      const { message, receiverId } = req.body;
      const itemId = extractItemId(req.params.roomId);
      const item = await Item.findById(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const isPoster = item.postedBy?.equals(req.user.userId);
      const isClaimer = item.claimedBy?.equals(req.user.userId);
      if (!isPoster && !isClaimer) {
        return res.status(403).json({ error: 'Unauthorized to send messages' });
      }

      const msg = {
        senderId: req.user.userId,
        senderName: req.user.name,
        receiverId,
        message,
        timestamp: new Date()
      };

      item.messages.push(msg);
      await item.save();

      res.json(msg);
    } catch (err) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  return router;
};

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import socket from '../socket';
import { jwtDecode } from 'jwt-decode';

function ChatBox({ roomId, onClose, receiver }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState('');
  const [senderName, setSenderName] = useState('');
  const endRef = useRef(null);

  const itemId = roomId?.split('-')[0];

  // Decode sender info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setSenderId(decoded.userId);
      setSenderName(decoded.name || decoded.username || decoded.email || 'Anonymous');
      

    }
  }, []);

  // Load messages and listen for real-time updates
  useEffect(() => {
    if (!itemId || !roomId) return;

    socket.emit('join_room', roomId);

    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/items/${itemId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.warn("GET failed:", res.status, text);
          return [];
        }
        return res.json();
      })
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Fetch error:", err);
        setMessages([]);
      });

    socket.on('room_message', ({ roomId: incomingRoom, message: newMsg }) => {
      if (incomingRoom === roomId) {
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('room_message');
    };
  }, [itemId, roomId]);

  // Scroll to bottom on message update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !senderId || !itemId) return;

    const token = localStorage.getItem('token');
    const newMsg = {
      senderId,
      senderName,
      receiverId: receiver,
      message,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`http://localhost:5000/api/items/${itemId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMsg)
      });

      if (!res.ok) throw new Error("Failed to send message");

      const savedMsg = await res.json(); // 🔁 Use DB-confirmed message
      socket.emit('send_message', { roomId, message: savedMsg });
      setMessage('');
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  return (
    <Box sx={{
      position: 'fixed', bottom: 20, right: 20, width: 300,
      bgcolor: 'white', boxShadow: 3, p: 2, borderRadius: 2, zIndex: 1000
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Chat</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ maxHeight: 200, overflowY: 'auto', my: 1 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ mb: 1 }}>
            <Typography variant="body2">
              <strong>{msg.senderName}:</strong> {msg.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(msg.timestamp).toLocaleString()}
            </Typography>
          </Box>
        ))}
        <div ref={endRef} />
      </Box>

      <TextField
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        size="small"
        margin="dense"
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSend}
        disabled={!message.trim()}
      >
        Send
      </Button>
    </Box>
  );
}

export default ChatBox;



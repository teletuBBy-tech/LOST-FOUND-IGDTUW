import React, { useEffect, useState } from 'react';
import {
  Typography, Card, CardContent, Button, Container, Grid
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import socket from '../socket';

export default function ClaimRequestInbox() {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');
  const currentUser = token ? jwtDecode(token) : null;

  const fetchMessages = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/items/claim-requests/inbox', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load inbox');
        setMessages([]);
        return;
      }

      if (Array.isArray(data)) {
        setMessages([...data]); // ✅ Force re-render
        setError(null);
      } else {
        setMessages([]);
        setError('Unexpected response from server');
      }
    } catch (err) {
      console.error("Failed to fetch inbox:", err);
      setError('Network error while loading inbox');
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();

    const updateInbox = () => fetchMessages();

    socket.on('new_claim_request', ({ itemId, message }) => {
      if (message.receiverId === currentUser?.userId) {
        updateInbox();
      }
    });

    // ✅ Listen for approval/denial socket events (if emitted from backend)
    socket.on('claim_status_updated', updateInbox);

    return () => {
      socket.off('new_claim_request', updateInbox);
      socket.off('claim_status_updated', updateInbox);
    };
  }, []);

  const handleApprove = async (itemId) => {
    await fetch(`http://localhost:5000/api/items/${itemId}/mark-claimed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchMessages();
  };

  const handleDeny = async (itemId) => {
    await fetch(`http://localhost:5000/api/items/${itemId}/deny-claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchMessages();
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>📥 Claim Requests Sent To You</Typography>

      {error && <Typography color="error">{error}</Typography>}

      {messages.length === 0 && !error ? (
        <Typography>No claim requests received.</Typography>
      ) : (
        messages.map((msg, idx) => {
          const isApproved = msg.itemStatus === 'found' && msg.claimedBy === msg.senderId;
          const isDenied = msg.itemStatus === 'found' && msg.claimedBy && msg.claimedBy !== msg.senderId;

          return (
            <Card key={msg._id || idx} sx={{ mb: 2 }}>
              <CardContent>
                <Typography><b>Item:</b> {msg.itemTitle}</Typography>
                <Typography><b>From:</b> {msg.senderName}</Typography>
                <Typography><b>Status:</b> {msg.itemStatus}</Typography>
                <Typography><b>Message:</b> {msg.message}</Typography>

                {msg.imageUrl && (
                  <img
                    src={`http://localhost:5000${msg.imageUrl}`}
                    alt="Proof"
                    style={{ maxWidth: '200px', marginTop: 10 }}
                  />
                )}

                <Typography variant="caption">🕒 {new Date(msg.timestamp).toLocaleString()}</Typography>

                {isApproved ? (
                  <Typography color="green" sx={{ mt: 1 }}>✅ Approved</Typography>
                ) : isDenied ? (
                  <Typography color="error" sx={{ mt: 1 }}>❌ Denied</Typography>
                ) : (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleApprove(msg.itemId)}
                      >
                        Approve
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeny(msg.itemId)}
                      >
                        Deny
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </Container>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Card, CardContent, Button, Grid
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';

export default function ItemHistory() {
  const [items, setItems] = useState([]);
  const token = localStorage.getItem('token');
  const currentUser = token ? jwtDecode(token) : null;

  const fetchUserItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/items/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    fetchUserItems();
  }, []);

  const handleDelete = async (id) => {
    await fetch(`http://localhost:5000/api/items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchUserItems(); // Refresh after deletion
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>📜 Your Lost/Found Item History</Typography>

      {items.length === 0 ? (
        <Typography>You haven’t posted any items yet.</Typography>
      ) : (
        items.map((item) => (
          <Card key={item._id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography><b>Title:</b> {item.title}</Typography>
              <Typography><b>Status:</b> {item.status}</Typography>
              {item.imageUrl && (
                <img
                  src={`http://localhost:5000${item.imageUrl}`}
                  alt="Item"
                  style={{ maxWidth: '200px', marginTop: 10 }}
                />
              )}
              <Typography variant="caption">
                🕒 Posted on: {new Date(item.createdAt).toLocaleString()}
              </Typography>
              {item.claimedBy && (
                <Typography sx={{ mt: 1 }} color="green">✅ Claimed</Typography>
              )}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}

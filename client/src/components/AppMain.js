import React, { useEffect, useState } from 'react';
import {
  Container, Typography, TextField, Button, Card, CardContent, Grid
} from '@mui/material';

import FilterBar from './FilterBar';
import ChatBox from './ChatBox';
import socket from '../socket';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import ClaimRequestModal from './ClaimRequestModal';
import { Select, MenuItem } from '@mui/material';
console.log("✅ AppMain loaded");



  

  

function AppMain() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('lost');
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
//   const [chatRoom, setChatRoom] = useState(null);
//   const [chatReceiver, setChatReceiver] = useState(null);

  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const currentUserId = decoded?.userId;
  
  const [claimModalOpen, setClaimModalOpen] = useState(false);
const [claimItemId, setClaimItemId] = useState(null);


  // 📥 Fetch all items on load
  useEffect(() => {
    fetch('http://localhost:5000/api/items')
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);

  // 🔁 Real-time updates
  useEffect(() => {
    socket.on('broadcast_item', (item) => {
      setItems(prev => [item, ...prev]);
    });
    return () => socket.off('broadcast_item');
  }, []);
  useEffect(()=>{
    socket.on('claim_status_updated', ({ itemId, status }) => {
      setItems(prev => prev.map(i => i._id === itemId ? { ...i, status, claimedBy: status === 'approved' ? currentUserId : null } : i));
    });
    
  })

  const handleFilter = async ({ status, search }) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (search) query.append('search', search);
    const res = await fetch(`http://localhost:5000/api/items?${query.toString()}`);
    const data = await res.json();
    setItems(data);
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:5000/api/items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setItems(prev => prev.filter(item => item._id !== id));
  };

  const openClaimModal = (id) => {
    setClaimItemId(id);
    setClaimModalOpen(true);
  };
  

  const handleDenyClaim = async (id) => {
    const res = await fetch(`http://localhost:5000/api/items/${id}/deny-claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const handleMarkClaimed = async (id) => {
    const res = await fetch(`http://localhost:5000/api/items/${id}/mark-claimed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = '';
    if (image) {
      const formData = new FormData();
      formData.append('image', image);
      const uploadRes = await fetch('http://localhost:5000/api/items/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.imageUrl;
    }

    const newItem = {
      title,
      description,
      status,
      imageUrl,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    if (editingId) {
      const res = await fetch(`http://localhost:5000/api/items/${editingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(newItem),
      });
      const updated = await res.json();
      setItems(prev => prev.map(item => item._id === updated._id ? updated : item));
      setEditingId(null);
    } else {
      const res = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers,
        body: JSON.stringify(newItem),
      });
      const saved = await res.json();
      socket.emit('new_item', saved);
      setItems(prev => [saved, ...prev]);
    }

    setTitle('');
    setDescription('');
    setStatus('lost');
    setImage(null);
  };

  return (
    <>
   

    <Container maxWidth="md" sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Lost & Found Portal</Typography>
      <FilterBar onFilter={handleFilter} />

      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
          <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required margin="normal" />
          <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} fullWidth required margin="normal" />
          <Select value={status} onChange={e => setStatus(e.target.value)} fullWidth displayEmpty>
            <MenuItem value="lost">Lost</MenuItem>
            <MenuItem value="found">Found</MenuItem>
          </Select>
          <input type="file" onChange={(e) => setImage(e.target.files[0])} style={{ margin: '20px 0' }} />
          <Button variant="contained" color="primary" type="submit">Post Item</Button>
        </form>

      <Grid container spacing={2}>
        {items.map((item, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6">{item.title}</Typography>
                <Typography>{item.description}</Typography>
                <Typography color="textSecondary">Status: {item.status}</Typography>
                {item.claimedBy && <Typography color="green">Claimed</Typography>}
                {item.imageUrl && (
                  <img src={`http://localhost:5000${item.imageUrl}`} alt="uploaded" style={{ maxWidth: '100%', marginTop: 10 }} />
                )}

                <div style={{ marginTop: 10, display: 'flex', gap: '10px' }}>
                  {item.postedBy === currentUserId ? (
                    <>
                      <Button color="error" onClick={() => handleDelete(item._id)}>Delete</Button>
                      {item.claimedBy && (
                        <>
                          <Button color="warning" onClick={() => handleDenyClaim(item._id)}>Deny Claim</Button>
                          <Button variant="contained" onClick={() => handleMarkClaimed(item._id)}>Mark as Claimed</Button>
                        </>
                      )}
                    </>
                  ) : (
                    item.status === 'found' && !item.claimedBy && item.postedBy !== currentUserId && (
                      <Button color="primary" variant="contained" onClick={() => openClaimModal(item._id)}>
                        Claim
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* {chatRoom && (
        <ChatBox
          roomId={chatRoom}
          sender={currentUserId}
          receiver={chatReceiver}
          onClose={() => setChatRoom(null)}
        />
      )} */}
      <ClaimRequestModal
  open={claimModalOpen}
  onClose={() => setClaimModalOpen(false)}
  itemId={claimItemId}
  onClaimSuccess={() => {
    // Optionally refetch or update item list
  }}

/>
<Button onClick={() => {
  localStorage.removeItem('token');
  window.location.href = '/login';
}}>
  Logout
</Button>

    </Container>
    </>
  );
}



export default AppMain;

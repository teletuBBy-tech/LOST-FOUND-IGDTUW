// components/ClaimRequestModal.js
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography
} from '@mui/material';

const ClaimRequestModal = ({ open, onClose, itemId, onClaimSuccess }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const token = localStorage.getItem('token');
 
console.log("Token at claim request:", token); // <-- add this


  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('message', message);
    if (file) formData.append('proof', file);

    try {
      const res = await fetch(`http://localhost:5000/api/items/${itemId}/claim-request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Claim failed');
      onClaimSuccess(); // Optional callback
      onClose();
    } catch (err) {
      alert("Error sending claim request");
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Claim Item</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>Add a message to the owner:</Typography>
        <TextField
          multiline
          rows={3}
          fullWidth
          placeholder="Type a message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          margin="dense"
        />
        <Typography gutterBottom sx={{ mt: 2 }}>Attach image proof:</Typography>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!message.trim()}>
          Send Claim Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};
console.log("✅ ClaimRequestModal loaded");


export default ClaimRequestModal;

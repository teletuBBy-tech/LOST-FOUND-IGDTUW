import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';
import axios from 'axios';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const ClaimRequestModal = ({ open, handleClose, itemId, onSuccess }) => {
  const [message, setMessage] = useState('');
  const [proofFile, setProofFile] = useState(null);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('message', message);
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await axios.post(
        `/api/items/${itemId}/claim-request`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onSuccess && onSuccess(res.data);
      handleClose();
    } catch (err) {
      console.error('Error sending claim request:', err);
      alert('Failed to send claim request');
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" gutterBottom>
          Send Claim Request
        </Typography>
        <TextField
          fullWidth
          label="Message"
          multiline
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 2 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProofFile(e.target.files[0])}
          style={{ marginBottom: '1rem' }}
        />
        <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
          Submit
        </Button>
      </Box>
    </Modal>
  );
};

export default ClaimRequestModal;

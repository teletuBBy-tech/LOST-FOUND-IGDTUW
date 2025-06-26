import React, { useState } from 'react';
import { Box, TextField, Button, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

export default function FilterBar({ onFilter }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter({ status, search });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <FormControl sx={{ minWidth: 120 }} size="small">
        <InputLabel>Status</InputLabel>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          label="Status"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="lost">Lost</MenuItem>
          <MenuItem value="found">Found</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Search"
        placeholder="Title or description"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
      />

      <Button type="submit" variant="contained" color="primary">
        Search
      </Button>
    </Box>
  );
}


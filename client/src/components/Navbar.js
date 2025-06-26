import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export default function Navbar({ currentUser, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Brand */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>

        <Typography variant="h6" component={Link} to="/" sx={{ color: 'inherit', textDecoration: 'none' }}>
          L&F
        </Typography>

        
          
          <Button component={Link} to="/history" color="inherit">History</Button>
          <Button component={Link} to="/messages" color="inherit">Messages</Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>{currentUser?.name}</Typography>
          <Button component={Link} to="/about" color="inherit">About</Button>
          <Button component={Link} to="/disclaimer" color="inherit">Disclaimer</Button>
        </Box>

        {/* User Dropdown */}
        <Box>
          <Button
            color="inherit"
            endIcon={<ArrowDropDownIcon />}
            onClick={handleMenuOpen}
          >
            {currentUser?.name || "User"}
          </Button>

          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>Profile</MenuItem>
            <MenuItem component={Link} to="/about" onClick={handleMenuClose}>About</MenuItem>
            <MenuItem component={Link} to="/disclaimer" onClick={handleMenuClose}>Disclaimer</MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); onLogout(); }}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

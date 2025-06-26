import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import AppMain from './components/AppMain';

import ItemHistory from './components/ItemHistory';
import ClaimRequestInbox from './components/ClaimRequestInbox';
import AboutPage from './components/AboutPage';
import DisclaimerPage from './components/DisclaimerPage';
import { jwtDecode } from 'jwt-decode';


import Navbar from './components/Navbar';

function App() {
  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;

  return (
    <Router>
      {token && <Navbar currentUser={decoded} onLogout={() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }} />}
      <Routes>
      <Route path="*" element={<div>404 - Page Not Found</div>} />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={token ? <AppMain /> : <Navigate to="/login" />} />
       
        <Route path="/history" element={token ? <ItemHistory /> : <Navigate to="/login" />} />
        <Route path="/messages" element={token ? <ClaimRequestInbox /> : <Navigate to="/login" />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
      </Routes>
    </Router>
  );
}

export default App;

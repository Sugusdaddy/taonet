const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// Simple auth endpoint (wallet signature verification)
router.post('/verify', async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    
    if (!address || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
    
    res.json({ 
      valid: isValid,
      address: recoveredAddress.toLowerCase()
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(400).json({ error: 'Invalid signature', valid: false });
  }
});

// Generate challenge message
router.get('/challenge/:address', (req, res) => {
  const { address } = req.params;
  const timestamp = Date.now();
  const message = `TaoNet Auth: ${address.toLowerCase()} - ${timestamp}`;
  
  res.json({ message, timestamp });
});

module.exports = router;

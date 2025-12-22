const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 REGISTER
router.post('/register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }
    const user = new User({ phone, name, password });
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      user: { id: user._id, phone: user.phone, name: user.name },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔐 LOGIN
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid phone or password' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: { id: user._id, phone: user.phone, name: user.name },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 👥 GET ALL USERS
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name phone isOnline');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
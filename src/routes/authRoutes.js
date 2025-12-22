const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes); 

// Test route check karne ke liye
app.get("/", (req, res) => res.send("Chat Server is Running..."));

// 🔐 REGISTER
router.post('/register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered'
      });
    }
    
    // Create user
    const user = new User({
      phone,
      name,
      password
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        profilePic: user.profilePic
      },
      token
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔐 LOGIN
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone or password'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone or password'
      });
    }
    
    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        profilePic: user.profilePic,
        status: user.status,
        isOnline: user.isOnline
      },
      token
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 👤 PROFILE
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 👥 GET ALL USERS
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name phone profilePic status isOnline lastSeen');
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
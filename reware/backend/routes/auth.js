const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authRateLimiter } = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user (handled by Firebase, this just returns user data)
// @access  Public
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    // Firebase handles authentication, this endpoint just returns user data
    // The actual authentication happens in the middleware
    res.json({
      success: true,
      message: 'Login successful',
      user: req.user
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Something went wrong during login'
    });
  }
});

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', [
  authRateLimiter,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, firebaseUid, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { firebaseUid }] 
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email or Firebase UID already exists'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      firebaseUid,
      avatar,
      points: 10, // Starting points
      badges: ['First Swap'] // Welcome badge
    });

    // Create welcome notification
    await Notification.createNotification(
      user._id,
      'system_announcement',
      'Welcome to ReWear! 🌱',
      'Thank you for joining our sustainable fashion community. You have 10 points to start swapping!'
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        points: user.points,
        badges: user.badges,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Something went wrong during registration'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-__v')
      .populate('stats');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Something went wrong while fetching your profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('preferences.notifications.push').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('preferences.categories').optional().isArray().withMessage('Categories must be an array'),
  body('preferences.sizes').optional().isArray().withMessage('Sizes must be an array'),
  body('location.city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('location.country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = {};
    const allowedFields = [
      'name', 'avatar', 'preferences', 'location'
    ];

    // Only allow specific fields to be updated
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Something went wrong while updating your profile'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update last active timestamp
    await User.findByIdAndUpdate(req.user._id, {
      lastActive: new Date()
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Something went wrong during logout'
    });
  }
});

// @route   GET /api/auth/leaderboard
// @desc    Get eco impact leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await User.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: 'Something went wrong while fetching the leaderboard'
    });
  }
});

// @route   GET /api/auth/stats
// @desc    Get platform statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalItems, totalSwaps, totalEcoImpact] = await Promise.all([
      User.countDocuments(),
      require('../models/Item').countDocuments({ status: 'Available', isApproved: true }),
      require('../models/Swap').countDocuments({ status: 'Completed' }),
      User.aggregate([
        { $group: { _id: null, totalEcoImpact: { $sum: '$stats.ecoImpact' } } }
      ])
    ]);

    const ecoImpact = totalEcoImpact[0]?.totalEcoImpact || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalItems,
        totalSwaps,
        totalEcoImpact: Math.round(ecoImpact * 100) / 100,
        averageEcoImpact: totalUsers > 0 ? Math.round((ecoImpact / totalUsers) * 100) / 100 : 0
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'Something went wrong while fetching platform statistics'
    });
  }
});

module.exports = router; 
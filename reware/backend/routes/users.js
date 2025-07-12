const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's detailed profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
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

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('preferences.notifications.push').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('preferences.notifications.swapRequests').optional().isBoolean().withMessage('Swap request notifications must be boolean'),
  body('preferences.notifications.newItems').optional().isBoolean().withMessage('New item notifications must be boolean'),
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

// @route   GET /api/users/items
// @desc    Get current user's items
// @access  Private
router.get('/items', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['Available', 'Pending', 'Swapped', 'Removed']).withMessage('Invalid status')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = { ownerId: req.user._id };
    if (req.query.status) query.status = req.query.status;

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name avatar');

    const totalItems = await Item.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        hasNext: page < Math.ceil(totalItems / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get user items error:', error);
    res.status(500).json({
      error: 'Failed to get items',
      message: 'Something went wrong while fetching your items'
    });
  }
});

// @route   GET /api/users/swaps
// @desc    Get current user's swaps
// @access  Private
router.get('/swaps', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled']).withMessage('Invalid status')
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

    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const swaps = await Swap.getUserSwaps(req.user._id, status, page, limit);
    const totalSwaps = await Swap.countDocuments({
      $or: [
        { initiatorId: req.user._id },
        { recipientId: req.user._id }
      ],
      ...(status && { status })
    });

    res.json({
      success: true,
      swaps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSwaps / limit),
        totalSwaps,
        hasNext: page < Math.ceil(totalSwaps / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get user swaps error:', error);
    res.status(500).json({
      error: 'Failed to get swaps',
      message: 'Something went wrong while fetching your swaps'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get current user's statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats points badges');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Get additional stats
    const [totalItems, availableItems, pendingItems, totalSwaps, pendingSwaps] = await Promise.all([
      Item.countDocuments({ ownerId: req.user._id }),
      Item.countDocuments({ ownerId: req.user._id, status: 'Available', isApproved: true }),
      Item.countDocuments({ ownerId: req.user._id, status: 'Pending', isApproved: false }),
      Swap.countDocuments({
        $or: [
          { initiatorId: req.user._id },
          { recipientId: req.user._id }
        ]
      }),
      Swap.countDocuments({
        $or: [
          { initiatorId: req.user._id },
          { recipientId: req.user._id }
        ],
        status: 'Pending'
      })
    ]);

    res.json({
      success: true,
      stats: {
        ...user.stats.toObject(),
        totalItems,
        availableItems,
        pendingItems,
        totalSwaps,
        pendingSwaps,
        points: user.points,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('❌ Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'Something went wrong while fetching your statistics'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get public user profile
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar stats badges createdAt')
      .populate('stats');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Get user's public items
    const publicItems = await Item.find({
      ownerId: user._id,
      status: 'Available',
      isApproved: true
    })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('title images pointsRequired category condition');

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        badges: user.badges,
        memberSince: user.createdAt
      },
      publicItems
    });
  } catch (error) {
    console.error('❌ Get public user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: 'Something went wrong while fetching the user profile'
    });
  }
});

// @route   GET /api/users/:id/items
// @desc    Get public user's items
// @access  Public
router.get('/:id/items', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const items = await Item.find({
      ownerId: user._id,
      status: 'Available',
      isApproved: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'name avatar');

    const totalItems = await Item.countDocuments({
      ownerId: user._id,
      status: 'Available',
      isApproved: true
    });

    res.json({
      success: true,
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        hasNext: page < Math.ceil(totalItems / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get public user items error:', error);
    res.status(500).json({
      error: 'Failed to get user items',
      message: 'Something went wrong while fetching user items'
    });
  }
});

// @route   POST /api/users/points/add
// @desc    Add points to user (for testing/admin purposes)
// @access  Private
router.post('/points/add', [
  authenticateToken,
  body('amount').isInt({ min: 1, max: 100 }).withMessage('Amount must be between 1 and 100')
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    await user.addPoints(req.body.amount);

    res.json({
      success: true,
      message: `Added ${req.body.amount} points successfully`,
      newBalance: user.points
    });
  } catch (error) {
    console.error('❌ Add points error:', error);
    res.status(500).json({
      error: 'Failed to add points',
      message: 'Something went wrong while adding points'
    });
  }
});

module.exports = router; 
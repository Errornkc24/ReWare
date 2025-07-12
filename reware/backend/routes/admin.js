const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');
const Notification = require('../models/Notification');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      pendingItems,
      totalSwaps,
      completedSwaps,
      totalEcoImpact,
      recentUsers,
      recentItems,
      recentSwaps
    ] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),
      Item.countDocuments({ status: 'Pending', isApproved: false }),
      Swap.countDocuments(),
      Swap.countDocuments({ status: 'Completed' }),
      User.aggregate([
        { $group: { _id: null, totalEcoImpact: { $sum: '$stats.ecoImpact' } } }
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
      Item.find().sort({ createdAt: -1 }).limit(5).populate('ownerId', 'name'),
      Swap.find().sort({ createdAt: -1 }).limit(5).populate('initiatorId', 'name').populate('recipientId', 'name')
    ]);

    const ecoImpact = totalEcoImpact[0]?.totalEcoImpact || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalItems,
        pendingItems,
        totalSwaps,
        completedSwaps,
        totalEcoImpact: Math.round(ecoImpact * 100) / 100,
        averageEcoImpact: totalUsers > 0 ? Math.round((ecoImpact / totalUsers) * 100) / 100 : 0
      },
      recent: {
        users: recentUsers,
        items: recentItems,
        swaps: recentSwaps
      }
    });
  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard stats',
      message: 'Something went wrong while fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/items/pending
// @desc    Get pending items for approval
// @access  Private (Admin only)
router.get('/items/pending', [
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const items = await Item.find({ status: 'Pending', isApproved: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name email');

    const totalItems = await Item.countDocuments({ status: 'Pending', isApproved: false });

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
    console.error('❌ Get pending items error:', error);
    res.status(500).json({
      error: 'Failed to get pending items',
      message: 'Something went wrong while fetching pending items'
    });
  }
});

// @route   PUT /api/admin/items/:id/approve
// @desc    Approve an item
// @access  Private (Admin only)
router.put('/items/:id/approve', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'The requested item does not exist'
      });
    }

    if (item.isApproved) {
      return res.status(400).json({
        error: 'Item already approved',
        message: 'This item has already been approved'
      });
    }

    // Approve the item
    item.isApproved = true;
    item.status = 'Available';
    item.approvedBy = req.user._id;
    item.approvedAt = new Date();
    await item.save();

    // Create notification for item owner
    await Notification.createItemApprovedNotification(
      item.ownerId,
      item._id,
      item.title
    );

    res.json({
      success: true,
      message: 'Item approved successfully',
      item
    });
  } catch (error) {
    console.error('❌ Approve item error:', error);
    res.status(500).json({
      error: 'Failed to approve item',
      message: 'Something went wrong while approving the item'
    });
  }
});

// @route   PUT /api/admin/items/:id/reject
// @desc    Reject an item
// @access  Private (Admin only)
router.put('/items/:id/reject', [
  body('reason').trim().isLength({ min: 1, max: 200 }).withMessage('Reason must be between 1 and 200 characters')
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

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'The requested item does not exist'
      });
    }

    if (item.isApproved) {
      return res.status(400).json({
        error: 'Item already approved',
        message: 'This item has already been approved'
      });
    }

    // Reject the item
    item.status = 'Removed';
    await item.save();

    // Create notification for item owner
    await Notification.createItemRejectedNotification(
      item.ownerId,
      item._id,
      item.title,
      req.body.reason
    );

    res.json({
      success: true,
      message: 'Item rejected successfully'
    });
  } catch (error) {
    console.error('❌ Reject item error:', error);
    res.status(500).json({
      error: 'Failed to reject item',
      message: 'Something went wrong while rejecting the item'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin view)
// @access  Private (Admin only)
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search query too long')
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-firebaseUid')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Something went wrong while fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/users/:id/role', [
  body('role').isIn(['user', 'admin']).withMessage('Role must be either user or admin')
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

    // Prevent admin from removing their own admin role
    if (user._id.toString() === req.user._id.toString() && req.body.role === 'user') {
      return res.status(400).json({
        error: 'Cannot remove own admin role',
        message: 'You cannot remove your own admin privileges'
      });
    }

    user.role = req.body.role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Update user role error:', error);
    res.status(500).json({
      error: 'Failed to update user role',
      message: 'Something went wrong while updating user role'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      });
    }

    // Delete user's items
    await Item.deleteMany({ ownerId: user._id });

    // Delete user's swaps
    await Swap.deleteMany({
      $or: [
        { initiatorId: user._id },
        { recipientId: user._id }
      ]
    });

    // Delete user's notifications
    await Notification.deleteMany({ userId: user._id });

    // Delete the user
    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'Something went wrong while deleting the user'
    });
  }
});

// @route   GET /api/admin/swaps
// @desc    Get all swaps (admin view)
// @access  Private (Admin only)
router.get('/swaps', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'])
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const swaps = await Swap.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('initiatorId', 'name email')
      .populate('recipientId', 'name email')
      .populate('requestedItemId', 'title')
      .populate('offeredItemId', 'title');

    const totalSwaps = await Swap.countDocuments(query);

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
    console.error('❌ Get swaps error:', error);
    res.status(500).json({
      error: 'Failed to get swaps',
      message: 'Something went wrong while fetching swaps'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Private (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    const [
      userStats,
      itemStats,
      swapStats,
      ecoImpactStats,
      monthlyUsers,
      monthlyItems,
      monthlySwaps
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
            activeUsers: { $sum: { $cond: [{ $gte: ['$lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0] } }
          }
        }
      ]),
      // Item statistics
      Item.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            availableItems: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Available'] }, { $eq: ['$isApproved', true] }] }, 1, 0] } },
            pendingItems: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pending'] }, { $eq: ['$isApproved', false] }] }, 1, 0] } },
            swappedItems: { $sum: { $cond: [{ $eq: ['$status', 'Swapped'] }, 1, 0] } }
          }
        }
      ]),
      // Swap statistics
      Swap.aggregate([
        {
          $group: {
            _id: null,
            totalSwaps: { $sum: 1 },
            pendingSwaps: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            completedSwaps: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            directSwaps: { $sum: { $cond: [{ $eq: ['$swapType', 'Direct Swap'] }, 1, 0] } },
            pointsSwaps: { $sum: { $cond: [{ $eq: ['$swapType', 'Points Redemption'] }, 1, 0] } }
          }
        }
      ]),
      // Eco impact statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalEcoImpact: { $sum: '$stats.ecoImpact' },
            averageEcoImpact: { $avg: '$stats.ecoImpact' },
            maxEcoImpact: { $max: '$stats.ecoImpact' }
          }
        }
      ]),
      // Monthly user registrations (last 6 months)
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Monthly item listings (last 6 months)
      Item.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Monthly swaps (last 6 months)
      Swap.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        users: userStats[0] || {},
        items: itemStats[0] || {},
        swaps: swapStats[0] || {},
        ecoImpact: ecoImpactStats[0] || {},
        trends: {
          monthlyUsers,
          monthlyItems,
          monthlySwaps
        }
      }
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: 'Something went wrong while fetching analytics data'
    });
  }
});

module.exports = router; 
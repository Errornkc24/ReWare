const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be boolean')
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
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await Notification.getUserNotifications(
      req.user._id,
      page,
      limit,
      unreadOnly
    );

    const totalNotifications = await Notification.countDocuments({
      userId: req.user._id,
      ...(unreadOnly && { isRead: false })
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNext: page < Math.ceil(totalNotifications / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      message: 'Something went wrong while fetching notifications'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      error: 'Failed to get unread count',
      message: 'Something went wrong while fetching unread count'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'The requested notification does not exist'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only mark your own notifications as read'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: 'Something went wrong while marking notification as read'
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('❌ Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: 'Something went wrong while marking all notifications as read'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'The requested notification does not exist'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own notifications'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: 'Something went wrong while deleting the notification'
    });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all notifications
// @access  Private
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: 'All notifications cleared successfully'
    });
  } catch (error) {
    console.error('❌ Clear all notifications error:', error);
    res.status(500).json({
      error: 'Failed to clear all notifications',
      message: 'Something went wrong while clearing all notifications'
    });
  }
});

// @route   GET /api/notifications/types
// @desc    Get notification types for filtering
// @access  Private
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const types = [
      'swap_request',
      'swap_accepted',
      'swap_rejected',
      'swap_completed',
      'item_approved',
      'item_rejected',
      'new_message',
      'points_earned',
      'badge_earned',
      'system_announcement'
    ];

    res.json({
      success: true,
      types
    });
  } catch (error) {
    console.error('❌ Get notification types error:', error);
    res.status(500).json({
      error: 'Failed to get notification types',
      message: 'Something went wrong while fetching notification types'
    });
  }
});

// @route   GET /api/notifications/by-type/:type
// @desc    Get notifications by type
// @access  Private
router.get('/by-type/:type', [
  authenticateToken,
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
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      userId: req.user._id,
      type: req.params.type
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('data.senderId', 'name avatar')
    .populate('data.swapId', 'status')
    .populate('data.itemId', 'title images');

    const totalNotifications = await Notification.countDocuments({
      userId: req.user._id,
      type: req.params.type
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNext: page < Math.ceil(totalNotifications / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get notifications by type error:', error);
    res.status(500).json({
      error: 'Failed to get notifications by type',
      message: 'Something went wrong while fetching notifications by type'
    });
  }
});

module.exports = router; 
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Swap = require('../models/Swap');
const Item = require('../models/Item');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   POST /api/swaps
// @desc    Create a new swap request
// @access  Private
router.post('/', [
  authenticateToken,
  body('requestedItemId').isMongoId().withMessage('Valid requested item ID is required'),
  body('offeredItemId').optional().isMongoId().withMessage('Valid offered item ID is required'),
  body('pointsOffered').optional().isInt({ min: 0 }).withMessage('Points must be a positive integer'),
  body('swapType').isIn(['Direct Swap', 'Points Redemption']).withMessage('Invalid swap type'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Message must be less than 500 characters')
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

    const { requestedItemId, offeredItemId, pointsOffered, swapType, message } = req.body;

    // Get the requested item
    const requestedItem = await Item.findById(requestedItemId);
    if (!requestedItem) {
      return res.status(404).json({
        error: 'Requested item not found',
        message: 'The item you want to swap for does not exist'
      });
    }

    // Check if item is available
    if (requestedItem.status !== 'Available' || !requestedItem.isApproved) {
      return res.status(400).json({
        error: 'Item not available',
        message: 'This item is not available for swapping'
      });
    }

    // Check if user is trying to swap their own item
    if (requestedItem.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot swap own item',
        message: 'You cannot swap for your own item'
      });
    }

    // Validate swap type and requirements
    if (swapType === 'Direct Swap') {
      if (!offeredItemId) {
        return res.status(400).json({
          error: 'Offered item required',
          message: 'You must offer an item for direct swap'
        });
      }

      // Get the offered item
      const offeredItem = await Item.findById(offeredItemId);
      if (!offeredItem) {
        return res.status(404).json({
          error: 'Offered item not found',
          message: 'The item you are offering does not exist'
        });
      }

      // Check if offered item belongs to the user
      if (offeredItem.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Not your item',
          message: 'You can only offer items that belong to you'
        });
      }

      // Check if offered item is available
      if (offeredItem.status !== 'Available' || !offeredItem.isApproved) {
        return res.status(400).json({
          error: 'Offered item not available',
          message: 'The item you are offering is not available for swapping'
        });
      }
    } else if (swapType === 'Points Redemption') {
      if (!pointsOffered || pointsOffered <= 0) {
        return res.status(400).json({
          error: 'Points required',
          message: 'You must offer points for points redemption'
        });
      }

      // Check if user has enough points
      if (req.user.points < pointsOffered) {
        return res.status(400).json({
          error: 'Insufficient points',
          message: 'You do not have enough points for this swap'
        });
      }

      // Check if offered points match or exceed required points
      if (pointsOffered < requestedItem.pointsRequired) {
        return res.status(400).json({
          error: 'Insufficient points offered',
          message: `This item requires ${requestedItem.pointsRequired} points, but you offered ${pointsOffered}`
        });
      }
    }

    // Check if there's already a pending swap for this item by this user
    const existingSwap = await Swap.findOne({
      initiatorId: req.user._id,
      requestedItemId,
      status: 'Pending'
    });

    if (existingSwap) {
      return res.status(400).json({
        error: 'Swap already exists',
        message: 'You already have a pending swap request for this item'
      });
    }

    // Create the swap
    const swapData = {
      initiatorId: req.user._id,
      recipientId: requestedItem.ownerId,
      requestedItemId,
      swapType,
      message
    };

    if (swapType === 'Direct Swap') {
      swapData.offeredItemId = offeredItemId;
    } else {
      swapData.pointsOffered = pointsOffered;
    }

    const swap = await Swap.create(swapData);

    // Populate the swap with item and user details
    await swap.populate([
      { path: 'initiatorId', select: 'name avatar' },
      { path: 'recipientId', select: 'name avatar' },
      { path: 'requestedItemId', select: 'title images pointsRequired' },
      { path: 'offeredItemId', select: 'title images pointsRequired' }
    ]);

    // Create notification for recipient
    await Notification.createSwapRequestNotification(
      requestedItem.ownerId,
      swap._id,
      req.user._id,
      requestedItem.title
    );

    res.status(201).json({
      success: true,
      message: 'Swap request created successfully',
      swap
    });
  } catch (error) {
    console.error('❌ Create swap error:', error);
    res.status(500).json({
      error: 'Failed to create swap',
      message: 'Something went wrong while creating the swap request'
    });
  }
});

// @route   GET /api/swaps
// @desc    Get user's swaps
// @access  Private
router.get('/', [
  authenticateToken,
  query('status').optional().isIn(['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled']),
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
    console.error('❌ Get swaps error:', error);
    res.status(500).json({
      error: 'Failed to get swaps',
      message: 'Something went wrong while fetching your swaps'
    });
  }
});

// @route   GET /api/swaps/pending
// @desc    Get pending swaps for user
// @access  Private
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const pendingSwaps = await Swap.getPendingSwaps(req.user._id);

    res.json({
      success: true,
      swaps: pendingSwaps
    });
  } catch (error) {
    console.error('❌ Get pending swaps error:', error);
    res.status(500).json({
      error: 'Failed to get pending swaps',
      message: 'Something went wrong while fetching pending swaps'
    });
  }
});

// @route   GET /api/swaps/:id
// @desc    Get single swap by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)
      .populate('initiatorId', 'name avatar')
      .populate('recipientId', 'name avatar')
      .populate('requestedItemId', 'title images pointsRequired ownerId')
      .populate('offeredItemId', 'title images pointsRequired ownerId')
      .populate('cancelledBy', 'name');

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is part of this swap
    if (swap.initiatorId._id.toString() !== req.user._id.toString() && 
        swap.recipientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view swaps you are involved in'
      });
    }

    res.json({
      success: true,
      swap
    });
  } catch (error) {
    console.error('❌ Get swap error:', error);
    res.status(500).json({
      error: 'Failed to get swap',
      message: 'Something went wrong while fetching the swap'
    });
  }
});

// @route   PUT /api/swaps/:id/accept
// @desc    Accept a swap request
// @access  Private
router.put('/:id/accept', [
  authenticateToken,
  body('responseMessage').optional().trim().isLength({ max: 500 }).withMessage('Response message must be less than 500 characters')
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

    const swap = await Swap.findById(req.params.id)
      .populate('requestedItemId')
      .populate('offeredItemId');

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is the recipient
    if (swap.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the recipient can accept a swap'
      });
    }

    // Check if swap is pending
    if (swap.status !== 'Pending') {
      return res.status(400).json({
        error: 'Swap not pending',
        message: 'This swap is not in a pending state'
      });
    }

    // Accept the swap
    await swap.acceptSwap(req.body.responseMessage);

    // Update item statuses
    await Item.findByIdAndUpdate(swap.requestedItemId._id, { status: 'Swapped' });
    if (swap.offeredItemId) {
      await Item.findByIdAndUpdate(swap.offeredItemId._id, { status: 'Swapped' });
    }

    // Handle points transfer if it's a points redemption
    if (swap.swapType === 'Points Redemption') {
      // Deduct points from initiator
      await User.findByIdAndUpdate(swap.initiatorId, {
        $inc: { points: -swap.pointsOffered }
      });

      // Add points to recipient
      await User.findByIdAndUpdate(swap.recipientId, {
        $inc: { points: swap.pointsOffered }
      });
    }

    // Update user stats
    await Promise.all([
      User.findByIdAndUpdate(swap.initiatorId, {
        $inc: { 'stats.totalSwaps': 1, 'stats.ecoImpact': 2.5 }
      }),
      User.findByIdAndUpdate(swap.recipientId, {
        $inc: { 'stats.totalSwaps': 1, 'stats.ecoImpact': 2.5 }
      })
    ]);

    // Create notification for initiator
    await Notification.createSwapAcceptedNotification(
      swap.initiatorId,
      swap._id,
      swap.requestedItemId.title
    );

    // Populate the updated swap
    await swap.populate([
      { path: 'initiatorId', select: 'name avatar' },
      { path: 'recipientId', select: 'name avatar' },
      { path: 'requestedItemId', select: 'title images' },
      { path: 'offeredItemId', select: 'title images' }
    ]);

    res.json({
      success: true,
      message: 'Swap accepted successfully',
      swap
    });
  } catch (error) {
    console.error('❌ Accept swap error:', error);
    res.status(500).json({
      error: 'Failed to accept swap',
      message: 'Something went wrong while accepting the swap'
    });
  }
});

// @route   PUT /api/swaps/:id/reject
// @desc    Reject a swap request
// @access  Private
router.put('/:id/reject', [
  authenticateToken,
  body('responseMessage').optional().trim().isLength({ max: 500 }).withMessage('Response message must be less than 500 characters')
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

    const swap = await Swap.findById(req.params.id)
      .populate('requestedItemId');

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is the recipient
    if (swap.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the recipient can reject a swap'
      });
    }

    // Check if swap is pending
    if (swap.status !== 'Pending') {
      return res.status(400).json({
        error: 'Swap not pending',
        message: 'This swap is not in a pending state'
      });
    }

    // Reject the swap
    await swap.rejectSwap(req.body.responseMessage);

    // Create notification for initiator
    await Notification.createSwapRejectedNotification(
      swap.initiatorId,
      swap._id,
      swap.requestedItemId.title
    );

    // Populate the updated swap
    await swap.populate([
      { path: 'initiatorId', select: 'name avatar' },
      { path: 'recipientId', select: 'name avatar' },
      { path: 'requestedItemId', select: 'title images' },
      { path: 'offeredItemId', select: 'title images' }
    ]);

    res.json({
      success: true,
      message: 'Swap rejected successfully',
      swap
    });
  } catch (error) {
    console.error('❌ Reject swap error:', error);
    res.status(500).json({
      error: 'Failed to reject swap',
      message: 'Something went wrong while rejecting the swap'
    });
  }
});

// @route   PUT /api/swaps/:id/complete
// @desc    Complete a swap
// @access  Private
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is part of this swap
    if (swap.initiatorId.toString() !== req.user._id.toString() && 
        swap.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only complete swaps you are involved in'
      });
    }

    // Check if swap is accepted
    if (swap.status !== 'Accepted') {
      return res.status(400).json({
        error: 'Swap not accepted',
        message: 'This swap must be accepted before it can be completed'
      });
    }

    // Complete the swap
    await swap.completeSwap();

    res.json({
      success: true,
      message: 'Swap completed successfully',
      swap
    });
  } catch (error) {
    console.error('❌ Complete swap error:', error);
    res.status(500).json({
      error: 'Failed to complete swap',
      message: 'Something went wrong while completing the swap'
    });
  }
});

// @route   PUT /api/swaps/:id/cancel
// @desc    Cancel a swap
// @access  Private
router.put('/:id/cancel', [
  authenticateToken,
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
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

    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is part of this swap
    if (swap.initiatorId.toString() !== req.user._id.toString() && 
        swap.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only cancel swaps you are involved in'
      });
    }

    // Check if swap can be cancelled
    if (swap.status === 'Completed' || swap.status === 'Cancelled') {
      return res.status(400).json({
        error: 'Swap cannot be cancelled',
        message: 'This swap cannot be cancelled'
      });
    }

    // Cancel the swap
    await swap.cancelSwap(req.user._id, req.body.reason);

    res.json({
      success: true,
      message: 'Swap cancelled successfully',
      swap
    });
  } catch (error) {
    console.error('❌ Cancel swap error:', error);
    res.status(500).json({
      error: 'Failed to cancel swap',
      message: 'Something went wrong while cancelling the swap'
    });
  }
});

// @route   POST /api/swaps/:id/message
// @desc    Add message to swap chat
// @access  Private
router.post('/:id/message', [
  authenticateToken,
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters')
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

    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({
        error: 'Swap not found',
        message: 'The requested swap does not exist'
      });
    }

    // Check if user is part of this swap
    if (swap.initiatorId.toString() !== req.user._id.toString() && 
        swap.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only message in swaps you are involved in'
      });
    }

    // Add message
    await swap.addMessage(req.user._id, req.body.message);

    // Create notification for the other user
    const recipientId = swap.initiatorId.toString() === req.user._id.toString() 
      ? swap.recipientId 
      : swap.initiatorId;

    await Notification.createMessageNotification(
      recipientId,
      req.user._id,
      swap._id,
      req.body.message
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      chatMessages: swap.chatMessages
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: 'Something went wrong while sending the message'
    });
  }
});

module.exports = router; 
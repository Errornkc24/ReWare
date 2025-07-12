const express = require('express');
const multer = require('multer');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, uploadRateLimiter, requireAdmin } = require('../middleware/auth');
const Item = require('../models/Item');
const User = require('../models/User');
const { uploadMultipleImages, deleteMultipleImages, validateImage } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Max 5 images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/items
// @desc    Get all items with filters
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Sportswear']),
  query('size').optional().isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']),
  query('condition').optional().isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']),
  query('minPoints').optional().isInt({ min: 0 }).withMessage('Min points must be a positive integer'),
  query('maxPoints').optional().isInt({ min: 0 }).withMessage('Max points must be a positive integer'),
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
    const limit = parseInt(req.query.limit) || 12;
    
    const filters = {
      category: req.query.category,
      size: req.query.size,
      condition: req.query.condition,
      minPoints: req.query.minPoints ? parseInt(req.query.minPoints) : null,
      maxPoints: req.query.maxPoints ? parseInt(req.query.maxPoints) : null,
      search: req.query.search
    };

    const items = await Item.searchItems(filters, page, limit);
    const totalItems = await Item.countDocuments({
      status: 'Available',
      isApproved: true,
      ...(filters.category && { category: filters.category }),
      ...(filters.size && { size: filters.size }),
      ...(filters.condition && { condition: filters.condition }),
      ...(filters.minPoints && { pointsRequired: { $gte: filters.minPoints } }),
      ...(filters.maxPoints && { pointsRequired: { $lte: filters.maxPoints } })
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
    console.error('❌ Get items error:', error);
    res.status(500).json({
      error: 'Failed to get items',
      message: 'Something went wrong while fetching items'
    });
  }
});

// @route   GET /api/items/featured
// @desc    Get featured items
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const featuredItems = await Item.getFeaturedItems(parseInt(limit));

    res.json({
      success: true,
      items: featuredItems
    });
  } catch (error) {
    console.error('❌ Get featured items error:', error);
    res.status(500).json({
      error: 'Failed to get featured items',
      message: 'Something went wrong while fetching featured items'
    });
  }
});

// @route   GET /api/items/all
// @desc    Get all items (admin only)
// @access  Private (admin only)
router.get('/all', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 })
      .populate('ownerId', 'name email role avatar');
    res.json({ success: true, items });
  } catch (error) {
    console.error('❌ Get all items error:', error);
    res.status(500).json({ error: 'Failed to get all items' });
  }
});

// @route   GET /api/items/:id
// @desc    Get single item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('ownerId', 'name avatar stats.totalSwaps stats.ecoImpact badges')
      .populate('likes', 'name avatar');

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'The requested item does not exist'
      });
    }

    // Increment view count
    await item.incrementViews();

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('❌ Get item error:', error);
    res.status(500).json({
      error: 'Failed to get item',
      message: 'Something went wrong while fetching the item'
    });
  }
});

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post('/', [
  authenticateToken,
  uploadRateLimiter,
  upload.array('images', 5)
], async (req, res) => {
  try {
    // Check for validation errors
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     error: 'Validation failed',
    //     errors: errors.array()
    //   });
    // }

    // Check if images were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Images required',
        message: 'At least one image is required'
      });
    }

    // Validate images
    for (const file of req.files) {
      try {
        validateImage(file);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid image',
          message: error.message
        });
      }
    }

    // Upload images to Cloudinary
    const uploadedImages = await uploadMultipleImages(req.files, 'rewear/items');

    // Create item data
    const itemData = {
      ...req.body,
      ownerId: req.user._id,
      images: uploadedImages,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      swapType: req.body.swapType || 'Both',
      status: 'Pending', // Requires admin approval
      isApproved: false
    };

    // Create the item
    const item = await Item.create(itemData);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.itemsListed': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully and pending approval',
      item
    });
  } catch (error) {
    console.error('❌ Create item error:', error);
    res.status(500).json({
      error: 'Failed to create item',
      message: 'Something went wrong while creating the item'
    });
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (owner only)
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').optional().isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Sportswear']).withMessage('Invalid category'),
  body('size').optional().isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']).withMessage('Invalid size'),
  body('condition').optional().isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid condition'),
  body('pointsRequired').optional().isInt({ min: 1, max: 100 }).withMessage('Points must be between 1 and 100'),
  body('brand').optional().trim().isLength({ max: 50 }).withMessage('Brand must be less than 50 characters'),
  body('color').optional().trim().isLength({ max: 30 }).withMessage('Color must be less than 30 characters'),
  body('material').optional().trim().isLength({ max: 100 }).withMessage('Material must be less than 100 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('swapType').optional().isIn(['Direct Swap', 'Points Redemption', 'Both']).withMessage('Invalid swap type')
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

    // Check ownership
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own items'
      });
    }

    // Check if item can be updated (not swapped)
    if (item.status === 'Swapped') {
      return res.status(400).json({
        error: 'Cannot update swapped item',
        message: 'Swapped items cannot be updated'
      });
    }

    // Update item
    const updateData = { ...req.body };
    if (req.body.tags) {
      updateData.tags = JSON.parse(req.body.tags);
    }

    // If item was approved and is being updated, set back to pending
    if (item.isApproved) {
      updateData.isApproved = false;
      updateData.status = 'Pending';
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name avatar');

    res.json({
      success: true,
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('❌ Update item error:', error);
    res.status(500).json({
      error: 'Failed to update item',
      message: 'Something went wrong while updating the item'
    });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'The requested item does not exist'
      });
    }

    // Check ownership
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own items'
      });
    }

    // Check if item can be deleted (not swapped)
    if (item.status === 'Swapped') {
      return res.status(400).json({
        error: 'Cannot delete swapped item',
        message: 'Swapped items cannot be deleted'
      });
    }

    // Delete images from Cloudinary
    if (item.images && item.images.length > 0) {
      const publicIds = item.images.map(img => img.publicId);
      await deleteMultipleImages(publicIds);
    }

    // Delete item
    await Item.findByIdAndDelete(req.params.id);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.itemsListed': -1 }
    });

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete item error:', error);
    res.status(500).json({
      error: 'Failed to delete item',
      message: 'Something went wrong while deleting the item'
    });
  }
});

// @route   POST /api/items/:id/like
// @desc    Toggle like on item
// @access  Private
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'The requested item does not exist'
      });
    }

    // Toggle like
    await item.toggleLike(req.user._id);

    res.json({
      success: true,
      message: 'Like toggled successfully',
      likes: item.likes
    });
  } catch (error) {
    console.error('❌ Toggle like error:', error);
    res.status(500).json({
      error: 'Failed to toggle like',
      message: 'Something went wrong while toggling like'
    });
  }
});

// @route   PUT /api/items/:id/approve
// @desc    Approve item (admin only)
// @access  Private (admin only)
router.put('/:id/approve', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    item.isApproved = true;
    item.status = 'Available';
    await item.save();
    res.json({ success: true, message: 'Item approved', item });
  } catch (error) {
    console.error('❌ Approve item error:', error);
    res.status(500).json({ error: 'Failed to approve item' });
  }
});

// @route   GET /api/items/user/:userId
// @desc    Get items by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 12, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { ownerId: req.params.userId };
    if (status) query.status = status;

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('ownerId', 'name avatar');

    const totalItems = await Item.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems,
        hasNext: parseInt(page) < Math.ceil(totalItems / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get user items error:', error);
    res.status(500).json({
      error: 'Failed to get user items',
      message: 'Something went wrong while fetching user items'
    });
  }
});

module.exports = router; 
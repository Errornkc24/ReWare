const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
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
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    swapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Swap'
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    points: Number,
    badge: String,
    url: String
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to mark email as sent
notificationSchema.methods.markEmailSent = function() {
  this.isEmailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, page = 1, limit = 20, unreadOnly = false) {
  const query = { userId };
  if (unreadOnly) query.isRead = false;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('data.senderId', 'name avatar')
    .populate('data.swapId', 'status')
    .populate('data.itemId', 'title images');
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

// Static method to create notification
notificationSchema.statics.createNotification = function(userId, type, title, message, data = {}) {
  return this.create({
    userId,
    type,
    title,
    message,
    data
  });
};

// Static method to create swap request notification
notificationSchema.statics.createSwapRequestNotification = function(recipientId, swapId, senderId, itemTitle) {
  return this.createNotification(
    recipientId,
    'swap_request',
    'New Swap Request',
    `Someone wants to swap with your "${itemTitle}"`,
    { swapId, senderId, itemId: swapId }
  );
};

// Static method to create swap accepted notification
notificationSchema.statics.createSwapAcceptedNotification = function(initiatorId, swapId, itemTitle) {
  return this.createNotification(
    initiatorId,
    'swap_accepted',
    'Swap Accepted!',
    `Your swap request for "${itemTitle}" was accepted!`,
    { swapId }
  );
};

// Static method to create swap rejected notification
notificationSchema.statics.createSwapRejectedNotification = function(initiatorId, swapId, itemTitle) {
  return this.createNotification(
    initiatorId,
    'swap_rejected',
    'Swap Rejected',
    `Your swap request for "${itemTitle}" was rejected.`,
    { swapId }
  );
};

// Static method to create item approved notification
notificationSchema.statics.createItemApprovedNotification = function(userId, itemId, itemTitle) {
  return this.createNotification(
    userId,
    'item_approved',
    'Item Approved!',
    `Your item "${itemTitle}" has been approved and is now live.`,
    { itemId }
  );
};

// Static method to create item rejected notification
notificationSchema.statics.createItemRejectedNotification = function(userId, itemId, itemTitle, reason) {
  return this.createNotification(
    userId,
    'item_rejected',
    'Item Rejected',
    `Your item "${itemTitle}" was rejected: ${reason}`,
    { itemId }
  );
};

// Static method to create points earned notification
notificationSchema.statics.createPointsEarnedNotification = function(userId, points, reason) {
  return this.createNotification(
    userId,
    'points_earned',
    'Points Earned!',
    `You earned ${points} points for ${reason}`,
    { points }
  );
};

// Static method to create badge earned notification
notificationSchema.statics.createBadgeEarnedNotification = function(userId, badge) {
  return this.createNotification(
    userId,
    'badge_earned',
    'New Badge Earned!',
    `Congratulations! You earned the "${badge}" badge.`,
    { badge }
  );
};

// Static method to create new message notification
notificationSchema.statics.createMessageNotification = function(recipientId, senderId, swapId, message) {
  return this.createNotification(
    recipientId,
    'new_message',
    'New Message',
    `You have a new message in your swap conversation.`,
    { senderId, swapId }
  );
};

// Pre-save middleware to set priority based on type
notificationSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.type) {
      case 'swap_request':
      case 'swap_accepted':
        this.priority = 'high';
        break;
      case 'item_approved':
      case 'item_rejected':
      case 'new_message':
        this.priority = 'medium';
        break;
      default:
        this.priority = 'low';
    }
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema); 
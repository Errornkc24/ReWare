const mongoose = require('mongoose');

const swapSchema = new mongoose.Schema({
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  offeredItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  pointsOffered: {
    type: Number,
    min: 0
  },
  swapType: {
    type: String,
    enum: ['Direct Swap', 'Points Redemption'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  message: {
    type: String,
    maxlength: 500
  },
  responseMessage: {
    type: String,
    maxlength: 500
  },
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    maxlength: 200
  },
  ecoImpact: {
    type: Number,
    default: 0 // CO2 kg saved
  },
  location: {
    meetupPoint: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  ratings: {
    initiatorRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 300 },
      createdAt: Date
    },
    recipientRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 300 },
      createdAt: Date
    }
  },
  chatMessages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
swapSchema.index({ initiatorId: 1, status: 1 });
swapSchema.index({ recipientId: 1, status: 1 });
swapSchema.index({ requestedItemId: 1 });
swapSchema.index({ offeredItemId: 1 });
swapSchema.index({ createdAt: -1 });
swapSchema.index({ completedAt: -1 });

// Virtual for swap URL
swapSchema.virtual('swapUrl').get(function() {
  return `/swaps/${this._id}`;
});

// Method to accept swap
swapSchema.methods.acceptSwap = function(responseMessage = '') {
  this.status = 'Accepted';
  this.responseMessage = responseMessage;
  return this.save();
};

// Method to reject swap
swapSchema.methods.rejectSwap = function(responseMessage = '') {
  this.status = 'Rejected';
  this.responseMessage = responseMessage;
  return this.save();
};

// Method to complete swap
swapSchema.methods.completeSwap = function() {
  this.status = 'Completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to cancel swap
swapSchema.methods.cancelSwap = function(userId, reason = '') {
  this.status = 'Cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  return this.save();
};

// Method to add chat message
swapSchema.methods.addMessage = function(senderId, message) {
  this.chatMessages.push({
    senderId,
    message,
    timestamp: new Date()
  });
  return this.save();
};

// Method to mark messages as read
swapSchema.methods.markMessagesAsRead = function(userId) {
  this.chatMessages.forEach(msg => {
    if (msg.senderId.toString() !== userId.toString() && !msg.isRead) {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Method to add rating
swapSchema.methods.addRating = function(userId, rating, comment) {
  if (this.initiatorId.toString() === userId.toString()) {
    this.ratings.initiatorRating = { rating, comment, createdAt: new Date() };
  } else if (this.recipientId.toString() === userId.toString()) {
    this.ratings.recipientRating = { rating, comment, createdAt: new Date() };
  }
  return this.save();
};

// Static method to get user's swaps
swapSchema.statics.getUserSwaps = function(userId, status = null, page = 1, limit = 10) {
  const query = {
    $or: [
      { initiatorId: userId },
      { recipientId: userId }
    ]
  };
  
  if (status) query.status = status;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('initiatorId', 'name avatar')
    .populate('recipientId', 'name avatar')
    .populate('requestedItemId', 'title images')
    .populate('offeredItemId', 'title images');
};

// Static method to get pending swaps for user
swapSchema.statics.getPendingSwaps = function(userId) {
  return this.find({
    recipientId: userId,
    status: 'Pending'
  })
  .populate('initiatorId', 'name avatar')
  .populate('requestedItemId', 'title images pointsRequired')
  .populate('offeredItemId', 'title images pointsRequired')
  .sort({ createdAt: -1 });
};

// Pre-save middleware to calculate eco impact
swapSchema.pre('save', function(next) {
  if (this.status === 'Completed' && this.ecoImpact === 0) {
    // Calculate eco impact based on items involved
    this.ecoImpact = 5; // Default 5kg CO2 saved per swap
  }
  next();
});

module.exports = mongoose.model('Swap', swapSchema); 
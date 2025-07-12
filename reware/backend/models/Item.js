const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  category: {
    type: String,
    required: true,
    enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Sportswear']
  },
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    trim: true,
    maxlength: 30
  },
  material: {
    type: String,
    trim: true,
    maxlength: 100
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pointsRequired: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  status: {
    type: String,
    enum: ['Available', 'Pending', 'Swapped', 'Removed'],
    default: 'Available',
    index: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    city: String,
    country: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  swapType: {
    type: String,
    enum: ['Direct Swap', 'Points Redemption', 'Both'],
    default: 'Both'
  },
  ecoImpact: {
    type: Number,
    default: 2.5 // Average CO2 kg saved per item
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  weight: Number, // in grams
  careInstructions: String,
  originalPrice: Number,
  estimatedValue: Number
}, {
  timestamps: true
});

// Indexes for better query performance
itemSchema.index({ category: 1, status: 1 });
itemSchema.index({ size: 1, status: 1 });
itemSchema.index({ condition: 1, status: 1 });
itemSchema.index({ pointsRequired: 1, status: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ 'location.coordinates': '2dsphere' });
itemSchema.index({ tags: 1 });

// Virtual for primary image
itemSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual for item URL
itemSchema.virtual('itemUrl').get(function() {
  return `/items/${this._id}`;
});

// Method to increment views
itemSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle like
itemSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to mark as swapped
itemSchema.methods.markAsSwapped = function() {
  this.status = 'Swapped';
  return this.save();
};

// Static method to get featured items
itemSchema.statics.getFeaturedItems = function(limit = 8) {
  return this.find({
    status: 'Available',
    isApproved: true
  })
  .sort({ views: -1, likes: { $size: '$likes' }, createdAt: -1 })
  .limit(limit)
  .populate('ownerId', 'name avatar')
  .select('title images pointsRequired category condition ownerId views likes');
};

// Static method to search items
itemSchema.statics.searchItems = function(filters, page = 1, limit = 12) {
  const query = {
    status: 'Available',
    isApproved: true
  };

  if (filters.category) query.category = filters.category;
  if (filters.size) query.size = filters.size;
  if (filters.condition) query.condition = filters.condition;
  if (filters.minPoints) query.pointsRequired = { $gte: filters.minPoints };
  if (filters.maxPoints) query.pointsRequired = { ...query.pointsRequired, $lte: filters.maxPoints };
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { brand: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'name avatar')
    .select('title images pointsRequired category condition ownerId views likes createdAt');
};

// Pre-save middleware to ensure at least one primary image
itemSchema.pre('save', function(next) {
  if (this.images.length > 0 && !this.images.some(img => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema); 
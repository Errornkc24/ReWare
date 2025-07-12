const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  points: {
    type: Number,
    default: 10,
    min: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  badges: [{
    type: String,
    enum: ['Eco Hero', 'Frequent Swapper', 'First Swap', 'Top Contributor', 'Community Leader']
  }],
  stats: {
    totalSwaps: { type: Number, default: 0 },
    itemsListed: { type: Number, default: 0 },
    itemsReceived: { type: Number, default: 0 },
    ecoImpact: { type: Number, default: 0 }, // CO2 saved in kg
    memberSince: { type: Date, default: Date.now }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      swapRequests: { type: Boolean, default: true },
      newItems: { type: Boolean, default: true }
    },
    categories: [{
      type: String,
      enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Sportswear']
    }],
    sizes: [{
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
    }]
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'stats.totalSwaps': -1 });
userSchema.index({ 'stats.ecoImpact': -1 });
userSchema.index({ createdAt: -1 });

// Virtual for full profile URL
userSchema.virtual('profileUrl').get(function() {
  return `/users/${this._id}`;
});

// Method to add points
userSchema.methods.addPoints = function(amount) {
  this.points += amount;
  return this.save();
};

// Method to deduct points
userSchema.methods.deductPoints = function(amount) {
  if (this.points >= amount) {
    this.points -= amount;
    return this.save();
  }
  throw new Error('Insufficient points');
};

// Method to add badge
userSchema.methods.addBadge = function(badge) {
  if (!this.badges.includes(badge)) {
    this.badges.push(badge);
    return this.save();
  }
  return this;
};

// Method to update eco impact
userSchema.methods.updateEcoImpact = function(kgSaved) {
  this.stats.ecoImpact += kgSaved;
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find()
    .sort({ 'stats.ecoImpact': -1, 'stats.totalSwaps': -1 })
    .limit(limit)
    .select('name avatar stats.ecoImpact stats.totalSwaps badges');
};

module.exports = mongoose.model('User', userSchema); 
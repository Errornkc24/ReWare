const admin = require('firebase-admin');
const User = require('../models/User');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Middleware to authenticate Firebase token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Find or create user in our database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        firebaseUid: decodedToken.uid,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        email: decodedToken.email,
        avatar: decodedToken.picture || null
      });
    } else {
      // Update last active timestamp
      user.lastActive = new Date();
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        error: 'Token revoked',
        message: 'Your session has been revoked. Please log in again.'
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Please provide a valid authentication token'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Something went wrong while checking permissions'
    });
  }
};

// Middleware to check if user owns the resource
const requireOwnership = (resourceField = 'ownerId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      const resourceId = req.params.id || req.params.itemId || req.params.swapId;
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID required',
          message: 'Please provide a valid resource ID'
        });
      }

      // This will be implemented in the specific routes
      // as we need to know which model to query
      req.resourceField = resourceField;
      next();
    } catch (error) {
      console.error('❌ Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong while checking ownership'
      });
    }
  };
};

// Middleware to rate limit requests
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes for auth
const apiRateLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes for API
const uploadRateLimiter = (req, res, next) => next();

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnership,
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter
}; 
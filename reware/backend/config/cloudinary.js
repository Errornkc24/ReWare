const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (file, folder = 'rewear') => {
  try {
    // Convert buffer to base64 string for memoryStorage
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_bytes: 10 * 1024 * 1024 // 10MB limit
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Upload multiple images
const uploadMultipleImages = async (files, folder = 'rewear') => {
  try {
    const uploadPromises = files.map((file, index) => 
      uploadImage(file, folder).then(result => ({
        ...result,
        isPrimary: index === 0 // First image is primary
      }))
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('❌ Multiple images upload error:', error);
    throw new Error('Failed to upload images');
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

// Delete multiple images
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('❌ Multiple images delete error:', error);
    throw new Error('Failed to delete images');
  }
};

// Generate optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, {
    ...finalOptions,
    secure: true
  });
};

// Generate thumbnail URL
const getThumbnailUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, {
    width: 200,
    height: 200,
    crop: 'fill'
  });
};

// Generate medium size URL
const getMediumUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, {
    width: 600,
    height: 600,
    crop: 'limit'
  });
};

// Generate large size URL
const getLargeUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, {
    width: 1200,
    height: 1200,
    crop: 'limit'
  });
};

// Validate image file
const validateImage = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return true;
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getMediumUrl,
  getLargeUrl,
  validateImage
}; 
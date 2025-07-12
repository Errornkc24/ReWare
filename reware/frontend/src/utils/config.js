// Configuration validation utility
export const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Required Firebase configuration
  const requiredFirebaseConfig = {
    REACT_APP_FIREBASE_API_KEY: 'Firebase API Key',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'Firebase Auth Domain',
    REACT_APP_FIREBASE_PROJECT_ID: 'Firebase Project ID',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'Firebase Storage Bucket',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: 'Firebase Messaging Sender ID',
    REACT_APP_FIREBASE_APP_ID: 'Firebase App ID'
  };

  // Check for missing required config
  Object.entries(requiredFirebaseConfig).forEach(([key, name]) => {
    if (!process.env[key]) {
      errors.push(`Missing ${name} (${key})`);
    } else if (key === 'REACT_APP_FIREBASE_API_KEY' && !process.env[key].startsWith('AIza')) {
      errors.push(`Invalid Firebase API Key format. Should start with 'AIza'`);
    }
  });

  // Check for optional config
  if (!process.env.REACT_APP_API_URL) {
    warnings.push('REACT_APP_API_URL not set, using default: http://localhost:5000');
  }

  // Log errors and warnings
  if (errors.length > 0) {
    console.error('❌ Configuration Errors:', errors);
    return { isValid: false, errors, warnings };
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:', warnings);
  }

  console.log('✅ Configuration is valid');
  return { isValid: true, errors: [], warnings };
};

// Get configuration with defaults
export const getConfig = () => ({
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  },
  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
  },
  app: {
    name: 'ReWear',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Development helper to show config status
export const showConfigStatus = () => {
  if (process.env.NODE_ENV === 'development') {
    const { isValid, errors, warnings } = validateConfig();
    const config = getConfig();
    
    console.group('🔧 ReWear Configuration Status');
    console.log('Environment:', config.app.environment);
    console.log('API URL:', config.api.baseURL);
    console.log('Firebase Project:', config.firebase.projectId);
    console.log('Valid:', isValid);
    
    if (errors.length > 0) {
      console.group('❌ Errors');
      errors.forEach(error => console.error(error));
      console.groupEnd();
    }
    
    if (warnings.length > 0) {
      console.group('⚠️ Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}; 
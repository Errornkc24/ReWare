import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import axios from 'axios';
import toast from 'react-hot-toast';

// Firebase configuration with validation
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration:', missingFields);
    return false;
  }
  
  if (!firebaseConfig.apiKey.startsWith('AIza')) {
    console.error('Invalid Firebase API key format');
    return false;
  }
  
  return true;
};

// Initialize Firebase only if config is valid
let app, auth, googleProvider;

if (validateFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  console.error('Firebase configuration is invalid. Please check your .env file.');
}

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Configure axios base URL
  useEffect(() => {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  }, []);

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        if (user) {
          try {
            const token = await user.getIdToken(true); // Force refresh
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Failed to get auth token:', error);
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [user]);

  // Fetch or create user profile
  const fetchOrCreateUserProfile = useCallback(async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // If user doesn't exist in backend, create them
      if (error.response?.status === 404) {
        try {
          const token = await firebaseUser.getIdToken();
          const response = await axios.post('/api/auth/signup', {
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            email: firebaseUser.email,
            firebaseUid: firebaseUser.uid,
            avatar: firebaseUser.photoURL
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProfile(response.data.user);
          return response.data.user;
        } catch (signupError) {
          console.error('Error creating user profile:', signupError);
          toast.error('Failed to create user profile. Please try again.');
          throw signupError;
        }
      }
      throw error;
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setAuthError('Firebase not initialized');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          setAuthError(null);
          
          // Get or create user profile
          await fetchOrCreateUserProfile(firebaseUser);
        } else {
          setUser(null);
          setUserProfile(null);
          setAuthError(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthError(error.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [fetchOrCreateUserProfile]);

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back! 🌱');
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      let message = 'Failed to sign in';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, name) => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile with display name
      if (name) {
        await updateFirebaseProfile(result.user, {
          displayName: name
        });
      }
      
      // Create user profile in backend
      const token = await result.user.getIdToken();
      await axios.post('/api/auth/signup', {
        name,
        email,
        firebaseUid: result.user.uid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Account created successfully! Welcome to ReWear 🌱');
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      let message = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/password accounts are not enabled';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase not initialized');
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      toast.success('Welcome to ReWear! 🌱');
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      let message = 'Failed to sign in with Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          message = 'Sign in was cancelled';
          break;
        case 'auth/popup-blocked':
          message = 'Popup was blocked. Please allow popups for this site';
          break;
        case 'auth/account-exists-with-different-credential':
          message = 'An account already exists with this email using a different sign-in method';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      const response = await axios.put('/api/auth/profile', updates);
      setUserProfile(response.data.user);
      toast.success('Profile updated successfully');
      return response.data.user;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      await fetchOrCreateUserProfile(user);
    } catch (error) {
      console.error('Profile refresh error:', error);
    }
  };

  // Add points to user
  const addPoints = async (amount) => {
    try {
      const response = await axios.post('/api/auth/points', { amount });
      setUserProfile(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Add points error:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    authError,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateProfile,
    refreshProfile,
    addPoints
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
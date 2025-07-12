import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', duration: 0.25 } }
};

const UserDropdown = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const avatar = user?.photoURL || null;
  const name = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={dropdownVariants}
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center mb-4">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-green-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg border-2 border-green-400">
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div className="ml-3">
              <div className="font-semibold text-gray-900 dark:text-white">{name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">{user?.email}</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <button
              className="w-full text-left py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-800 dark:text-gray-200"
              onClick={() => { window.location.href = '/profile'; onClose && onClose(); }}
            >
              Profile
            </button>
            <button
              className="w-full text-left py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-800 dark:text-gray-200"
              onClick={() => { window.location.href = '/settings'; onClose && onClose(); }}
            >
              Settings
            </button>
            <button
              className="w-full text-left py-2 px-2 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors text-red-600 dark:text-red-400 mt-2"
              onClick={() => { logout(); onClose && onClose(); }}
            >
              Logout
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserDropdown; 
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../contexts/NotificationContext';

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', duration: 0.25 } }
};

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, handleSwapAction, markAsRead } = useNotifications();
  const hasNotifications = notifications && notifications.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={dropdownVariants}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notifications
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {hasNotifications ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((n, i) => (
                  <li key={i} className="py-2 flex items-start">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></span>
                    <div className="flex-1">
                      <div className="text-gray-800 dark:text-gray-100 text-sm font-medium">{n.title || n.type}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{n.body || n.message}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{n.time ? n.time : (n.createdAt ? new Date(n.createdAt).toLocaleString() : '')}</div>
                      {/* Swap actions if swap notification */}
                      {n.type === 'swap_request' && n.swapId && (
                        <div className="mt-2 flex gap-2">
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs" onClick={() => { handleSwapAction(n.swapId, 'accept'); markAsRead(i); }}>Accept</button>
                          <button className="bg-red-600 text-white px-2 py-1 rounded text-xs" onClick={() => { handleSwapAction(n.swapId, 'reject'); markAsRead(i); }}>Reject</button>
                        </div>
                      )}
                    </div>
                    <button className="ml-2 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => markAsRead(i)} title="Mark as read">&times;</button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-600 dark:text-gray-300 py-4 text-center">No new notifications.</div>
            )}
          </div>
          <button
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown; 
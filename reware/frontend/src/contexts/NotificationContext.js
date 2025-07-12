import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getAuth } from 'firebase/auth';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  // Connect to socket.io and listen for events
  useEffect(() => {
    let s;
    const connectSocket = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      s = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket']
      });
      setSocket(s);
      // Listen for notification events
      s.on('notification', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });
      s.on('swap_request', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });
      s.on('swap_status', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });
      s.on('new_item', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });
    };
    connectSocket();
    return () => {
      if (s) s.disconnect();
    };
  }, []);

  // Accept/reject/complete/cancel swap from notification
  const handleSwapAction = useCallback(async (swapId, action) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      let endpoint = '';
      let method = 'PUT';
      switch (action) {
        case 'accept': endpoint = `/api/swaps/${swapId}/accept`; break;
        case 'reject': endpoint = `/api/swaps/${swapId}/reject`; break;
        case 'complete': endpoint = `/api/swaps/${swapId}/complete`; break;
        case 'cancel': endpoint = `/api/swaps/${swapId}/cancel`; break;
        default: return;
      }
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to update swap');
      // Optionally, update notifications or UI
    } catch (error) {
      alert(error.message || 'Failed to update swap');
    }
  }, []);

  // Mark notification as read
  const markAsRead = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <NotificationContext.Provider value={{ notifications, handleSwapAction, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}; 
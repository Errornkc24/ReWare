import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from "../components/StatCard";
import { getAuth } from "firebase/auth";

const Modal = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full p-6 relative"
          initial={{ scale: 0.9, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 40 }}
          transition={{ type: 'spring', duration: 0.4 }}
        >
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const AdminPage = () => {
  const [stats, setStats] = useState({});
  const [recentItems, setRecentItems] = useState([]);
  const [recentSwaps, setRecentSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [swaps, setSwaps] = useState([]);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [swapsError, setSwapsError] = useState(null);
  const [itemsError, setItemsError] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        const data = await response.json();
        setStats(data.stats || {});
      } catch (error) {
        console.error('Error loading admin data:', error);
        setStats({
          totalUsers: 0,
          totalItems: 0,
          totalSwaps: 0,
          revenue: 0
        });
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  useEffect(() => {
    const fetchAllItems = async () => {
      setLoading(true);
      setItemsError(null);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/items/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch items');
        const data = await response.json();
        setRecentItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        setItemsError(error.message || 'Error loading items');
        setRecentItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllItems();
  }, []);

  // Fetch users when userModalOpen is true
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (error) {
        setUsersError(error.message || 'Error loading users');
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    if (userModalOpen) fetchUsers();
  }, [userModalOpen]);

  // Fetch swaps on mount
  useEffect(() => {
    const fetchSwaps = async () => {
      setSwapsLoading(true);
      setSwapsError(null);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/admin/swaps', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch swaps');
        const data = await response.json();
        setSwaps(Array.isArray(data.swaps) ? data.swaps : []);
      } catch (error) {
        setSwapsError(error.message || 'Error loading swaps');
        setSwaps([]);
      } finally {
        setSwapsLoading(false);
      }
    };
    fetchSwaps();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Stat card data
  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers ?? 0,
      color: { bg: 'bg-blue-100', text: 'text-blue-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Total Items',
      value: stats.totalItems ?? 0,
      color: { bg: 'bg-green-100', text: 'text-green-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Total Swaps',
      value: stats.totalSwaps ?? 0,
      color: { bg: 'bg-purple-100', text: 'text-purple-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      label: 'Revenue',
      value: stats.revenue ?? 0,
      color: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    }
  ];

  // Add approve handler
  const handleApproveItem = async (itemId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5000/api/items/${itemId}/approve`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to approve item');
      // Optionally, refresh items or update UI
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Failed to approve item');
    }
  };

  // Promote/Demote user role
  const handleUserRoleChange = async (userId, newRole) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error('Failed to update user role');
      // Refresh users
      setUsers(users => users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert(error.message || 'Failed to update user role');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage and monitor the ReWear platform</p>
        </motion.div>

        {/* Stat Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Items */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Items</h2>
              <button className="text-green-600 hover:text-green-500 font-medium" onClick={() => setItemModalOpen(true)}>
                View All
              </button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading items...</div>
              ) : itemsError ? (
                <div className="p-4 text-center text-red-500">{itemsError}</div>
              ) : (
                recentItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-900 transition-colors"
                    onClick={() => setSelectedItem(item)}
                    tabIndex={0}
                    aria-label={`View details for ${item.title}`}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        by {item.ownerId?.name || item.ownerId?.email || 'Unknown'}
                      </p>
                      {!item.isApproved && (
                        <button
                          className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          onClick={e => { e.stopPropagation(); handleApproveItem(item._id); }}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.createdAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Swaps */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Swaps</h2>
              <button className="text-green-600 hover:text-green-500 font-medium" onClick={() => setUserModalOpen(true)}>
                View All
              </button>
            </div>
            <div className="space-y-4">
              {swapsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading swaps...</div>
              ) : swapsError ? (
                <div className="p-4 text-center text-red-500">{swapsError}</div>
              ) : (
                swaps.map((swap) => (
                  <div
                    key={swap._id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                    onClick={() => setSelectedSwap(swap)}
                    tabIndex={0}
                    aria-label={`View details for swap #${swap._id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">Swap #{swap._id.slice(-6)}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        swap.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        swap.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                        swap.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        swap.status === 'Cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {swap.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {swap.requestedItemId?.title || 'Unknown'}
                      {swap.offeredItemId ? ` ↔ ${swap.offeredItemId.title}` : ''}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {swap.initiatorId?.name || 'Unknown'} & {swap.recipientId?.name || 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(swap.createdAt).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="flex items-center justify-center p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900 transition-colors font-medium"
              onClick={() => setItemModalOpen(true)}
              aria-label="Moderate Items"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Moderate Items
            </button>
            <button
              className="flex items-center justify-center p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors font-medium"
              onClick={() => setUserModalOpen(true)}
              aria-label="Manage Users"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Users
            </button>
            <button
              className="flex items-center justify-center p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900 transition-colors font-medium"
              onClick={() => alert('Reports feature coming soon!')}
              aria-label="View Reports"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Reports
            </button>
          </div>
        </motion.div>

        {/* Modals for Manage Users and Moderate Items */}
        <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title="Manage Users">
          <div className="overflow-x-auto">
            {usersLoading ? (
              <div className="p-4 text-center text-gray-500">Loading users...</div>
            ) : usersError ? (
              <div className="p-4 text-center text-red-500">{usersError}</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map(user => (
                    <tr key={user._id}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{user.name}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{user.email}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-2">
                        {user.role === 'user' ? (
                          <button className="text-blue-600 hover:underline text-xs" onClick={() => handleUserRoleChange(user._id, 'admin')}>Promote to Admin</button>
                        ) : (
                          <button className="text-red-600 hover:underline text-xs" onClick={() => handleUserRoleChange(user._id, 'user')}>Demote</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
        <Modal open={itemModalOpen} onClose={() => setItemModalOpen(false)} title="Moderate Items">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading items...</div>
            ) : itemsError ? (
              <div className="p-4 text-center text-red-500">{itemsError}</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentItems.map(item => (
                    <tr key={item._id}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{item.title}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{item.ownerId?.name || item.ownerId?.email || 'Unknown'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        {!item.isApproved && (
                          <button className="text-green-600 hover:underline text-xs" onClick={() => handleApproveItem(item._id)}>Approve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
        {/* Modals for item/swap details */}
        <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title="Item Details">
          {selectedItem && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{selectedItem.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Owner: {selectedItem?.ownerId?.name || selectedItem?.ownerId?.email || 'Unknown'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Status: {selectedItem.status}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Created: {selectedItem.createdAt}</p>
            </div>
          )}
        </Modal>
        <Modal open={!!selectedSwap} onClose={() => setSelectedSwap(null)} title="Swap Details">
          {selectedSwap && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Swap #{selectedSwap._id.slice(-6)}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">Items: {selectedSwap.requestedItemId?.title || 'Unknown'} {selectedSwap.offeredItemId ? `↔ ${selectedSwap.offeredItemId.title}` : ''}</p>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Users: {selectedSwap.initiatorId?.name || 'Unknown'} & {selectedSwap.recipientId?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Status: {selectedSwap.status}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Created: {new Date(selectedSwap.createdAt).toLocaleString()}</p>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default AdminPage; 
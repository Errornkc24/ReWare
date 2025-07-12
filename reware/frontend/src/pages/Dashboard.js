import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

// Animated counter hook
function useCountUp(target, duration = 1) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;
    let increment = end / (duration * 60);
    let current = start;
    let frame = 0;
    function update() {
      frame++;
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setCount(end);
        return;
      }
      setCount(Math.round(current));
      requestAnimationFrame(update);
    }
    update();
    // eslint-disable-next-line
  }, [target, duration]);
  return count;
}

const statCardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6, type: 'spring' } })
};

const AnimatedStatCard = ({ icon, label, value, color, index }) => {
  const count = useCountUp(value, 1.2);
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm p-6"
      custom={index}
      initial="hidden"
      animate="visible"
      variants={statCardVariants}
    >
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${color.bg}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`text-2xl font-semibold ${color.text}`}>{count}</p>
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    itemsListed: 0,
    itemsSwapped: 0,
    itemsReceived: 0,
    totalSwaps: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Get Firebase token
        const auth = await import('firebase/auth');
        const firebaseAuth = auth.getAuth();
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) throw new Error('User not authenticated');
        const token = await currentUser.getIdToken();

        // Fetch stats
        const statsRes = await fetch('http://localhost:5000/api/users/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        if (!statsData.success) throw new Error(statsData.error || 'Failed to fetch stats');
        setStats({
          itemsListed: statsData.stats.totalItems || 0,
          itemsSwapped: statsData.stats.totalSwaps || 0,
          itemsReceived: statsData.stats.itemsReceived || 0,
          totalSwaps: statsData.stats.totalSwaps || 0
        });

        // Fetch recent swaps
        const swapsRes = await fetch('http://localhost:5000/api/users/swaps?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const swapsData = await swapsRes.json();
        let activity = [];
        if (swapsData.success && swapsData.swaps) {
          activity = swapsData.swaps.map(swap => ({
            id: swap._id,
            type: 'swap',
            message: `Swap with ${swap.initiatorId.name || swap.recipientId.name}`,
            date: swap.createdAt ? swap.createdAt.slice(0, 10) : '',
            status: swap.status
          }));
        }

        // Fetch recent items
        const itemsRes = await fetch('http://localhost:5000/api/users/items?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const itemsData = await itemsRes.json();
        if (itemsData.success && itemsData.items) {
          activity = [
            ...activity,
            ...itemsData.items.map(item => ({
              id: item._id,
              type: 'item',
              message: `You listed a new item: ${item.title}`,
              date: item.createdAt ? item.createdAt.slice(0, 10) : '',
              status: item.status
            }))
          ];
        }

        // Sort by date, descending
        activity.sort((a, b) => (b.date > a.date ? 1 : -1));
        setRecentActivity(activity.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Stat card data
  const statCards = [
    {
      label: 'Items Listed',
      value: stats.itemsListed,
      color: { bg: 'bg-green-100', text: 'text-green-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Items Swapped',
      value: stats.itemsSwapped,
      color: { bg: 'bg-blue-100', text: 'text-blue-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      label: 'Items Received',
      value: stats.itemsReceived,
      color: { bg: 'bg-purple-100', text: 'text-purple-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Total Swaps',
      value: stats.totalSwaps,
      color: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName || user?.email}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your sustainable fashion journey.
          </p>
          <p className="mt-2 italic text-green-700 text-sm">
            "The future of fashion is circular. Thank you for making a difference!"
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, i) => (
            <AnimatedStatCard key={card.label} {...card} index={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/add-item"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add New Item</p>
                  <p className="text-sm text-gray-500">List a clothing item for swapping</p>
                </div>
              </Link>

              <Link
                to="/items"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Browse Items</p>
                  <p className="text-sm text-gray-500">Discover items to swap</p>
                </div>
              </Link>

              <Link
                to="/swaps"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Swaps</p>
                  <p className="text-sm text-gray-500">Check your swap requests</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                to="/activity"
                className="text-sm text-green-600 hover:text-green-500 font-medium"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
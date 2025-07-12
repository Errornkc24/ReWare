import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SwapDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [swap, setSwap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSwap = async () => {
      try {
        // Mock data - in a real app, this would come from your API
        const mockSwap = {
          id: parseInt(id),
          status: 'pending',
          type: 'received',
          requestedItem: {
            id: 1,
            title: 'Vintage Denim Jacket',
            category: 'outerwear',
            size: 'M',
            condition: 'Good',
            image: 'https://via.placeholder.com/400x500/4F46E5/FFFFFF?text=Denim+Jacket',
            description: 'Classic vintage denim jacket in excellent condition.'
          },
          offeredItem: {
            id: 2,
            title: 'Red Summer Dress',
            category: 'dresses',
            size: 'S',
            condition: 'Excellent',
            image: 'https://via.placeholder.com/400x500/DC2626/FFFFFF?text=Red+Dress',
            description: 'Beautiful red summer dress, perfect for warm weather.'
          },
          requester: {
            id: 'user2',
            name: 'Mike J.',
            avatar: 'https://via.placeholder.com/100x100/6B7280/FFFFFF?text=MJ',
            location: 'Los Angeles, CA',
            rating: 4.5
          },
          message: 'I love this jacket! Would you be interested in swapping for my red summer dress? It\'s in excellent condition and would be perfect for the upcoming summer season.',
          createdAt: '2024-01-15',
          isOwner: true
        };
        
        setSwap(mockSwap);
      } catch (error) {
        console.error('Error loading swap:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSwap();
  }, [id]);

  const handleSwapAction = (action) => {
    // In a real app, this would update the swap status via API
    console.log(`Swap ${id} ${action}`);
    // Update local state accordingly
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading swap details...</p>
        </div>
      </div>
    );
  }

  if (!swap) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Swap not found</h2>
          <p className="text-gray-600 mb-4">The swap you're looking for doesn't exist.</p>
          <Link
            to="/swaps"
            className="text-green-600 hover:text-green-500 font-medium"
          >
            Back to swaps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/swaps"
            className="text-green-600 hover:text-green-500 font-medium mb-4 inline-block"
          >
            ← Back to swaps
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Swap Details</h1>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              swap.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
            </span>
            <span className="text-gray-600">Created {swap.createdAt}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Items Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Items</h2>
            
            <div className="space-y-6">
              {/* Requested Item */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">You Get</h3>
                <div className="flex space-x-4">
                  <img
                    src={swap.requestedItem.image}
                    alt={swap.requestedItem.title}
                    className="w-32 h-40 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{swap.requestedItem.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{swap.requestedItem.description}</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Category: {swap.requestedItem.category}</p>
                      <p>Size: {swap.requestedItem.size}</p>
                      <p>Condition: {swap.requestedItem.condition}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Arrow */}
              <div className="flex justify-center">
                <div className="text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>

              {/* Offered Item */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">You Give</h3>
                <div className="flex space-x-4">
                  <img
                    src={swap.offeredItem.image}
                    alt={swap.offeredItem.title}
                    className="w-32 h-40 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{swap.offeredItem.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{swap.offeredItem.description}</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Category: {swap.offeredItem.category}</p>
                      <p>Size: {swap.offeredItem.size}</p>
                      <p>Condition: {swap.offeredItem.condition}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User and Actions Section */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
              <div className="flex items-center space-x-4">
                <img
                  src={swap.requester.avatar}
                  alt={swap.requester.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{swap.requester.name}</h3>
                  <p className="text-sm text-gray-600">{swap.requester.location}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm text-gray-600">{swap.requester.rating}</span>
                  </div>
                </div>
              </div>
              <Link
                to={`/profile/${swap.requester.id}`}
                className="mt-4 inline-block text-green-600 hover:text-green-500 font-medium"
              >
                View Profile →
              </Link>
            </div>

            {/* Message */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Message</h2>
              <p className="text-gray-700 leading-relaxed">{swap.message}</p>
            </div>

            {/* Actions */}
            {swap.status === 'pending' && swap.isOwner && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => handleSwapAction('accept')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    Accept Swap
                  </button>
                  <button
                    onClick={() => handleSwapAction('decline')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    Decline Swap
                  </button>
                </div>
              </div>
            )}

            {/* Status Info */}
            {swap.status !== 'pending' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Information</h2>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Status: {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}</p>
                  <p>Created: {swap.createdAt}</p>
                  {swap.status === 'completed' && (
                    <p>Completed: {swap.completedAt}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapDetailPage; 
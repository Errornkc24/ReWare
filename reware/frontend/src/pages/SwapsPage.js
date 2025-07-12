import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SwapsPage = () => {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSwaps = async () => {
      try {
        // Mock data - in a real app, this would come from your API
        const mockSwaps = [
          {
            id: 1,
            type: 'received',
            status: 'pending',
            requestedItem: {
              id: 1,
              title: 'Vintage Denim Jacket',
              image: 'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=Denim+Jacket'
            },
            offeredItem: {
              id: 2,
              title: 'Red Summer Dress',
              image: 'https://via.placeholder.com/200x200/DC2626/FFFFFF?text=Red+Dress'
            },
            requester: {
              name: 'Mike J.',
              avatar: 'https://via.placeholder.com/50x50/6B7280/FFFFFF?text=MJ'
            },
            createdAt: '2024-01-15',
            message: 'I love this jacket! Would you be interested in swapping for my red summer dress?'
          },
          {
            id: 2,
            type: 'sent',
            status: 'accepted',
            requestedItem: {
              id: 3,
              title: 'White Sneakers',
              image: 'https://via.placeholder.com/200x200/6B7280/FFFFFF?text=Sneakers'
            },
            offeredItem: {
              id: 4,
              title: 'Blue Jeans',
              image: 'https://via.placeholder.com/200x200/1E40AF/FFFFFF?text=Jeans'
            },
            owner: {
              name: 'Emma L.',
              avatar: 'https://via.placeholder.com/50x50/6B7280/FFFFFF?text=EL'
            },
            createdAt: '2024-01-14',
            completedAt: '2024-01-16'
          },
          {
            id: 3,
            type: 'received',
            status: 'completed',
            requestedItem: {
              id: 5,
              title: 'Silk Blouse',
              image: 'https://via.placeholder.com/200x200/F59E0B/FFFFFF?text=Blouse'
            },
            offeredItem: {
              id: 6,
              title: 'Leather Handbag',
              image: 'https://via.placeholder.com/200x200/7C3AED/FFFFFF?text=Bag'
            },
            requester: {
              name: 'Alex P.',
              avatar: 'https://via.placeholder.com/50x50/6B7280/FFFFFF?text=AP'
            },
            createdAt: '2024-01-10',
            completedAt: '2024-01-12'
          }
        ];
        
        setSwaps(mockSwaps);
      } catch (error) {
        console.error('Error loading swaps:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSwaps();
  }, []);

  const filteredSwaps = swaps.filter(swap => {
    if (activeTab === 'pending') return swap.status === 'pending';
    if (activeTab === 'accepted') return swap.status === 'accepted';
    if (activeTab === 'completed') return swap.status === 'completed';
    return true;
  });

  const handleSwapAction = (swapId, action) => {
    // In a real app, this would update the swap status via API
    console.log(`Swap ${swapId} ${action}`);
    // Update local state accordingly
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading swaps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Swaps</h1>
          <p className="text-gray-600">Manage your clothing swap requests and transactions</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'pending', label: 'Pending', count: swaps.filter(s => s.status === 'pending').length },
                { key: 'accepted', label: 'Accepted', count: swaps.filter(s => s.status === 'accepted').length },
                { key: 'completed', label: 'Completed', count: swaps.filter(s => s.status === 'completed').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Swaps List */}
        {filteredSwaps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No swaps found</h3>
            <p className="text-gray-600">
              {activeTab === 'pending' && "You don't have any pending swap requests."}
              {activeTab === 'accepted' && "You don't have any accepted swaps."}
              {activeTab === 'completed' && "You don't have any completed swaps yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSwaps.map((swap) => (
              <div key={swap.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  {/* Items */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <img
                          src={swap.requestedItem.image}
                          alt={swap.requestedItem.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-600 mt-1">You get</p>
                        <p className="text-sm font-medium">{swap.requestedItem.title}</p>
                      </div>
                      
                      <div className="text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      
                      <div className="text-center">
                        <img
                          src={swap.offeredItem.image}
                          alt={swap.offeredItem.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-600 mt-1">You give</p>
                        <p className="text-sm font-medium">{swap.offeredItem.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="text-right">
                    <div className="mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        swap.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {swap.type === 'received' ? `From ${swap.requester.name}` : `To ${swap.owner.name}`}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {swap.status === 'completed' ? `Completed ${swap.completedAt}` : `Created ${swap.createdAt}`}
                    </div>

                    {/* Action Buttons */}
                    {swap.status === 'pending' && swap.type === 'received' && (
                      <div className="mt-3 space-x-2">
                        <button
                          onClick={() => handleSwapAction(swap.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1 px-3 rounded transition duration-300"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleSwapAction(swap.id, 'decline')}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-3 rounded transition duration-300"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                {swap.message && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{swap.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapsPage; 
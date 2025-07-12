import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ItemDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(false);

  useEffect(() => {
    // Simulate loading item details
    const loadItem = async () => {
      try {
        // Mock data - in a real app, this would come from your API
        const mockItem = {
          id: parseInt(id),
          title: 'Vintage Denim Jacket',
          category: 'outerwear',
          size: 'M',
          condition: 'Good',
          images: [
            'https://via.placeholder.com/600x800/4F46E5/FFFFFF?text=Denim+Jacket+1',
            'https://via.placeholder.com/600x800/4F46E5/FFFFFF?text=Denim+Jacket+2',
            'https://via.placeholder.com/600x800/4F46E5/FFFFFF?text=Denim+Jacket+3'
          ],
          owner: {
            id: 'user1',
            name: 'Sarah M.',
            avatar: 'https://via.placeholder.com/100x100/6B7280/FFFFFF?text=SM',
            location: 'New York, NY',
            rating: 4.8,
            joinDate: '2023-01-15'
          },
          description: 'Classic vintage denim jacket in excellent condition. This timeless piece features a comfortable fit and authentic vintage styling. Perfect for layering or as a statement piece.',
          tags: ['vintage', 'denim', 'jacket', 'casual'],
          createdAt: '2024-01-10',
          isOwner: false
        };
        
        setItem(mockItem);
      } catch (error) {
        console.error('Error loading item:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Item not found</h2>
          <p className="text-gray-600 mb-4">The item you're looking for doesn't exist.</p>
          <Link
            to="/items"
            className="text-green-600 hover:text-green-500 font-medium"
          >
            Browse all items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div>
              <div className="aspect-w-3 aspect-h-4 mb-4">
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </div>
              {item.images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {item.images.slice(1).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${item.title} ${index + 2}`}
                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Item Details */}
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span>Category: {item.category}</span>
                  <span>Size: {item.size}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                    item.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.condition}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">{item.description}</p>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Owner Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Owner</h3>
                <div className="flex items-center space-x-3">
                  <img
                    src={item.owner.avatar}
                    alt={item.owner.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{item.owner.name}</p>
                    <p className="text-sm text-gray-600">{item.owner.location}</p>
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-600">{item.owner.rating}</span>
                      <span className="text-sm text-gray-500">({item.owner.joinDate})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!item.isOwner && (
                  <button
                    onClick={() => setShowSwapModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    Request Swap
                  </button>
                )}
                <Link
                  to={`/profile/${item.owner.id}`}
                  className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition duration-300"
                >
                  View Owner's Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Modal */}
        {showSwapModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Swap</h3>
              <p className="text-gray-600 mb-4">
                You're about to request a swap for "{item.title}". The owner will be notified and can review your offer.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle swap request
                    setShowSwapModal(false);
                    // Add swap request logic here
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailPage; 
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        let profileRes, itemsRes;
        if (!userId || userId === user?.uid) {
          // Own profile
          const token = await user.getIdToken();
          profileRes = await fetch('http://localhost:5000/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          itemsRes = await fetch('http://localhost:5000/api/users/items', {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // Public profile
          profileRes = await fetch(`http://localhost:5000/api/users/${userId}`);
          itemsRes = await fetch(`http://localhost:5000/api/users/${userId}/items`);
        }
        if (!profileRes.ok) throw new Error('Failed to fetch user profile');
        if (!itemsRes.ok) throw new Error('Failed to fetch user items');
        const profileData = await profileRes.json();
        const itemsData = await itemsRes.json();
        let profileObj;
        if (!userId || userId === user?.uid) {
          profileObj = {
            name: profileData.user.name,
            username: profileData.user.email.split('@')[0],
            avatar: profileData.user.avatar,
            bio: '',
            location: profileData.user.location?.city || '',
            joinDate: new Date(profileData.user.createdAt).toLocaleDateString(),
            rating: profileData.user.stats?.rating || 0,
            totalSwaps: profileData.user.stats?.totalSwaps || 0,
            itemsListed: profileData.user.stats?.itemsListed || 0,
            isOwnProfile: true
          };
        } else {
          profileObj = {
            name: profileData.user.name,
            username: profileData.user.name,
            avatar: profileData.user.avatar,
            bio: '',
            location: profileData.user.location?.city || '',
            joinDate: new Date(profileData.user.memberSince || profileData.user.createdAt).toLocaleDateString(),
            rating: profileData.user.stats?.rating || 0,
            totalSwaps: profileData.user.stats?.totalSwaps || 0,
            itemsListed: itemsData.items?.length || 0,
            isOwnProfile: false
          };
        }
        setProfile(profileObj);
        setUserItems(itemsData.items || []);
      } catch (err) {
        setError(err.message || 'Error loading profile');
        setProfile(null);
        setUserItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (user || userId) loadProfile();
  }, [userId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">{error || "The user profile you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 rounded-full"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
              <p className="text-gray-600 mb-2">@{profile.username}</p>
              <p className="text-gray-700 mb-4">{profile.bio}</p>
              <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-600">
                <span>📍 {profile.location}</span>
                <span>📅 Joined {profile.joinDate}</span>
                <div className="flex items-center">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span>{profile.rating} rating</span>
                </div>
              </div>
            </div>
            {profile.isOwnProfile && (
              <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{profile.totalSwaps}</div>
            <div className="text-sm text-gray-600">Total Swaps</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{profile.itemsListed}</div>
            <div className="text-sm text-gray-600">Items Listed</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{profile.rating}</div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
        </div>

        {/* User's Items */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {profile.isOwnProfile ? 'My Items' : `${profile.name}'s Items`}
          </h2>
          {userItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items listed yet</h3>
              <p className="text-gray-600">
                {profile.isOwnProfile 
                  ? "Start sharing your pre-loved clothing with the community!"
                  : "This user hasn't listed any items yet."}
              </p>
              {profile.isOwnProfile && (
                <button className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
                  Add Your First Item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userItems.map((item) => (
                <div key={item._id || item.id} className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <img
                    src={item.images && item.images.length > 0 ? item.images[0].url : '/default-image.png'}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                        item.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.condition}
                      </span>
                      <span className="text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 
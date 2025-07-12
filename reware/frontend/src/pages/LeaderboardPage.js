import React from 'react';

const LeaderboardPage = () => {
  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: 'Sarah M.', swaps: 25 },
    { rank: 2, name: 'Mike J.', swaps: 22 },
    { rank: 3, name: 'Emma L.', swaps: 20 },
    { rank: 4, name: 'David K.', swaps: 18 },
    { rank: 5, name: 'Lisa R.', swaps: 15 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Leaderboard</h1>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Swaps</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((user) => (
              <tr key={user.rank}>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{user.rank}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.swaps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardPage; 
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import LoadingSpinner, { FullScreenLoader } from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load components for better performance
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ItemsPage = React.lazy(() => import('./pages/ItemsPage'));
const ItemDetailPage = React.lazy(() => import('./pages/ItemDetailPage'));
const AddItemPage = React.lazy(() => import('./pages/AddItemPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SwapsPage = React.lazy(() => import('./pages/SwapsPage'));
const SwapDetailPage = React.lazy(() => import('./pages/SwapDetailPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Layout components
const Layout = React.lazy(() => import('./components/layout/Layout'));
const ProtectedRoute = React.lazy(() => import('./components/auth/ProtectedRoute'));
const AdminRoute = React.lazy(() => import('./components/auth/AdminRoute'));

function App() {
  const { user, loading, authError } = useAuth();
  const { theme } = useTheme();

  // Apply theme to document
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (loading) {
    return <FullScreenLoader text="Initializing..." />;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Error
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {authError}
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Suspense fallback={<FullScreenLoader text="Loading..." />}>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-item"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddItemPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/swaps"
            element={
              <ProtectedRoute>
                <Layout>
                  <SwapsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/swaps/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <SwapDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:userId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Admin routes */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <Layout>
                  <AdminPage />
                </Layout>
              </AdminRoute>
            }
          />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App; 
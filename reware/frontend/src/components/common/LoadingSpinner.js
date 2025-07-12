import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-2 border-gray-200 dark:border-gray-700 rounded-full animate-spin`}
          style={{
            borderTopColor: '#3B82F6',
            animation: 'spin 1s linear infinite'
          }}
        />
        <div
          className={`${sizeClasses[size]} border-2 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-0 left-0`}
          style={{
            animation: 'spin 1.5s linear infinite reverse'
          }}
        />
      </div>
      {text && (
        <p className={`mt-3 text-gray-600 dark:text-gray-400 ${textSizes[size]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Full screen loading component
export const FullScreenLoader = ({ text = 'Loading...' }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <LoadingSpinner size="xl" text={text} />
  </div>
);

// Inline loading component
export const InlineLoader = ({ size = 'sm', text = 'Loading...' }) => (
  <LoadingSpinner size={size} text={text} className="py-4" />
);

// Button loading component
export const ButtonLoader = ({ size = 'sm' }) => (
  <div className="flex items-center justify-center">
    <LoadingSpinner size={size} text="" />
  </div>
);

export default LoadingSpinner; 
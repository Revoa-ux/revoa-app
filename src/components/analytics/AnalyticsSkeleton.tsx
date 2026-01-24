import React from 'react';

export function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <div className="flex items-start sm:items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
            <span>Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[180px] bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

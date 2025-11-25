import React from 'react';

export const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="space-y-3 animate-pulse">
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      {message && (
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
      )}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="mb-6">
      <div className="h-7 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <div className="h-8 w-28 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
        <div className="h-8 w-28 bg-transparent rounded-lg ml-1"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-[180px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const InventorySkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ChatSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-[calc(100vh-7.6rem)]">
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-2/3 h-16 ${
              i % 2 === 0 
                ? 'bg-gray-200 dark:bg-gray-700 ml-auto' 
                : 'bg-gray-200 dark:bg-gray-700'
            } rounded-lg`}></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ProductsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
          <div className="p-4 space-y-4">
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CalculatorSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);
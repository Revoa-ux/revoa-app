import React from 'react';

export const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="space-y-3 animate-pulse">
      <div className="h-12 w-12 bg-gray-200 dark:bg-[#3a3a3a] rounded-full"></div>
      {message && (
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded mx-auto"></div>
      )}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="mb-6">
      <div className="h-7 w-80 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg mb-3"></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-[#4a4a4a]"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-36 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center bg-gray-100 dark:bg-[#3a3a3a] rounded-lg p-1">
        <div className="h-8 w-28 bg-gray-200 dark:bg-[#4a4a4a] rounded-lg"></div>
        <div className="h-8 w-28 bg-transparent rounded-lg ml-1"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="h-10 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
        <div className="h-10 w-36 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-[180px] p-4 rounded-xl bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-[#3a3a3a]">
              <div className="w-5 h-5 bg-gray-200 dark:bg-[#4a4a4a] rounded"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 dark:bg-[#4a4a4a] rounded"></div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-[#4a4a4a] rounded"></div>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
              <div className="h-8 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
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
    <div className="h-8 w-64 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      ))}
    </div>
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-12 w-12 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ConversationListSkeleton = () => (
  <div className="space-y-1 p-2 animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
        <div className="w-10 h-10 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-2 w-1/2 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ChatSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] h-[calc(100vh-7.6rem)]">
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-2/3 h-16 ${
              i % 2 === 0
                ? 'bg-gray-200 dark:bg-[#3a3a3a] ml-auto'
                : 'bg-gray-200 dark:bg-[#3a3a3a]'
            } rounded-lg`}></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ProductsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <div className="h-48 bg-gray-200 dark:bg-[#3a3a3a]"></div>
          <div className="p-4 space-y-4">
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CalculatorSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const QuotesSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-36 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    </div>
    <div className="flex items-center space-x-4">
      <div className="h-10 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    </div>
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
      <div className="p-4 border-b border-gray-200 dark:border-[#3a3a3a] flex space-x-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100 dark:border-[#3a3a3a] flex items-center space-x-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-6 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export const BalanceSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
          <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-3 border-b border-gray-100 dark:border-[#3a3a3a]">
            <div className="h-4 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
        <div className="h-6 w-36 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
        <div className="h-48 bg-gray-100 dark:bg-[#3a3a3a] rounded"></div>
      </div>
    </div>
  </div>
);

export const AutomationSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 w-56 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    </div>
    <div className="flex items-center space-x-4">
      <div className="h-10 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    </div>
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                <div className="h-3 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-6 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded-full"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AuditSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="flex items-center space-x-4">
      <div className="h-10 w-40 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
      <div className="h-10 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
            <div className="h-5 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
            <div className="h-3 w-3/4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AttributionSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-56 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-4">
          <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
          <div className="h-8 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      ))}
    </div>
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
      <div className="h-6 w-40 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-6"></div>
      <div className="h-64 bg-gray-100 dark:bg-[#3a3a3a] rounded"></div>
    </div>
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
      <div className="p-4 border-b border-gray-200 dark:border-[#3a3a3a] flex space-x-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100 dark:border-[#3a3a3a] flex items-center space-x-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
        </div>
      ))}
    </div>
  </div>
);
import React from 'react';

interface TableRowSkeletonProps {
  index: number;
}

const TableRowSkeleton: React.FC<TableRowSkeletonProps> = () => (
  <tr className="border-b border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark">
    <td className="px-4 py-4" style={{ width: '250px' }}>
      <div className="flex items-center space-x-3 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#3a3a3a]"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-32"></div>
          <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded w-20"></div>
        </div>
      </div>
    </td>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-4" style={{ width: i === 6 ? '110px' : '100px' }}>
        <div 
          className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse" 
          style={{ animationDelay: `${i * 0.1}s` }}
        ></div>
      </td>
    ))}
  </tr>
);

export default TableRowSkeleton;
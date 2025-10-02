import React from 'react';

interface PerformanceMetrics {
  [key: string]: unknown;
}

interface PerformanceOverviewProps {
  metrics: PerformanceMetrics;
}

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">-</div>
          <div className="text-sm text-gray-600">Page Load Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">-</div>
          <div className="text-sm text-gray-600">Requests</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">-</div>
          <div className="text-sm text-gray-600">Response Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">-</div>
          <div className="text-sm text-gray-600">Uptime</div>
        </div>
      </div>
    </div>
  );
};

export { PerformanceOverview };
export default PerformanceOverview;

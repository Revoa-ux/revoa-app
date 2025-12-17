interface FlowProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

export function FlowProgressIndicator({
  current,
  total,
  percentage,
}: FlowProgressIndicatorProps) {
  return (
    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span>Progress</span>
        <span>{current} of {total}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
